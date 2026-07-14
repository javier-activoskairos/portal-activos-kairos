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

    const amount = p["Cantidad"]?.number;
    const pdfUrl = await rehostPdf(admin, page);
    const inv = {
      notion_id: page.id as string,
      company_id: companyId,
      number: plainText(p["Nº Factura"]) ?? null,
      concept: plainText(p["Concepto"]) ?? "(sin concepto)",
      amount: amount != null ? String(amount) : "0",
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
