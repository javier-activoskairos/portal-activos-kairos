/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  notionClient,
  plainText,
  statusName,
  urlValue,
  dateStart,
  formulaValue,
} from "@/lib/notion";
import { runSync, getActiveCompanies, type SyncMode } from "@/lib/sync/run";
import { createAdminClient } from "@/lib/supabase/admin";

type Admin = ReturnType<typeof createAdminClient>;

// Estados de Activo visibles para el cliente: Propuesto (Bandeja / Por Empezar),
// En Progreso y Terminado.
const VISIBLE = new Set(["Por Empezar", "En Progreso", "Terminado"]);

// "Bandeja" (bandeja de propuestas) se muestra como Propuesto = "Por Empezar".
function normalizeStatus(status: string | null): string {
  return status === "Bandeja" ? "Por Empezar" : (status ?? "");
}

// [AKC] - Tareas (database_id). Cada tarea enlaza a un Activo Kairos.
const TAREAS_DB = "2740114d-3502-8012-8e9f-e810ed1020a8";

type Task = { name: string; state: "todo" | "doing" | "done" };

function taskState(estado: string | null): Task["state"] {
  if (estado === "Terminado") return "done";
  if (estado === "En Progreso" || estado === "En Espera") return "doing";
  return "todo"; // Por Hacer (Desechado se descarta antes)
}

function mapAsset(page: any, companyId: string) {
  const p = page.properties;
  return {
    notion_id: page.id as string,
    company_id: companyId,
    name: plainText(p["Nombre"]) ?? "(sin nombre)",
    status: normalizeStatus(statusName(p["Estado"])),
    desired_result: plainText(p["Resultado Deseado"]),
    progress: formulaValue(p["Progreso"]),
    priority: p["Prioridad"]?.select?.name ?? null,
    planned_at: dateStart(p["Planificado"]),
    due_at: dateStart(p["Plazo"]),
    started_at: dateStart(p["Inicio"]),
    ended_at: dateStart(p["Fin"]),
    asset_url: urlValue(p["URL"]), // ← propiedad "URL" de Notion (decisión de Javier)
    notion_url: page.url,
    last_edited_at: page.last_edited_time,
    synced_at: new Date().toISOString(),
    tasks: [] as Task[], // se rellena con fetchTasksByAsset
  };
}

// Trae todas las tareas de la empresa y las agrupa por Activo Kairos.
async function fetchTasksByAsset(
  notion: ReturnType<typeof notionClient>,
  companyNotionId: string,
): Promise<Map<string, Task[]>> {
  const byAsset = new Map<string, Task[]>();
  let cursor: string | undefined = undefined;
  do {
    const res: any = await notion.databases.query({
      database_id: TAREAS_DB,
      filter: { property: "Empresa", relation: { contains: companyNotionId } },
      start_cursor: cursor,
      page_size: 100,
    });
    for (const t of res.results) {
      const estado = statusName(t.properties["Estado"]);
      if (estado === "Desechado") continue;
      const assetId: string | undefined =
        t.properties["Activo Kairos"]?.relation?.[0]?.id;
      if (!assetId) continue;
      const name = plainText(t.properties["Nombre"]) ?? "";
      const arr = byAsset.get(assetId) ?? [];
      arr.push({ name, state: taskState(estado) });
      byAsset.set(assetId, arr);
    }
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  return byAsset;
}

/**
 * Sincroniza SOLO las tareas ([AKC] - Tareas) de los activos ya replicados,
 * sin volver a leer los activos. Se ven en el detalle de cada Activo Kairos.
 */
export async function syncAssetTasks() {
  const admin = createAdminClient();
  const notion = notionClient();
  const companies = await getActiveCompanies(admin);

  let assetsTouched = 0;
  let tasksTotal = 0;

  for (const company of companies) {
    let tasksByAsset = new Map<string, Task[]>();
    try {
      tasksByAsset = await fetchTasksByAsset(notion, company.notion_id);
    } catch (e) {
      console.error(
        `[sync:tasks] tareas no disponibles (${company.notion_id}): ${(e as Error).message}`,
      );
      continue;
    }

    const { data: rows, error } = await admin
      .from("assets")
      .select("id, notion_id")
      .eq("company_id", company.id);
    if (error) throw error;

    for (const a of rows ?? []) {
      const tasks = tasksByAsset.get(a.notion_id) ?? [];
      const up = await admin.from("assets").update({ tasks }).eq("id", a.id);
      if (up.error) {
        console.error(`[sync:tasks] ${a.notion_id}`, up.error.message);
        continue;
      }
      assetsTouched++;
      tasksTotal += tasks.length;
    }
  }
  return { status: "success" as const, assets: assetsTouched, tasks: tasksTotal };
}

async function fetchAndUpsert(admin: Admin) {
  const notion = notionClient();
  const dbId = process.env.NOTION_ASSETS_DB!;
  const companies = await getActiveCompanies(admin);

  let rowsRead = 0;
  let rowsUpserted = 0;

  // Multi-empresa: recorre todas las empresas activas de la réplica.
  for (const company of companies) {
    const companyId = company.id;
    const companyNotionId = company.notion_id;

    // Tareas por activo (best-effort; si la integración no ve Tareas, quedan []).
    let tasksByAsset = new Map<string, Task[]>();
    try {
      tasksByAsset = await fetchTasksByAsset(notion, companyNotionId);
    } catch (e) {
      console.error(`Tareas no disponibles (${companyNotionId}): ${(e as Error).message}`);
    }

    // Reconciliación completa cada noche → escaneo total de la empresa.
    const filter: any = {
      property: "Empresa",
      relation: { contains: companyNotionId },
    };

    let cursor: string | undefined = undefined;
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
        .filter((a: any) => VISIBLE.has(a.status))
        .map((a: any) => ({ ...a, tasks: tasksByAsset.get(a.notion_id) ?? [] }));

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
  }

  return { rowsRead, rowsUpserted };
}

export function syncAssets(mode: SyncMode = "cron") {
  return runSync("assets", mode, fetchAndUpsert);
}
