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
  await admin
    .from("sync_state")
    .upsert(
      { source, locked_until: lockUntil },
      { onConflict: "source", ignoreDuplicates: false },
    );

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
      .update({ last_success_at: finishedIso, locked_until: null })
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
