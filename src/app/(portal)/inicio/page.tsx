import Link from "next/link";
import { redirect } from "next/navigation";
import { getPortalDb } from "@/lib/session";
import { IconAlert, IconAssets, IconBuilding } from "@/components/icons";
import { formatProgress } from "@/lib/status";
import { nameFromEmail } from "@/lib/utils";
import { niceScale, fmtHoras } from "@/lib/charts";
import {
  LegendBarChart,
  type ChartMonth,
  type ChartSeries,
} from "@/components/legend-bar-chart";

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

// Horas estándar por tipo de acompañamiento (reunión).
const ACOMP_HOURS: Record<string, number> = {
  Astrapi: 0.75,
  Areté: 1.5,
  Prótos: 0.75,
};

// Color por tipo de KPI; se atenúa a gris cuando el valor es 0 (condicional).
const KPI_TONE = {
  blue: { fg: "text-blue-500", border: "border-blue-500/30" },
  amber: { fg: "text-amber-500", border: "border-amber-500/35" },
  orange: { fg: "text-brand-accent", border: "border-[var(--brand-accent)]/35" },
  red: { fg: "text-red-500", border: "border-red-500/30" },
} as const;

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
  const ctx = await getPortalDb();
  if (!ctx) redirect("/acceso-denegado");
  const { session, db, companyId } = ctx;

  const [assetsRes, incidentsRes, meetingsRes] = await Promise.all([
    db
      .from("assets")
      .select("id, name, status, progress, desired_result, due_at, ended_at")
      .eq("company_id", companyId),
    db
      .from("incidents")
      .select("status, title, created_at, resolved_at")
      .eq("company_id", companyId),
    db
      .from("meetings")
      .select("type, meeting_date")
      .eq("company_id", companyId),
  ]);

  const assets = (assetsRes.data ?? []) as AssetRow[];
  const incidents = (incidentsRes.data ?? []) as IncidentRow[];
  const meetings = (meetingsRes.data ?? []) as {
    type: string;
    meeting_date: string | null;
  }[];

  const proposed = assets.filter((a) => a.status === "Por Empezar");
  const inProgress = assets.filter((a) => a.status === "En Progreso");
  const done = assets.filter((a) => a.status === "Terminado");
  const openIncidents = incidents.filter((i) =>
    OPEN_INCIDENTS.includes(i.status),
  ).length;

  // En "Ver como cliente" saludamos con la identidad del cliente representativo.
  const firstName = session?.viewingAs
    ? (session.viewingAs.displayName?.split(" ")[0] ??
      nameFromEmail(session.viewingAs.userEmail))
    : nameFromEmail(session?.email ?? "");

  const kpis = [
    {
      label: "Activos propuestos",
      value: proposed.length,
      href: "/activos",
      icon: IconAssets,
      tone: "amber" as const,
    },
    {
      label: "Activos en construcción",
      value: inProgress.length,
      href: "/activos",
      icon: IconAssets,
      tone: "blue" as const,
    },
    {
      label: "Incidencias abiertas",
      value: openIncidents,
      href: "/incidencias",
      icon: IconAlert,
      tone: "red" as const,
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
  const assetsScale = niceScale(Math.max(...assetsByMonth.map((d) => d.value)));

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
  // Serie/datos para el gráfico de incidencias (leyenda clicable).
  const incidentsSeries: ChartSeries[] = [
    {
      key: "resueltas",
      label: "Resueltas",
      barClass: "bg-success-foreground",
      dotClass: "bg-success-foreground",
    },
    {
      key: "abiertas",
      label: "Abiertas",
      barClass: "bg-warning-foreground",
      dotClass: "bg-warning-foreground",
    },
  ];
  const incidentsMonths: ChartMonth[] = incidentsByMonth.map((d) => ({
    label: d.label,
    data: {
      resueltas: {
        value: d.resolved,
        count: d.resolved,
        items: d.resolvedItems,
      },
      abiertas: { value: d.open, count: d.open, items: d.openItems },
    },
  }));

  // --- Gráfico C: horas de acompañamiento por mes (Astrapi/Areté/Prótos) ---
  const meetingsByMonth = months.map((m) => {
    const inMonth = meetings.filter((mt) => monthKey(mt.meeting_date) === m.key);
    const astrapi = inMonth.filter((x) => x.type === "Astrapi").length;
    const arete = inMonth.filter((x) => x.type === "Areté").length;
    const protos = inMonth.filter((x) => x.type === "Prótos").length;
    return {
      label: m.label,
      astrapi,
      arete,
      protos,
      hA: astrapi * ACOMP_HOURS.Astrapi,
      hR: arete * ACOMP_HOURS["Areté"],
      hP: protos * ACOMP_HOURS["Prótos"],
    };
  });
  const hasProtos = meetingsByMonth.some((d) => d.protos > 0);
  const meetingsSeries: ChartSeries[] = [
    { key: "astrapi", label: "Astrapi", barClass: "bg-brand", dotClass: "bg-brand" },
    { key: "arete", label: "Areté", barClass: "bg-blue-500", dotClass: "bg-blue-500" },
    ...(hasProtos
      ? [
          {
            key: "protos",
            label: "Prótos",
            barClass: "bg-purple-500",
            dotClass: "bg-purple-500",
          },
        ]
      : []),
  ];
  const meetingsMonths: ChartMonth[] = meetingsByMonth.map((d) => ({
    label: d.label,
    data: {
      astrapi: {
        value: d.hA,
        count: d.astrapi,
        valueLabel: `${d.astrapi} · ${fmtHoras(d.hA)} h`,
      },
      arete: {
        value: d.hR,
        count: d.arete,
        valueLabel: `${d.arete} · ${fmtHoras(d.hR)} h`,
      },
      protos: {
        value: d.hP,
        count: d.protos,
        valueLabel: `${d.protos} · ${fmtHoras(d.hP)} h`,
      },
    },
  }));

  // Racha del plan (Tempo 🔥 / Stasis 🛡️) — bloque en "Tu Plan".
  const streakKind =
    session.plan === "Stasis"
      ? "Stasis"
      : session.plan === "Tempo"
        ? "Tempo"
        : null;
  const showStreak = session.planStreakWeeks > 0 && !!streakKind;
  const isStasis = session.plan === "Stasis";
  const streakGlyph = isStasis ? "🛡️" : "🔥";

  return (
    <div className="portal-reveal space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-foreground text-[25px] font-extrabold tracking-tight">
          Hola, {firstName || "de nuevo"}.
        </h1>
      </div>

      {/* Cabecera: Tu Plan (izquierda) + Empresa (derecha) */}
      <div
        className="border-border bg-card relative overflow-hidden rounded-[22px] border p-6 shadow-[var(--shadow-sm)]"
        style={{
          backgroundImage:
            "linear-gradient(120deg, color-mix(in oklch, var(--brand), transparent 90%), transparent 55%)",
        }}
      >
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:gap-8">
          <div className="min-w-0 flex-1">
            <p className="text-brand-accent text-[11.5px] font-bold tracking-[0.14em] uppercase">
              Tu plan
            </p>
            <div className="text-foreground mt-1.5 text-[28px] leading-none font-extrabold tracking-tight">
              {session.plan ?? "Sin plan"}
            </div>
            <p className="text-muted-foreground mt-2 max-w-[42ch] text-[14px] leading-relaxed">
              Cada mes tu empresa suma más activos y más valor.
            </p>
          </div>
          {showStreak && (
            <div
              className={`flex shrink-0 items-center gap-3.5 self-center rounded-2xl border px-5 py-4 ${
                isStasis
                  ? "border-blue-500/25 bg-blue-500/10"
                  : "bg-accent border-[color:var(--brand-accent)]/25"
              }`}
            >
              <span className="text-2xl leading-none">{streakGlyph}</span>
              <div className="min-w-0">
                <div
                  className={`text-[26px] leading-none font-extrabold tracking-tight tabular-nums ${
                    isStasis ? "text-blue-500" : "text-brand-accent"
                  }`}
                >
                  {session.planStreakWeeks}
                </div>
                <div className="text-muted-foreground mt-1 text-[12.5px] font-semibold">
                  {session.planStreakWeeks === 1 ? "semana" : "semanas"} de racha{" "}
                  {streakKind}
                </div>
              </div>
            </div>
          )}
          <div className="md:border-border shrink-0 md:border-l md:pl-8">
            <p className="text-muted-foreground text-[11px] font-bold tracking-[0.12em] uppercase">
              Empresa
            </p>
            <div className="mt-2.5 flex items-center gap-3">
              {session.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={session.logoUrl}
                  alt={session.companyName}
                  className="border-border bg-card size-[42px] shrink-0 rounded-xl border object-contain p-1"
                />
              ) : (
                <span className="bg-accent text-brand-accent flex size-[42px] shrink-0 items-center justify-center rounded-xl">
                  <IconBuilding />
                </span>
              )}
              <div className="min-w-0">
                <div className="text-foreground text-[15px] font-bold tracking-tight">
                  {session?.companyName ?? "Activos Kairos"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3 KPIs numéricos con color condicional */}
      <div className="grid gap-3 sm:grid-cols-3">
        {kpis.map((k) => {
          const Icon = k.icon;
          const active = k.value > 0;
          const tone = KPI_TONE[k.tone];
          return (
            <Link
              key={k.label}
              href={k.href}
              className={`bg-card rounded-[22px] border p-5 shadow-[var(--shadow-sm)] transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-md)] ${
                active ? tone.border : "border-border"
              }`}
            >
              <div
                className={`mb-3.5 flex items-center gap-2 ${
                  active ? tone.fg : "text-muted-foreground"
                }`}
              >
                <Icon width={17} height={17} />
                <span className="text-[13px] font-semibold">{k.label}</span>
              </div>
              <div
                className={`text-[40px] leading-none font-extrabold tracking-tight tabular-nums ${
                  active ? tone.fg : "text-muted-foreground"
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
                {assetsScale.ticks.map((t) => (
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
                      height: `${(d.value / assetsScale.max) * 100}%`,
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

        <LegendBarChart
          title="Incidencias mensuales por estado"
          series={incidentsSeries}
          months={incidentsMonths}
          popoverSuffix="incidencias"
        />
      </div>

      <LegendBarChart
        title="Horas de acompañamiento por mes"
        series={meetingsSeries}
        months={meetingsMonths}
        unit="h"
        popoverSuffix="acompañamiento"
      />

      <p className="text-muted-foreground pt-1 text-xs">
        Los datos se sincronizan automáticamente desde Notion: incidencias cada
        10 minutos, activos cada noche.
      </p>
    </div>
  );
}
