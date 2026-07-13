import Link from "next/link";
import { getPortalSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { IconAlert, IconAssets, IconBuilding } from "@/components/icons";
import { formatProgress } from "@/lib/status";
import { nameFromEmail } from "@/lib/utils";

export const metadata = { title: "Inicio · Portal Activos Kairos" };
export const dynamic = "force-dynamic";

const OPEN_INCIDENTS = [
  "Pendiente",
  "Solucionando",
  "En Espera",
  "Escalada",
  "Solucionada con Acciones Pendientes",
];

const MONTHS_ES = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

interface AssetRow {
  id: string;
  name: string;
  status: string;
  progress: string | null;
  desired_result: string | null;
  due_at: string | null;
  ended_at: string | null;
}

interface IncidentRow {
  status: string;
  title: string;
  created_at: string | null;
  resolved_at: string | null;
}

/** Marcas del eje Y: de `max` a 0. Paso 2 si max>5, si no 1. */
function axisTicks(max: number): number[] {
  const step = max > 5 ? 2 : 1;
  const out: number[] = [];
  for (let t = max; t > 0; t -= step) out.push(t);
  out.push(0);
  return out;
}

/** Devuelve las claves (año-mes) de los últimos `n` meses, del más antiguo al actual. */
function lastMonths(n: number): { key: string; label: string }[] {
  const out: { key: string; label: string }[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: MONTHS_ES[d.getMonth()],
    });
  }
  return out;
}

function monthKey(value: string | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${d.getMonth()}`;
}

export default async function InicioPage() {
  const [session, supabase] = await Promise.all([
    getPortalSession(),
    createClient(),
  ]);

  const [assetsRes, incidentsRes] = await Promise.all([
    supabase
      .from("assets")
      .select("id, name, status, progress, desired_result, due_at, ended_at"),
    supabase
      .from("incidents")
      .select("status, title, created_at, resolved_at"),
  ]);

  const assets = (assetsRes.data ?? []) as AssetRow[];
  const incidents = (incidentsRes.data ?? []) as IncidentRow[];

  const inProgress = assets.filter((a) => a.status === "En Progreso");
  const done = assets.filter((a) => a.status === "Terminado");
  const openIncidents = incidents.filter((i) =>
    OPEN_INCIDENTS.includes(i.status),
  ).length;

  const firstName = nameFromEmail(session?.email ?? "");
  const roleLabel = session?.role === "admin" ? "Administrador" : "Cliente";

  const kpis = [
    {
      label: "Activos en construcción",
      value: inProgress.length,
      href: "/activos",
      icon: IconAssets,
      accent: true,
    },
    {
      label: "Activos terminados",
      value: done.length,
      href: "/activos",
      icon: IconAssets,
      accent: false,
    },
    {
      label: "Incidencias abiertas",
      value: openIncidents,
      href: "/incidencias",
      icon: IconAlert,
      accent: false,
    },
  ];

  // Siguiente Activo Kairos = En Progreso con entrega prevista más próxima.
  const nextAsset = inProgress
    .filter((a) => a.due_at)
    .slice()
    .sort(
      (a, b) => new Date(a.due_at!).getTime() - new Date(b.due_at!).getTime(),
    )[0];

  // --- Gráfico A: activos terminados por mes (por ended_at) ---
  const months = lastMonths(6);
  const assetsByMonth = months.map((m) => {
    const items = done
      .filter((a) => monthKey(a.ended_at) === m.key)
      .map((a) => a.name);
    return { label: m.label, value: items.length, items };
  });
  const assetsMax = Math.max(1, ...assetsByMonth.map((d) => d.value));
  const assetsTicks = axisTicks(assetsMax);

  // --- Gráfico B: incidencias por mes (por created_at), resueltas/abiertas ---
  const incidentsByMonth = months.map((m) => {
    const inMonth = incidents.filter((i) => monthKey(i.created_at) === m.key);
    const resolvedItems = inMonth.filter((i) => i.resolved_at).map((i) => i.title);
    const openItems = inMonth.filter((i) => !i.resolved_at).map((i) => i.title);
    return {
      label: m.label,
      resolved: resolvedItems.length,
      open: openItems.length,
      resolvedItems,
      openItems,
    };
  });
  const incidentsMax = Math.max(
    1,
    ...incidentsByMonth.map((d) => d.resolved + d.open),
  );
  const incidentsTicks = axisTicks(incidentsMax);

  return (
    <div className="portal-reveal space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-foreground text-[25px] font-extrabold tracking-tight">
          Hola, {firstName || "de nuevo"}.
        </h1>
      </div>

      {/* Cabecera: empresa + rol */}
      <div className="border-border bg-card relative overflow-hidden rounded-[22px] border p-6 shadow-[var(--shadow-sm)]">
        <p className="text-brand-accent text-[11.5px] font-bold tracking-[0.14em] uppercase">
          Tu empresa
        </p>
        <div className="mt-3 flex items-center gap-3">
          <span className="bg-accent text-brand-accent flex size-[42px] shrink-0 items-center justify-center rounded-xl">
            <IconBuilding />
          </span>
          <div className="min-w-0">
            <div className="text-foreground text-lg font-bold tracking-tight">
              {session?.companyName ?? "Activos Kairos"}
            </div>
            <div className="text-muted-foreground text-[13px]">{roleLabel}</div>
          </div>
        </div>
      </div>

      {/* 3 KPIs clicables */}
      <div className="grid gap-3 sm:grid-cols-3">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <Link
              key={k.label}
              href={k.href}
              className={`bg-card rounded-[22px] border p-5 shadow-[var(--shadow-sm)] transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-md)] ${
                k.accent ? "border-[var(--brand-accent)]/30" : "border-border"
              }`}
            >
              <div
                className={`mb-3.5 flex items-center gap-2 ${
                  k.accent ? "text-brand-accent" : "text-muted-foreground"
                }`}
              >
                <Icon width={17} height={17} />
                <span
                  className={`text-[13px] ${k.accent ? "font-semibold" : ""}`}
                >
                  {k.label}
                </span>
              </div>
              <div
                className={`text-[40px] leading-none font-extrabold tracking-tight tabular-nums ${
                  k.accent ? "text-brand-accent" : "text-foreground"
                }`}
              >
                {k.value}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Siguiente Activo Kairos */}
      {nextAsset && (
        <Link
          href="/activos"
          className="border-border bg-card block rounded-[22px] border p-6 shadow-[var(--shadow-sm)] transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-md)]"
          style={{
            borderColor: "color-mix(in oklch, var(--brand), transparent 70%)",
          }}
        >
          <div className="text-brand-accent mb-3 flex items-center gap-2 text-[11.5px] font-bold tracking-[0.1em] uppercase">
            <span className="bg-brand size-[7px] rounded-full" />
            Siguiente Activo Kairos
          </div>
          <div className="text-foreground text-xl font-extrabold tracking-tight">
            {nextAsset.name}
          </div>
          {nextAsset.desired_result && (
            <p className="text-muted-foreground mt-1.5 max-w-[68ch] text-[14.5px] leading-relaxed">
              {nextAsset.desired_result}
            </p>
          )}
          <div className="mt-4 flex items-center justify-between gap-3">
            <span className="text-muted-foreground text-[12.5px]">
              Progreso
            </span>
            <span className="text-brand-accent font-mono text-[13px] font-semibold">
              {formatProgress(nextAsset.progress)}%
            </span>
          </div>
          <div className="bg-muted mt-1.5 h-[9px] overflow-hidden rounded-full">
            <div
              className="bg-brand h-full rounded-full"
              style={{ width: `${formatProgress(nextAsset.progress)}%` }}
            />
          </div>
        </Link>
      )}

      {/* 2 gráficos con datos reales agregados — eje Y + hover por barra */}
      <div className="grid gap-3 lg:grid-cols-2">
        <section className="border-border bg-card rounded-[22px] border p-6 shadow-[var(--shadow-sm)]">
          <h2 className="text-foreground text-base font-bold tracking-tight">
            Activos Kairos por mes
          </h2>
          <p className="text-muted-foreground mb-5 text-[13px]">
            Entregados en los últimos 6 meses
          </p>
          <div className="flex h-[132px] items-stretch gap-2.5 px-0.5">
            {/* Eje Y (índices) */}
            <div className="flex flex-col">
              <div className="flex flex-1 flex-col items-end justify-between">
                {assetsTicks.map((t) => (
                  <span
                    key={t}
                    className="text-muted-foreground font-mono text-[10px] leading-none"
                  >
                    {t}
                  </span>
                ))}
              </div>
              <span className="invisible text-[11.5px] leading-none">0</span>
            </div>
            {assetsByMonth.map((d, i) => (
              <div
                key={i}
                className="group relative flex h-full flex-1 flex-col items-center gap-2"
              >
                <div className="flex w-full flex-1 items-end justify-center">
                  <div
                    className="bg-brand w-[68%] max-w-[34px] rounded-t-md transition-[filter] group-hover:brightness-110"
                    style={{
                      height: `${(d.value / assetsMax) * 100}%`,
                      minHeight: d.value > 0 ? 4 : 0,
                    }}
                  />
                </div>
                <span className="text-muted-foreground text-[11.5px]">
                  {d.label}
                </span>
                {d.value > 0 && (
                  <div className="border-border bg-card pointer-events-none absolute bottom-[calc(100%+10px)] left-1/2 z-20 w-max max-w-[240px] -translate-x-1/2 translate-y-1 rounded-2xl border p-3.5 opacity-0 shadow-[var(--shadow-md)] transition-all group-hover:translate-y-0 group-hover:opacity-100">
                    <div className="mb-2 flex items-baseline justify-between gap-3">
                      <span className="text-muted-foreground text-[11px] font-bold tracking-[0.06em] uppercase">
                        {d.label} · entregados
                      </span>
                      <span className="text-brand-accent font-mono text-xs font-bold">
                        {d.value}
                      </span>
                    </div>
                    <ul className="flex flex-col gap-1.5">
                      {d.items.map((name, j) => (
                        <li key={j} className="flex items-center gap-2">
                          <span className="bg-success-foreground size-1.5 shrink-0 rounded-full" />
                          <span className="text-foreground/90 text-[12.5px]">
                            {name}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="border-border bg-card rounded-[22px] border p-6 shadow-[var(--shadow-sm)]">
          <h2 className="text-foreground text-base font-bold tracking-tight">
            Incidencias mensuales por estado
          </h2>
          <div className="mt-2 mb-4 flex gap-4">
            <span className="text-muted-foreground flex items-center gap-1.5 text-[12.5px]">
              <span className="bg-success-foreground size-[9px] rounded-[3px]" />
              Resueltas
            </span>
            <span className="text-muted-foreground flex items-center gap-1.5 text-[12.5px]">
              <span className="bg-warning-foreground size-[9px] rounded-[3px]" />
              Abiertas
            </span>
          </div>
          <div className="flex h-[132px] items-stretch gap-2.5 px-0.5">
            {/* Eje Y (índices) */}
            <div className="flex flex-col">
              <div className="flex flex-1 flex-col items-end justify-between">
                {incidentsTicks.map((t) => (
                  <span
                    key={t}
                    className="text-muted-foreground font-mono text-[10px] leading-none"
                  >
                    {t}
                  </span>
                ))}
              </div>
              <span className="invisible text-[11.5px] leading-none">0</span>
            </div>
            {incidentsByMonth.map((d, i) => {
              const total = d.resolved + d.open;
              return (
                <div
                  key={i}
                  className="group relative flex h-full flex-1 flex-col items-center gap-2"
                >
                  <div className="flex w-full flex-1 items-end justify-center">
                    <div
                      className="flex w-[68%] max-w-[34px] flex-col overflow-hidden rounded-t-md transition-[filter] group-hover:brightness-110"
                      style={{
                        height: `${(total / incidentsMax) * 100}%`,
                        minHeight: total > 0 ? 4 : 0,
                      }}
                    >
                      {d.open > 0 && (
                        <div
                          className="bg-warning-foreground"
                          style={{ height: `${(d.open / total) * 100}%` }}
                        />
                      )}
                      <div className="bg-success-foreground flex-1" />
                    </div>
                  </div>
                  <span className="text-muted-foreground text-[11.5px]">
                    {d.label}
                  </span>
                  {total > 0 && (
                    <div className="border-border bg-card pointer-events-none absolute bottom-[calc(100%+10px)] left-1/2 z-20 w-max max-w-[240px] -translate-x-1/2 translate-y-1 rounded-2xl border p-3.5 opacity-0 shadow-[var(--shadow-md)] transition-all group-hover:translate-y-0 group-hover:opacity-100">
                      <div className="mb-2 flex items-baseline justify-between gap-3">
                        <span className="text-muted-foreground text-[11px] font-bold tracking-[0.06em] uppercase">
                          {d.label} · incidencias
                        </span>
                        <span className="text-brand-accent font-mono text-xs font-bold">
                          {total}
                        </span>
                      </div>
                      <div className="flex flex-col gap-2.5">
                        {d.open > 0 && (
                          <div>
                            <div className="mb-1 flex items-center gap-2">
                              <span className="bg-warning-foreground size-2 shrink-0 rounded-full" />
                              <span className="text-foreground text-[11.5px] font-bold">
                                Abiertas
                              </span>
                              <span className="text-muted-foreground ml-auto font-mono text-[11px] font-semibold">
                                {d.open}
                              </span>
                            </div>
                            <ul className="flex flex-col gap-0.5 pl-4">
                              {d.openItems.map((t, j) => (
                                <li
                                  key={j}
                                  className="text-foreground/90 text-[12px]"
                                >
                                  {t}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {d.resolved > 0 && (
                          <div>
                            <div className="mb-1 flex items-center gap-2">
                              <span className="bg-success-foreground size-2 shrink-0 rounded-full" />
                              <span className="text-foreground text-[11.5px] font-bold">
                                Resueltas
                              </span>
                              <span className="text-muted-foreground ml-auto font-mono text-[11px] font-semibold">
                                {d.resolved}
                              </span>
                            </div>
                            <ul className="flex flex-col gap-0.5 pl-4">
                              {d.resolvedItems.map((t, j) => (
                                <li
                                  key={j}
                                  className="text-foreground/90 text-[12px]"
                                >
                                  {t}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <p className="text-muted-foreground pt-1 text-xs">
        Los datos se sincronizan automáticamente desde Notion: incidencias cada
        10 minutos, activos cada noche.
      </p>
    </div>
  );
}
