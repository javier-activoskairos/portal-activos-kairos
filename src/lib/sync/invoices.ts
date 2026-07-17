/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  notionClient,
  plainText,
  statusName,
  dateStart,
  formulaValue,
  normalizeId,
} from "@/lib/notion";
import { createAdminClient } from "@/lib/supabase/admin";

// [AKF] - Facturas (database_id)
const FACTURAS_DB = "17d0114d-3502-81a3-b72b-ea8a19db39af";

const STATUS_MAP: Record<string, string> = {
  Aceptada: "pagada",
  Enviada: "enviada",
  Gestionar: "pendiente",
  Rechazada: "rechazada",
};

async function queryAll(notion: any, database_id: string, filter: any) {
  const out: any[] = [];
  let cursor: string | undefined;
  do {
    const res: any = await notion.databases.query({
      database_id,
      filter,
      start_cursor: cursor,
      page_size: 100,
    });
    out.push(...res.results);
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  return out;
}

/**
 * Resuelve el nombre (título) de cada Producto por su id de página, cacheado.
 * En [AKF] - Facturas no hay descripción propia: el concepto legible para el
 * cliente es el nombre del Producto facturado (p.ej. "Tempo Pro v2").
 */
async function resolveProductNames(
  notion: any,
  ids: string[],
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  for (const id of [...new Set(ids)]) {
    try {
      const page: any = await notion.pages.retrieve({ page_id: id });
      const props = page.properties ?? {};
      const titleProp = Object.values(props).find(
        (v: any) => v?.type === "title",
      );
      const name = plainText(titleProp);
      if (name) map.set(id, name);
    } catch (e) {
      console.error(`[sync:invoices] producto ${id}`, e);
    }
  }
  return map;
}

/** Redondea a 2 decimales y devuelve string plano ("1159.55"). */
function money(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "0";
  return (Math.round(n * 100) / 100).toFixed(2);
}

/**
 * Sincroniza las facturas EMITIDAS de [AKF] - Facturas hacia public.invoices,
 * agrupadas por "Empresa Externa" — solo para empresas que están en el portal.
 * NO sincroniza Activos Kairos (AK_COMPANY_NOTION_ID). El PDF ("Factura") se
 * re-hospeda en Supabase Storage porque la URL de Notion caduca.
 */
export async function syncInvoices() {
  const admin = createAdminClient();
  const notion = notionClient();
  const akNotion = normalizeId(process.env.AK_COMPANY_NOTION_ID ?? "");

  // Empresas del portal: notion_id normalizado → id interno.
  const { data: companies, error: cErr } = await admin
    .from("companies")
    .select("id, notion_id");
  if (cErr) throw cErr;
  const byNotion = new Map<string, string>();
  for (const c of companies ?? []) {
    const norm = normalizeId(c.notion_id);
    if (norm) byNotion.set(norm, c.id);
  }

  // Facturas emitidas (enviadas o aceptadas).
  const rows = await queryAll(notion, FACTURAS_DB, {
    and: [
      { property: "Tipo", select: { equals: "Emitida" } },
      {
        or: [
          { property: "Estado", status: { equals: "Enviada" } },
          { property: "Estado", status: { equals: "Aceptada" } },
        ],
      },
    ],
  });

  // Nombres de Producto (concepto legible) para las facturas del portal.
  const productIds = rows
    .map((r) => r.properties?.["Producto"]?.relation?.[0]?.id as string | undefined)
    .filter((id): id is string => !!id);
  const productNames = await resolveProductNames(notion, productIds);

  // Agrupa por empresa (interna). Excluye AK y empresas fuera del portal.
  const byCompany = new Map<string, any[]>();
  for (const page of rows) {
    const p = page.properties;
    const empId = p["Empresa Externa"]?.relation?.[0]?.id as string | undefined;
    if (!empId) continue;
    const norm = normalizeId(empId);
    if (!norm || norm === akNotion) continue;
    const companyId = byNotion.get(norm);
    if (!companyId) continue;

    // En Notion el código de factura vive en "Concepto" (no hay "Nº Factura").
    const codigo = plainText(p["Concepto"]);
    const productId = p["Producto"]?.relation?.[0]?.id as string | undefined;
    const concepto = (productId && productNames.get(productId)) || "Suscripción";
    const pdfUrl = await rehostPdf(admin, page);
    const inv = {
      notion_id: page.id as string,
      company_id: companyId,
      number: codigo,
      concept: concepto,
      amount: money(p["Cantidad"]?.number),
      currency: formulaValue(p["Divisa Símbolo"]) ?? "€",
      status: STATUS_MAP[statusName(p["Estado"]) ?? ""] ?? "pendiente",
      issued_at: dateStart(p["Emisión"]),
      pdf_url: pdfUrl,
    };
    const arr = byCompany.get(companyId) ?? [];
    arr.push(inv);
    byCompany.set(companyId, arr);
  }

  let upserted = 0;
  for (const [companyId, invoices] of byCompany) {
    const { error } = await admin
      .from("invoices")
      .upsert(invoices, { onConflict: "notion_id" });
    if (error) throw error;
    upserted += invoices.length;

    // Reconciliación por empresa: borra las sincronizadas que ya no están.
    const keep = invoices.map((i) => i.notion_id);
    let del = admin
      .from("invoices")
      .delete()
      .eq("company_id", companyId)
      .not("notion_id", "is", null);
    if (keep.length > 0) del = del.not("notion_id", "in", `(${keep.join(",")})`);
    const { error: delErr } = await del;
    if (delErr) throw delErr;
  }

  return { status: "success" as const, companies: byCompany.size, upserted };
}

async function rehostPdf(admin: any, page: any): Promise<string | null> {
  const f = page.properties?.["Factura"]?.files?.[0];
  const url: string | undefined = f?.file?.url ?? f?.external?.url;
  if (!url) return null;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const path = `${page.id}.pdf`;
    const up = await admin.storage
      .from("invoice-pdfs")
      .upload(path, buf, { contentType: "application/pdf", upsert: true });
    if (up.error) throw up.error;
    const { data: pub } = admin.storage.from("invoice-pdfs").getPublicUrl(path);
    const v = Date.parse(page.last_edited_time) || 0;
    return `${pub.publicUrl}?v=${v}`;
  } catch (e) {
    console.error(`[sync:invoices] pdf ${page.id}`, e);
    return null;
  }
}
