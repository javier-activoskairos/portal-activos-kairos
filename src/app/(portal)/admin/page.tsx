import { redirect } from "next/navigation";
import { getPortalSession } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminView, type RunRow, type ClientRow } from "./admin-view";

export const metadata = { title: "Sincronización · Portal Activos Kairos" };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const session = await getPortalSession();
  if (!session || session.role !== "admin") redirect("/inicio");

  // service_role: lectura interna (bypass RLS) del historial, estado y clientes.
  const admin = createAdminClient();
  const [
    { data: runsData },
    { data: stateData },
    { count: assetsCount },
    { count: incidentsCount },
    { data: clientUsers },
  ] = await Promise.all([
    admin
      .from("sync_runs")
      .select(
        "id, source, mode, status, started_at, finished_at, rows_read, rows_upserted, error_summary",
      )
      .order("started_at", { ascending: false })
      .limit(40),
    admin.from("sync_state").select("source, last_success_at"),
    admin.from("assets").select("id", { count: "exact", head: true }),
    admin.from("incidents").select("id", { count: "exact", head: true }),
    admin
      .from("portal_users")
      .select("company_id, email")
      .eq("role", "client")
      .eq("active", true),
  ]);

  const runs = (runsData ?? []) as RunRow[];
  const state = (stateData ?? []) as {
    source: string;
    last_success_at: string | null;
  }[];

  // Última sincronización correcta = la más reciente entre fuentes.
  const lastSuccessISO =
    state
      .map((s) => s.last_success_at)
      .filter((v): v is string => !!v)
      .sort()
      .at(-1) ?? null;

  // Estado global = ninguna fuente con la última ejecución en error.
  const latestPerSource = new Map<string, RunRow>();
  for (const r of runs) if (!latestPerSource.has(r.source)) latestPerSource.set(r.source, r);
  const statusOk = ![...latestPerSource.values()].some(
    (r) => r.status === "error",
  );
  const lastError = runs.find((r) => r.status === "error")?.error_summary ?? null;

  const totalRecords = (assetsCount ?? 0) + (incidentsCount ?? 0);
  const rowsRead = runs[0]?.rows_read ?? totalRecords;

  // Clientes con membresía = una fila por empresa (con email de contacto).
  const byCompany = new Map<string, string>();
  for (const u of (clientUsers ?? []) as {
    company_id: string;
    email: string | null;
  }[]) {
    if (!byCompany.has(u.company_id)) byCompany.set(u.company_id, u.email ?? "");
  }
  const companyIds = [...byCompany.keys()];
  const { data: comps } = companyIds.length
    ? await admin
        .from("companies")
        .select("id, name, logo_url")
        .in("id", companyIds)
    : {
        data: [] as { id: string; name: string | null; logo_url: string | null }[],
      };
  const compById = new Map(
    (comps ?? []).map((c) => [
      c.id,
      { name: c.name ?? "Cliente", logoUrl: c.logo_url ?? null },
    ]),
  );
  const clients: ClientRow[] = companyIds.map((id) => ({
    companyId: id,
    companyName: compById.get(id)?.name ?? "Cliente",
    logoUrl: compById.get(id)?.logoUrl ?? null,
    email: byCompany.get(id) ?? "",
  }));

  return (
    <AdminView
      statusOk={statusOk}
      lastSuccessISO={lastSuccessISO}
      rowsRead={rowsRead}
      totalRecords={totalRecords}
      cronIncidents="*/10 * * * *"
      lastError={lastError}
      clients={clients}
      runs={runs}
    />
  );
}
