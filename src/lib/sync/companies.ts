/* eslint-disable @typescript-eslint/no-explicit-any */
import { notionClient } from "@/lib/notion";
import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "company-logos";

/**
 * Descarga el logo de cada empresa desde [AK] - Empresas (propiedad "Logo",
 * archivo con URL firmada que expira) y lo re-hospeda en Supabase Storage.
 * Guarda la URL pública (con cache-bust por `last_edited_time`) en
 * companies.logo_url para poder mostrarlo en el portal.
 */
export async function syncCompanyLogos() {
  const admin = createAdminClient();
  const notion = notionClient();

  const { data: companies, error } = await admin
    .from("companies")
    .select("id, notion_id, name")
    .eq("active", true);
  if (error) throw error;

  let updated = 0;
  let cleared = 0;
  const total = companies?.length ?? 0;

  for (const c of companies ?? []) {
    try {
      const page: any = await notion.pages.retrieve({ page_id: c.notion_id });
      const files = page.properties?.["Logo"]?.files ?? [];
      const f = files[0];
      const url: string | undefined = f?.file?.url ?? f?.external?.url;

      if (!url) {
        // Sin logo en Notion → dejar el existente sin tocar.
        continue;
      }

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
      const logoUrl = `${pub.publicUrl}?v=${version}`;

      const upd = await admin
        .from("companies")
        .update({ logo_url: logoUrl })
        .eq("id", c.id);
      if (upd.error) throw upd.error;
      updated++;
    } catch (e) {
      console.error(`[sync:logos] ${c.name} (${c.notion_id})`, e);
    }
  }

  return { status: "success" as const, total, updated, cleared };
}
