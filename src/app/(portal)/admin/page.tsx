import { redirect } from "next/navigation";
import { getPortalSession } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { SyncPanel } from "./sync-panel";

export const metadata = { title: "Sincronización · Portal Activos Kairos" };
export const dynamic = "force-dynamic";

interface RunRow {
  id: string;
  source: string;
  mode: string;
  status: string;
  started_at: string;
  finished_at: string | null;
  rows_read: number | null;
  rows_upserted: number | null;
  error_summary: string | null;
}

function fmtTime(v: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  return d.toLocaleString("es-ES", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AdminPage() {
  const session = await getPortalSession();
  if (!session || session.role !== "admin") redirect("/inicio");

  // service_role: lectura interna del historial de sync (bypass RLS).
  const admin = createAdminClient();
  const [{ data: runsData }, { data: stateData }] = await Promise.all([
    admin
      .from("sync_runs")
      .select(
        "id, source, mode, status, started_at, finished_at, rows_read, rows_upserted, error_summary",
      )
      .order("started_at", { ascending: false })
      .limit(20),
    admin.from("sync_state").select("source, last_success_at"),
  ]);

  const runs = (runsData ?? []) as RunRow[];
  const state = stateData ?? [];
  const lastBySource = Object.fromEntries(
    state.map((s: { source: string; last_success_at: string | null }) => [
      s.source,
      s.last_success_at,
    ]),
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Panel de sincronización</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Estado de la réplica desde Notion. Panel interno (solo equipo).
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-sm font-semibold">Incidencias</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Última sync correcta: {fmtTime(lastBySource["incidents"] ?? null)}
          </p>
          <p className="text-xs text-muted-foreground">Automático cada 10 min.</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-sm font-semibold">Activos</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Última sync correcta: {fmtTime(lastBySource["assets"] ?? null)}
          </p>
          <p className="text-xs text-muted-foreground">
            Reconciliación nocturna (03:00).
          </p>
        </div>
      </div>

      <SyncPanel />

      <section className="rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold">Historial reciente</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr className="border-b border-border">
                <th className="px-5 py-2 font-medium">Fuente</th>
                <th className="px-5 py-2 font-medium">Modo</th>
                <th className="px-5 py-2 font-medium">Estado</th>
                <th className="px-5 py-2 font-medium">Leídos</th>
                <th className="px-5 py-2 font-medium">Escritos</th>
                <th className="px-5 py-2 font-medium">Cuándo</th>
              </tr>
            </thead>
            <tbody>
              {runs.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-8 text-center text-muted-foreground"
                  >
                    Sin ejecuciones registradas todavía.
                  </td>
                </tr>
              ) : (
                runs.map((r) => (
                  <tr key={r.id} className="border-b border-border last:border-0">
                    <td className="px-5 py-2">{r.source}</td>
                    <td className="px-5 py-2 text-muted-foreground">{r.mode}</td>
                    <td className="px-5 py-2">
                      <span
                        className={
                          r.status === "error"
                            ? "text-danger-foreground"
                            : r.status === "success"
                              ? "text-success-foreground"
                              : "text-muted-foreground"
                        }
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-5 py-2 tabular-nums">{r.rows_read ?? "—"}</td>
                    <td className="px-5 py-2 tabular-nums">
                      {r.rows_upserted ?? "—"}
                    </td>
                    <td className="px-5 py-2 text-muted-foreground">
                      {fmtTime(r.started_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
