import Link from "next/link";
import { redirect } from "next/navigation";
import { getPortalDb } from "@/lib/session";
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

// Horas estándar por tipo de acompañamiento (reunión).
const ACOMP_HOURS: Record<string, number> = {
  Astrapi: 0.75,
  Areté: 1.5,
  Prótos: 0.75,
};

/** Formatea horas con coma decimal, sin ceros sobrantes (1.5 → "1,5"). */
function fmtHoras(h: number): string {
  const s = Number.isInteger(h)
    ? String(h)
    : h.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
  return s.replace(".", ",");
}

// Color por tipo de KPI; se atenúa a gris cuando el valor es 0 (condicional).
const KPI_TONE = {
  blue: { fg: "text-blue-500", border: "border-blue-500/30" },
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

/**
 * Escala "bonita" para el eje Y: elige un paso redondo (1·2·5·10…) de modo
 * que las marcas queden equiespaciadas en valor y coincidan con las barras.
 */
function niceScale(dataMax: number): { max: number; ticks: number[] } {
  const m = Math.max(1, dataMax);
  const rawStep = m / 6;
  const pow = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const n = rawStep / pow;
  const unit = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  const step = Math.max(1, Math.round(unit * pow));
  const max = Math.ceil(m / step) * step;
  const ticks: number[] = [];
  for (let t = max; t > 0; t -= step) ticks.push(t);
  ticks.push(0);
  return { max, ticks };
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

  const firstName = nameFromEmail(session?.email ?? "");

  const kpis = [
    {
      label: "Activos propuestos",
      value: proposed.length,
      href: "/activos",
      icon: IconAssets,
      tone: "blue" as const,
    },
    {
      label: "Activos en construcción",
      value: inProgress.length,
      href: "/activos",
      icon: IconAssets,
      tone: "orange" as const,
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
  const incidentsScale = niceScale(
    Math.max(...incidentsByMonth.map((d) => d.resolved + d.open)),
  );

  // --- Gráfico C: horas de acompañamiento por mes (seguimientos Astrapi/Areté/Prótos) ---
  const meetingsByMonth = months.map((m) => {
    const inMonth = meetings.filter(
      (mt) => monthKey(mt.meeting_date) === m.key,
    );
    const astrapi = inMonth.filter((x) => x.type === "Astrapi").length;
    const arete = inMonth.filter((x) => x.type === "Areté").length;
    const protos = inMonth.filter((x) => x.type === "Prótos").length;
    const hA = astrapi * ACOMP_HOURS.Astrapi;
    const hR = arete * ACOMP_HOURS["Areté"];
    const hP = protos * ACOMP_HOURS["Prótos"];
    return { label: m.label, astrapi, arete, protos, hA, hR, hP, total: hA + hR + hP };
  });
  const meetingsScale = niceScale(
    Math.max(...meetingsByMonth.map((d) => d.total)),
  );
  const hasProtos = meetingsByMonth.some((d) => d.protos > 0);

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
                {incidentsScale.ticks.map((t) => (
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
                        height: `${(total / incidentsScale.max) * 100}%`,
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

      {/* Horas de acompañamiento por mes (Astrapi / Areté / Prótos) */}
      <section className="border-border bg-card relative overflow-hidden rounded-[22px] border p-6 shadow-[var(--shadow-sm)]">
        <svg
          aria-hidden
          viewBox="0 0 1200 380"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-[58%] w-full"
        >
          <path
            fill="#F8A848"
            fillOpacity="0.06"
            d="M0,150 C200,90 360,210 600,160 C840,110 1000,220 1200,150 L1200,380 L0,380 Z"
          />
          <path
            fill="#F96302"
            fillOpacity="0.06"
            d="M0,300 C240,255 400,345 640,305 C880,265 1030,350 1200,300 L1200,380 L0,380 Z"
          />
        </svg>
        <div className="relative z-[1]">
          <h2 className="text-foreground text-base font-bold tracking-tight">
            Horas de acompañamiento por mes
          </h2>
          <div className="mt-2 mb-4 flex flex-wrap gap-4">
            <span className="text-muted-foreground flex items-center gap-1.5 text-[12.5px]">
              <span className="bg-brand size-[9px] rounded-[3px]" />
              Astrapi
            </span>
            <span className="text-muted-foreground flex items-center gap-1.5 text-[12.5px]">
              <span className="size-[9px] rounded-[3px] bg-blue-500" />
              Areté
            </span>
            {hasProtos && (
              <span className="text-muted-foreground flex items-center gap-1.5 text-[12.5px]">
                <span className="size-[9px] rounded-[3px] bg-purple-500" />
                Prótos
              </span>
            )}
          </div>
          <div className="flex h-[132px] items-stretch gap-2.5 px-0.5">
            {/* Eje Y (horas) */}
            <div className="flex flex-col">
              <div className="flex flex-1 flex-col items-end justify-between">
                {meetingsScale.ticks.map((t) => (
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
            {meetingsByMonth.map((d, i) => (
              <div
                key={i}
                className="group relative flex h-full flex-1 flex-col items-center gap-2"
              >
                <div className="flex w-full flex-1 items-end justify-center">
                  <div
                    className="flex w-[68%] max-w-[34px] flex-col overflow-hidden rounded-t-md transition-[filter] group-hover:brightness-110"
                    style={{
                      height: `${(d.total / meetingsScale.max) * 100}%`,
                      minHeight: d.total > 0 ? 4 : 0,
                    }}
                  >
                    {d.hR > 0 && (
                      <div
                        className="bg-blue-500"
                        style={{ height: `${(d.hR / d.total) * 100}%` }}
                      />
                    )}
                    {d.hP > 0 && (
                      <div
                        className="bg-purple-500"
                        style={{ height: `${(d.hP / d.total) * 100}%` }}
                      />
                    )}
                    {d.hA > 0 && <div className="bg-brand flex-1" />}
                  </div>
                </div>
                <span className="text-muted-foreground text-[11.5px]">
                  {d.label}
                </span>
                {d.total > 0 && (
                  <div className="border-border bg-card pointer-events-none absolute bottom-[calc(100%+10px)] left-1/2 z-20 w-max max-w-[240px] -translate-x-1/2 translate-y-1 rounded-2xl border p-3.5 opacity-0 shadow-[var(--shadow-md)] transition-all group-hover:translate-y-0 group-hover:opacity-100">
                    <div className="mb-2 flex items-baseline justify-between gap-3">
                      <span className="text-muted-foreground text-[11px] font-bold tracking-[0.06em] uppercase">
                        {d.label} · acompañamiento
                      </span>
                      <span className="text-brand-accent font-mono text-xs font-bold">
                        {fmtHoras(d.total)} h
                      </span>
                    </div>
                    <ul className="flex flex-col gap-1.5">
                      {d.astrapi > 0 && (
                        <li className="flex items-center gap-2">
                          <span className="bg-brand size-2 shrink-0 rounded-full" />
                          <span className="text-foreground/90 text-[12.5px]">
                            Astrapi
                          </span>
                          <span className="text-muted-foreground ml-auto font-mono text-[11.5px]">
                            {d.astrapi} · {fmtHoras(d.hA)} h
                          </span>
                        </li>
                      )}
                      {d.arete > 0 && (
                        <li className="flex items-center gap-2">
                          <span className="size-2 shrink-0 rounded-full bg-blue-500" />
                          <span className="text-foreground/90 text-[12.5px]">
                            Areté
                          </span>
                          <span className="text-muted-foreground ml-auto font-mono text-[11.5px]">
                            {d.arete} · {fmtHoras(d.hR)} h
                          </span>
                        </li>
                      )}
                      {d.protos > 0 && (
                        <li className="flex items-center gap-2">
                          <span className="size-2 shrink-0 rounded-full bg-purple-500" />
                          <span className="text-foreground/90 text-[12.5px]">
                            Prótos
                          </span>
                          <span className="text-muted-foreground ml-auto font-mono text-[11.5px]">
                            {d.protos} · {fmtHoras(d.hP)} h
                          </span>
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <p className="text-muted-foreground pt-1 text-xs">
        Los datos se sincronizan automáticamente desde Notion: incidencias cada
        10 minutos, activos cada noche.
      </p>
    </div>
  );
}
