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
      .select("id, company_id, email, first_name, last_name, can_manage_company")
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

  // Clientes con membresía = una fila por empresa, con sus contactos (fase 2).
  type PU = {
    id: string;
    company_id: string;
    email: string | null;
    first_name: string | null;
    last_name: string | null;
    can_manage_company: boolean | null;
  };
  const usersByCompany = new Map<string, PU[]>();
  for (const u of (clientUsers ?? []) as PU[]) {
    const arr = usersByCompany.get(u.company_id) ?? [];
    arr.push(u);
    usersByCompany.set(u.company_id, arr);
  }
  const companyIds = [...usersByCompany.keys()];
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
  const nameOf = (u: PU) =>
    [u.first_name, u.last_name].filter(Boolean).join(" ") ||
    (u.email?.split("@")[0] ?? "Contacto");
  const clients: ClientRow[] = companyIds
    .map((id) => {
      const users = (usersByCompany.get(id) ?? [])
        .slice()
        .sort((a, b) => (a.email ?? "").localeCompare(b.email ?? ""))
        .map((u) => ({
          id: u.id,
          email: u.email ?? "",
          name: nameOf(u),
          billing: !!u.can_manage_company,
        }));
      return {
        companyId: id,
        companyName: compById.get(id)?.name ?? "Cliente",
        logoUrl: compById.get(id)?.logoUrl ?? null,
        email: users[0]?.email ?? "",
        users,
      };
    })
    .sort((a, b) => a.companyName.localeCompare(b.companyName));

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
