import { createAdminClient } from "@/lib/supabase/admin";

export type SyncSource = "incidents" | "assets";
export type SyncMode = "cron" | "manual";

export interface SyncResult {
  source: SyncSource;
  status: "success" | "error" | "skipped";
  rowsRead: number;
  rowsUpserted: number;
  error?: string;
  since?: string | null;
}

type Admin = ReturnType<typeof createAdminClient>;

/**
 * Envuelve una sincronización con auditoría (sync_runs) y lock (sync_state)
 * para evitar solapes entre ejecuciones del cron cada 10 min.
 *
 * fn recibe (admin, since) y devuelve { rowsRead, rowsUpserted }.
 * `since` es el last_success_at previo (para sync incremental).
 */
export async function runSync(
  source: SyncSource,
  mode: SyncMode,
  fn: (
    admin: Admin,
    since: string | null,
  ) => Promise<{ rowsRead: number; rowsUpserted: number }>,
): Promise<SyncResult> {
  const admin = createAdminClient();
  const nowIso = new Date().toISOString();

  // Lock: si otra ejecución está en curso, saltar.
  const { data: state } = await admin
    .from("sync_state")
    .select("last_success_at, locked_until")
    .eq("source", source)
    .maybeSingle();

  if (state?.locked_until && state.locked_until > nowIso) {
    return {
      source,
      status: "skipped",
      rowsRead: 0,
      rowsUpserted: 0,
      error: "locked",
    };
  }

  const lockUntil = new Date(Date.now() + 9 * 60 * 1000).toISOString();

  if (state) {
    // Adquisición condicional: la comprobación de arriba es read-then-write y
    // hay dos relojes disparando syncs (cron de Render y GitHub Actions vía
    // n8n). Este UPDATE solo toca la fila si el lock sigue libre, así que de
    // dos ejecuciones simultáneas exactamente una recibe fila y continúa.
    const { data: acquired } = await admin
      .from("sync_state")
      .update({ locked_until: lockUntil })
      .eq("source", source)
      .or(`locked_until.is.null,locked_until.lt.${nowIso}`)
      .select("source");
    if (!acquired || acquired.length === 0) {
      return {
        source,
        status: "skipped",
        rowsRead: 0,
        rowsUpserted: 0,
        error: "locked",
      };
    }
  } else {
    await admin.from("sync_state").insert({ source, locked_until: lockUntil });
  }

  // Un job matado por timeout (el de GitHub corta a los 8 min) deja su fila en
  // "running" para siempre y el panel de admin, que solo mira "error", seguiría
  // diciendo "Todo sincronizado". Se cierran como error los runs colgados.
  const stuckBefore = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  await admin
    .from("sync_runs")
    .update({
      status: "error",
      finished_at: nowIso,
      error_summary: "Ejecución interrumpida (sin finalizar)",
    })
    .eq("source", source)
    .eq("status", "running")
    .lt("started_at", stuckBefore);

  // Marca de la que partirá el PRÓXIMO run incremental. Se toma ANTES de
  // ejecutar fn, no después: el filtro `last_edited_time >= since` se aplica al
  // principio, así que si sellásemos la hora de finalización todo lo editado en
  // Notion mientras la sync corría quedaría por debajo del corte y no volvería
  // a entrar nunca. El margen de solape cubre además el desfase de reloj entre
  // Notion y nosotros; reprocesar unas filas es idempotente (upsert).
  const OVERLAP_MS = 2 * 60 * 1000;
  const watermarkIso = new Date(Date.now() - OVERLAP_MS).toISOString();

  const { data: runRow } = await admin
    .from("sync_runs")
    .insert({ source, mode, status: "running" })
    .select("id")
    .single();
  const runId = runRow?.id;

  const since = state?.last_success_at ?? null;

  try {
    const { rowsRead, rowsUpserted } = await fn(admin, since);
    const finishedIso = new Date().toISOString();

    if (runId) {
      await admin
        .from("sync_runs")
        .update({
          status: "success",
          finished_at: finishedIso,
          rows_read: rowsRead,
          rows_upserted: rowsUpserted,
        })
        .eq("id", runId);
    }
    await admin
      .from("sync_state")
      .update({ last_success_at: watermarkIso, locked_until: null })
      .eq("source", source);

    return { source, status: "success", rowsRead, rowsUpserted, since };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (runId) {
      await admin
        .from("sync_runs")
        .update({
          status: "error",
          finished_at: new Date().toISOString(),
          error_summary: message.slice(0, 500),
        })
        .eq("id", runId);
    }
    await admin
      .from("sync_state")
      .update({ locked_until: null })
      .eq("source", source);

    return {
      source,
      status: "error",
      rowsRead: 0,
      rowsUpserted: 0,
      error: message,
    };
  }
}

/** Resuelve el uuid interno de la empresa Activos Kairos por su notion_id. */
export async function resolveCompanyId(admin: Admin): Promise<string> {
  const notionId = process.env.AK_COMPANY_NOTION_ID;
  if (!notionId) throw new Error("Falta AK_COMPANY_NOTION_ID");
  const { data, error } = await admin
    .from("companies")
    .select("id")
    .eq("notion_id", notionId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw new Error(`Empresa no encontrada para notion_id ${notionId}`);
  return data.id;
}

export interface CompanyRef {
  id: string;
  notion_id: string;
}

/**
 * Todas las empresas activas de la réplica (multi-empresa). Los syncs iteran
 * sobre estas para traer los datos de cada cliente desde Notion.
 */
export async function getActiveCompanies(admin: Admin): Promise<CompanyRef[]> {
  const { data, error } = await admin
    .from("companies")
    .select("id, notion_id")
    .eq("active", true);
  if (error) throw error;
  return (data ?? []).filter(
    (c): c is CompanyRef => Boolean(c.notion_id),
  );
}
