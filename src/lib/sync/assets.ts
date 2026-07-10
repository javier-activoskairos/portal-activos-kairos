/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  notionClient,
  plainText,
  statusName,
  urlValue,
  dateStart,
  formulaValue,
} from "@/lib/notion";
import { runSync, resolveCompanyId, type SyncMode } from "@/lib/sync/run";
import { createAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;

// Solo estos estados son visibles para el cliente en el portal.
const VISIBLE = new Set(["En Progreso", "Terminado"]);

function mapAsset(page: any, companyId: string) {
  const p = page.properties;
  return {
    notion_id: page.id,
    company_id: companyId,
    name: plainText(p["Nombre"]) ?? "(sin nombre)",
    status: statusName(p["Estado"]) ?? "",
    desired_result: plainText(p["Resultado Deseado"]),
    progress: formulaValue(p["Progreso"]),
    planned_at: dateStart(p["Planificado"]),
    due_at: dateStart(p["Plazo"]),
    started_at: dateStart(p["Inicio"]),
    ended_at: dateStart(p["Fin"]),
    asset_url: urlValue(p["URL"]), // ← propiedad "URL" de Notion (decisión de Javier)
    notion_url: page.url,
    last_edited_at: page.last_edited_time,
  };
}

async function fetchAndUpsert(admin: Admin) {
  const notion = notionClient();
  const dbId = process.env.NOTION_ASSETS_DB!;
  const companyNotionId = process.env.AK_COMPANY_NOTION_ID!;
  const companyId = await resolveCompanyId(admin);

  // Reconciliación completa cada noche → escaneo total de la empresa.
  const filter: any = {
    property: "Empresa",
    relation: { contains: companyNotionId },
  };

  let cursor: string | undefined = undefined;
  let rowsRead = 0;
  let rowsUpserted = 0;
  const visibleIds: string[] = [];

  do {
    const res: any = await notion.databases.query({
      database_id: dbId,
      filter,
      start_cursor: cursor,
      page_size: 100,
    });
    rowsRead += res.results.length;

    const visible = res.results
      .map((pg: any) => mapAsset(pg, companyId))
      .filter((a: any) => VISIBLE.has(a.status));

    if (visible.length > 0) {
      const { error } = await admin
        .from("assets")
        .upsert(visible, { onConflict: "notion_id" });
      if (error) throw new Error(`Upsert assets: ${error.message}`);
      rowsUpserted += visible.length;
      visibleIds.push(...visible.map((a: any) => a.notion_id));
    }
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);

  // Reconciliación: elimina de la réplica los activos de la empresa que ya
  // no son visibles (cambiaron de estado o se borraron en Notion).
  const { data: existing, error: selErr } = await admin
    .from("assets")
    .select("notion_id")
    .eq("company_id", companyId);
  if (selErr) throw new Error(`Select assets: ${selErr.message}`);

  const stale = (existing ?? [])
    .map((r: { notion_id: string }) => r.notion_id)
    .filter((id: string) => !visibleIds.includes(id));

  if (stale.length > 0) {
    const { error: delErr } = await admin
      .from("assets")
      .delete()
      .in("notion_id", stale);
    if (delErr) throw new Error(`Delete stale assets: ${delErr.message}`);
  }

  return { rowsRead, rowsUpserted };
}

export function syncAssets(mode: SyncMode = "cron") {
  return runSync("assets", mode, fetchAndUpsert);
}
