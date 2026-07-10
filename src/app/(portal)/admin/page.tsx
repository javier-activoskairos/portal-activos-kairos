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

const SOURCE_LABEL: Record<string, string> = {
  incidents: "Incidencias",
  assets: "Activos",
};

const MODE_LABEL: Record<string, string> = {
  scheduled: "Programado",
  manual: "Manual",
};

const STATUS_LABEL: Record<string, string> = {
  success: "Correcto",
  error: "Error",
  running: "En curso",
};

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
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-brand-accent text-xs font-semibold tracking-wide uppercase">
            Operación
          </p>
          <h1 className="mt-1 text-3xl font-extrabold tracking-tight">
            Panel de sincronización
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Estado de la réplica desde Notion.
          </p>
        </div>
        <span className="border-border bg-muted text-muted-foreground rounded-full border px-3 py-1 text-xs font-medium">
          Interno
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="border-border bg-card rounded-[20px] border p-5 shadow-[var(--shadow-sm)]">
          <h2 className="text-sm font-semibold">Incidencias</h2>
          <p className="text-muted-foreground mt-1 text-xs">
            Fuente: Incidencias · Modo: Programado · Última sync:{" "}
            <span className="font-mono">
              {fmtTime(lastBySource["incidents"] ?? null)}
            </span>
          </p>
          <p className="text-muted-foreground text-xs">
            Automático cada 10 min.
          </p>
        </div>
        <div className="border-border bg-card rounded-[20px] border p-5 shadow-[var(--shadow-sm)]">
          <h2 className="text-sm font-semibold">Activos</h2>
          <p className="text-muted-foreground mt-1 text-xs">
            Fuente: Activos · Modo: Programado · Última sync:{" "}
            <span className="font-mono">
              {fmtTime(lastBySource["assets"] ?? null)}
            </span>
          </p>
          <p className="text-muted-foreground text-xs">
            Reconciliación nocturna (03:00).
          </p>
        </div>
      </div>

      <SyncPanel />

      <section className="border-border bg-card rounded-[20px] border shadow-[var(--shadow-sm)]">
        <div className="border-border border-b px-5 py-4">
          <h2 className="text-sm font-semibold">Historial reciente</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-muted-foreground text-xs">
              <tr className="border-border border-b">
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
                    className="text-muted-foreground px-5 py-8 text-center"
                  >
                    Sin ejecuciones registradas todavía.
                  </td>
                </tr>
              ) : (
                runs.map((r) => (
                  <tr
                    key={r.id}
                    className="border-border border-b last:border-0"
                  >
                    <td className="px-5 py-2">
                      {SOURCE_LABEL[r.source] ?? r.source}
                    </td>
                    <td className="text-muted-foreground px-5 py-2">
                      {MODE_LABEL[r.mode] ?? r.mode}
                    </td>
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
                        {STATUS_LABEL[r.status] ?? r.status}
                      </span>
                    </td>
                    <td className="px-5 py-2 font-mono tabular-nums">
                      {r.rows_read ?? "—"}
                    </td>
                    <td className="px-5 py-2 font-mono tabular-nums">
                      {r.rows_upserted ?? "—"}
                    </td>
                    <td className="text-muted-foreground px-5 py-2 font-mono">
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
