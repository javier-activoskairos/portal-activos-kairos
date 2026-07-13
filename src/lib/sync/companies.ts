/* eslint-disable @typescript-eslint/no-explicit-any */
import { notionClient } from "@/lib/notion";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "company-logos";

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

      const patch: Record<string, string | null> = {
        plan: derivePlan(props),
        sector: props?.["Sector"]?.select?.name ?? null,
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
