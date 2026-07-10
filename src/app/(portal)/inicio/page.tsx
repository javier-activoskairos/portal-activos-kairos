import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { incidentBadge, dotClass, formatProgress } from "@/lib/status";
import { cn } from "@/lib/utils";

export const metadata = { title: "Inicio · Portal Activos Kairos" };
export const dynamic = "force-dynamic";

const OPEN_INCIDENTS = [
  "Pendiente",
  "Solucionando",
  "En Espera",
  "Escalada",
  "Solucionada con Acciones Pendientes",
];

const INCIDENT_STATUS_ORDER = [
  "Pendiente",
  "Escalada",
  "Solucionando",
  "En Espera",
  "Solucionada con Acciones Pendientes",
  "Solucionada",
];

interface AssetSummary {
  id: string;
  name: string;
  status: string;
  progress: string | null;
}

export default async function InicioPage() {
  const supabase = await createClient();

  const [assetsRes, incidentsRes] = await Promise.all([
    supabase.from("assets").select("id, name, status, progress"),
    supabase.from("incidents").select("status, resolved_at"),
  ]);

  const assets = (assetsRes.data ?? []) as AssetSummary[];
  const incidents = incidentsRes.data ?? [];

  const inProgressAssets = assets.filter((a) => a.status === "En Progreso");
  const doneAssets = assets.filter((a) => a.status === "Terminado");
  const openIncidents = incidents.filter((i) =>
    OPEN_INCIDENTS.includes(i.status),
  ).length;

  const kpis = [
    {
      label: "Activos en progreso",
      value: inProgressAssets.length,
      href: "/activos",
    },
    { label: "Activos terminados", value: doneAssets.length, href: "/activos" },
    {
      label: "Incidencias abiertas",
      value: openIncidents,
      href: "/incidencias",
    },
  ];

  const headline =
    openIncidents === 0
      ? "Todo en orden"
      : `${openIncidents} incidencia${openIncidents === 1 ? "" : "s"} requiere${
          openIncidents === 1 ? "" : "n"
        } atención`;

  const incidentCounts = INCIDENT_STATUS_ORDER.map((status) => ({
    status,
    tone: incidentBadge(status).tone,
    count: incidents.filter((i) => i.status === status).length,
  })).filter((s) => s.count > 0);
  const totalIncidents = incidents.length;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-brand-accent text-xs font-semibold tracking-wide uppercase">
          Resumen
        </p>
        <h1 className="mt-1 text-3xl font-extrabold tracking-tight">
          {headline}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Estado general de tus activos e incidencias con Activos Kairos.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {kpis.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="border-border bg-card rounded-[20px] border p-5 shadow-[var(--shadow-sm)] transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]"
          >
            <div className="text-3xl font-extrabold tabular-nums">
              {s.value}
            </div>
            <div className="text-muted-foreground mt-1 text-sm">{s.label}</div>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="border-border bg-card rounded-[20px] border p-5 shadow-[var(--shadow-sm)]">
          <h2 className="text-sm font-semibold">Incidencias por estado</h2>
          {totalIncidents === 0 ? (
            <p className="text-muted-foreground mt-4 text-sm">
              No hay incidencias registradas.
            </p>
          ) : (
            <>
              <div className="bg-muted mt-4 flex h-2.5 overflow-hidden rounded-full">
                {incidentCounts.map((s) => (
                  <div
                    key={s.status}
                    className={cn(dotClass(s.tone))}
                    style={{ width: `${(s.count / totalIncidents) * 100}%` }}
                    title={`${s.status}: ${s.count}`}
                  />
                ))}
              </div>
              <ul className="mt-4 space-y-2">
                {incidentCounts.map((s) => (
                  <li
                    key={s.status}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span className="text-muted-foreground flex items-center gap-2">
                      <span
                        aria-hidden
                        className={cn(
                          "size-1.5 shrink-0 rounded-full",
                          dotClass(s.tone),
                        )}
                      />
                      {s.status}
                    </span>
                    <span className="font-medium tabular-nums">{s.count}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <section className="border-border bg-card rounded-[20px] border p-5 shadow-[var(--shadow-sm)]">
          <h2 className="text-sm font-semibold">Progreso de activos</h2>
          {inProgressAssets.length === 0 ? (
            <p className="text-muted-foreground mt-4 text-sm">
              No hay activos en progreso.
            </p>
          ) : (
            <ul className="mt-4 space-y-4">
              {inProgressAssets.map((a) => {
                const pct = formatProgress(a.progress);
                return (
                  <li key={a.id}>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="truncate font-medium">{a.name}</span>
                      <span className="text-muted-foreground tabular-nums">
                        {pct}%
                      </span>
                    </div>
                    <div className="bg-muted mt-1.5 h-1.5 overflow-hidden rounded-full">
                      <div
                        className="bg-brand h-full rounded-full"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <p className="text-muted-foreground text-xs">
        Los datos se sincronizan automáticamente desde Notion: incidencias cada
        10 minutos, activos cada noche.
      </p>
    </div>
  );
}
