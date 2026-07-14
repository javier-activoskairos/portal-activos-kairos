/* eslint-disable @typescript-eslint/no-explicit-any */
import { notionClient, selectName, dateStart } from "@/lib/notion";
import { getActiveCompanies } from "@/lib/sync/run";
import { createAdminClient } from "@/lib/supabase/admin";

const SEGUIMIENTOS_DB = "1d60114d-3502-8072-8c92-d63fad653270";
// Tipos de acompañamiento que cuentan como "horas juntos".
const ACOMP_TYPES = ["Astrapi", "Areté", "Prótos"];

/**
 * Sincroniza los seguimientos de acompañamiento (Astrapi / Areté / Prótos) de
 * cada empresa activa hacia public.meetings, para el gráfico "Horas de
 * acompañamiento por mes" del Inicio. Reconcilia por empresa.
 */
export async function syncMeetings() {
  const admin = createAdminClient();
  const notion = notionClient();
  const companies = await getActiveCompanies(admin);

  let upserted = 0;

  for (const company of companies) {
    const companyId = company.id;
    const rows: any[] = [];
    let cursor: string | undefined;
    do {
      const res: any = await notion.databases.query({
        database_id: SEGUIMIENTOS_DB,
        filter: {
          and: [
            { property: "Empresa", relation: { contains: company.notion_id } },
            {
              or: ACOMP_TYPES.map((t) => ({
                property: "Tipo",
                select: { equals: t },
              })),
            },
          ],
        },
        start_cursor: cursor,
        page_size: 100,
      });
      rows.push(...res.results);
      cursor = res.has_more ? res.next_cursor : undefined;
    } while (cursor);

    const mapped = rows.map((page: any) => {
      const p = page.properties;
      return {
        notion_id: page.id as string,
        company_id: companyId,
        type: selectName(p["Tipo"]) ?? "",
        duration_min: p["Duración"]?.number ?? null,
        meeting_date: dateStart(p["Fecha"]),
        last_edited_at: page.last_edited_time,
      };
    });

    if (mapped.length > 0) {
      const { error } = await admin
        .from("meetings")
        .upsert(mapped, { onConflict: "notion_id" });
      if (error) throw error;
      upserted += mapped.length;
    }

    // Reconciliación por empresa: elimina los que ya no están.
    const keep = mapped.map((m) => m.notion_id);
    let del = admin.from("meetings").delete().eq("company_id", companyId);
    if (keep.length > 0) del = del.not("notion_id", "in", `(${keep.join(",")})`);
    const { error: delErr } = await del;
    if (delErr) throw delErr;
  }

  return { status: "success" as const, upserted };
}
