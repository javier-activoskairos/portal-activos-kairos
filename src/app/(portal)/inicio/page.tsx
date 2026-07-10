import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/status-badge";
import { incidentTone, formatDate } from "@/lib/status";

export const metadata = { title: "Inicio · Portal Activos Kairos" };
export const dynamic = "force-dynamic";

const OPEN_INCIDENTS = [
  "Pendiente",
  "Solucionando",
  "En Espera",
  "Escalada",
  "Solucionada con Acciones Pendientes",
];

export default async function InicioPage() {
  const supabase = await createClient();

  const [assetsRes, incidentsRes, recentRes] = await Promise.all([
    supabase.from("assets").select("status"),
    supabase.from("incidents").select("status"),
    supabase
      .from("incidents")
      .select("id, title, status, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const assets = assetsRes.data ?? [];
  const incidents = incidentsRes.data ?? [];
  const recent = recentRes.data ?? [];

  const inProgress = assets.filter((a) => a.status === "En Progreso").length;
  const done = assets.filter((a) => a.status === "Terminado").length;
  const openIncidents = incidents.filter((i) =>
    OPEN_INCIDENTS.includes(i.status),
  ).length;
  const solvedIncidents = incidents.filter(
    (i) => i.status === "Solucionada",
  ).length;

  const stats = [
    { label: "Activos en progreso", value: inProgress, href: "/activos" },
    { label: "Activos terminados", value: done, href: "/activos" },
    { label: "Incidencias abiertas", value: openIncidents, href: "/incidencias" },
    { label: "Incidencias resueltas", value: solvedIncidents, href: "/incidencias" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Resumen</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Estado general de tus activos e incidencias con Activos Kairos.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="rounded-xl border border-border bg-card p-5 shadow-sm transition-colors hover:border-brand/40"
          >
            <div className="text-3xl font-semibold tabular-nums">{s.value}</div>
            <div className="mt-1 text-sm text-muted-foreground">{s.label}</div>
          </Link>
        ))}
      </div>

      <section className="rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-sm font-semibold">Últimas incidencias</h2>
          <Link
            href="/incidencias"
            className="text-xs font-medium text-brand hover:underline"
          >
            Ver todas
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">
            No hay incidencias registradas.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {recent.map((i) => (
              <li
                key={i.id}
                className="flex items-center justify-between gap-4 px-5 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{i.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(i.created_at)}
                  </p>
                </div>
                <StatusBadge label={i.status} tone={incidentTone(i.status)} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
