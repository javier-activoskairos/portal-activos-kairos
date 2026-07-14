/* eslint-disable @typescript-eslint/no-explicit-any */
import { notionClient } from "@/lib/notion";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "company-logos";
const CONTACTOS_DB = "912d0b8e-1c39-4071-8d15-dcb40a4f394b";

/**
 * Resuelve y guarda el Notion ID del Contacto de cada usuario del portal
 * (match por email en [AK] - Contactos). Se usa para "Creado por" en las
 * incidencias. Solo rellena los que aún no lo tienen.
 */
export async function syncPortalUserContacts() {
  const admin = createAdminClient();
  const notion = notionClient();

  const { data: users, error } = await admin
    .from("portal_users")
    .select("id, email")
    .eq("active", true)
    .is("contact_notion_id", null);
  if (error) throw error;

  let matched = 0;
  for (const u of users ?? []) {
    if (!u.email) continue;
    try {
      const res: any = await notion.databases.query({
        database_id: CONTACTOS_DB,
        filter: { property: "Email", email: { equals: u.email } },
        page_size: 1,
      });
      const contactId = res.results?.[0]?.id;
      if (!contactId) continue;
      const upd = await admin
        .from("portal_users")
        .update({ contact_notion_id: contactId })
        .eq("id", u.id);
      if (upd.error) throw upd.error;
      matched++;
    } catch (e) {
      console.error(`[sync:contacts] ${u.email}`, e);
    }
  }
  return { status: "success" as const, total: users?.length ?? 0, matched };
}

const EMPRESAS_DB = "0b692bd1-743e-4ccd-af88-746ef6c80570";

function slugify(s: string) {
  return (
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "empresa"
  );
}

/**
 * Crea en la réplica las filas de empresa de TODAS las empresas con
 * Estado = "Cliente" en Notion que aún no existan (idempotente). No degrada
 * ni desactiva nada: solo inserta las que faltan. Devuelve cuántas creó.
 */
export async function seedClientCompanies() {
  const admin = createAdminClient();
  const notion = notionClient();

  const results: any[] = [];
  let cursor: string | undefined;
  do {
    const res: any = await notion.databases.query({
      database_id: EMPRESAS_DB,
      filter: { property: "Estado", status: { equals: "Cliente" } },
      start_cursor: cursor,
      page_size: 100,
    });
    results.push(...res.results);
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);

  // Empresas ya presentes en la réplica.
  const { data: existing, error: exErr } = await admin
    .from("companies")
    .select("notion_id");
  if (exErr) throw exErr;
  const have = new Set((existing ?? []).map((c) => c.notion_id));

  let created = 0;
  for (const page of results) {
    if (have.has(page.id)) continue;
    const name =
      (page.properties?.["Nombre"]?.title ?? [])
        .map((t: any) => t.plain_text)
        .join("")
        .trim() || "Empresa";
    const ins = await admin.from("companies").insert({
      notion_id: page.id,
      name,
      estado: "Cliente",
      is_client: true,
      active: true,
      slug: `${slugify(name)}-${page.id.replace(/-/g, "").slice(0, 6)}`,
    });
    if (ins.error) {
      console.error(`[seed:companies] ${name}`, ins.error.message);
      continue;
    }
    created++;
  }
  return { status: "success" as const, clients: results.length, created };
}

/** Deriva el plan de la empresa: "Membresía Texto" o "Tempo" si Es Tempo?. */
function derivePlan(props: any): string | null {
  const texto = props?.["Membresía Texto"]?.formula?.string;
  if (texto && texto.trim()) return texto.trim();
  if (props?.["Es Tempo?"]?.formula?.boolean === true) return "Tempo";
  return null;
}

/**
 * Sincroniza datos de empresa desde [AK] - Empresas hacia companies:
 * - Logo (propiedad "Logo", archivo con URL firmada que expira) → se descarga
 *   y re-hospeda en Supabase Storage; companies.logo_url = URL pública.
 * - Plan (Membresía Texto / Es Tempo?) → companies.plan.
 * - Sector (propiedad Sector) → companies.sector.
 */
export async function syncCompanies() {
  const admin = createAdminClient();
  const notion = notionClient();

  const { data: companies, error } = await admin
    .from("companies")
    .select("id, notion_id, name")
    .eq("active", true);
  if (error) throw error;

  let updated = 0;
  const total = companies?.length ?? 0;

  for (const c of companies ?? []) {
    try {
      const page: any = await notion.pages.retrieve({ page_id: c.notion_id });
      const props = page.properties ?? {};

      const estado = props?.["Estado"]?.status?.name ?? null;
      const esTempo = props?.["Es Tempo?"]?.formula?.boolean === true;
      const tieneMembresia = (props?.["Membresía"]?.relation?.length ?? 0) > 0;

      // Racha de semanas (Tempo/Stasis): semanas desde el alta de la empresa.
      const createdMs = Date.parse(page.created_time || "");
      const streakWeeks = Number.isNaN(createdMs)
        ? 0
        : Math.max(
            0,
            Math.floor((Date.now() - createdMs) / (7 * 24 * 3600 * 1000)),
          );

      const patch: Record<string, string | boolean | number | null> = {
        plan: derivePlan(props),
        sector: props?.["Sector"]?.select?.name ?? null,
        estado,
        // Es o ha sido cliente: Estado Cliente, o con membresía, o Es Tempo.
        is_client: estado === "Cliente" || esTempo || tieneMembresia,
        plan_streak_weeks: streakWeeks,
      };

      // Logo (opcional): descargar y re-hospedar si existe.
      const files = props?.["Logo"]?.files ?? [];
      const f = files[0];
      const url: string | undefined = f?.file?.url ?? f?.external?.url;
      if (url) {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`descarga logo ${res.status}`);
        const buf = Buffer.from(await res.arrayBuffer());
        const contentType = res.headers.get("content-type") || "image/png";
        const ext = contentType.includes("svg")
          ? "svg"
          : contentType.includes("jpeg") || contentType.includes("jpg")
            ? "jpg"
            : contentType.includes("webp")
              ? "webp"
              : "png";
        const path = `${c.notion_id}.${ext}`;
        const up = await admin.storage
          .from(BUCKET)
          .upload(path, buf, { contentType, upsert: true });
        if (up.error) throw up.error;
        const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path);
        const version = Date.parse(page.last_edited_time) || 0;
        patch.logo_url = `${pub.publicUrl}?v=${version}`;
      }

      const upd = await admin.from("companies").update(patch).eq("id", c.id);
      if (upd.error) throw upd.error;
      updated++;
    } catch (e) {
      console.error(`[sync:companies] ${c.name} (${c.notion_id})`, e);
    }
  }

  return { status: "success" as const, total, updated };
}
