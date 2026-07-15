"use client";

import { useEffect, useState, useTransition } from "react";
import { IconAlert, IconLock } from "@/components/icons";
import { runAllSync, runPartialSync, type PartialSource } from "./actions";
import { viewAsClient } from "./view-as-actions";

// Fuentes sincronizables por separado (panel interno).
const PARTIAL_SOURCES: {
  key: PartialSource;
  label: string;
  hint: string;
}[] = [
  { key: "assets", label: "Activos Kairos", hint: "Activos + tareas" },
  { key: "tasks", label: "Tareas", hint: "Solo tareas del detalle" },
  { key: "incidents", label: "Incidencias", hint: "Estados y respuestas" },
  { key: "meetings", label: "Reuniones", hint: "Astrapi · Areté · Prótos" },
  { key: "companies", label: "Empresas", hint: "Plan, logo, sector" },
  { key: "contacts", label: "Contactos", hint: "Usuarios Avans / Facturación" },
  {
    key: "memberships",
    label: "Membresías",
    hint: "Precio, recurrencia, racha",
  },
  { key: "invoices", label: "Facturas", hint: "Historial + PDFs" },
];

export interface RunRow {
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

export interface ClientRow {
  companyId: string;
  companyName: string;
  logoUrl: string | null;
  email: string;
  users: { id: string; email: string; name: string; billing: boolean }[];
}

const SOURCE_LABEL: Record<string, string> = {
  incidents: "Incidencias",
  assets: "Activos",
};
const MODE_LABEL: Record<string, string> = {
  scheduled: "Programado",
  cron: "Programado",
  manual: "Manual",
};
const STATUS_LABEL: Record<string, string> = {
  success: "Correcto",
  error: "Error",
  running: "En curso",
};

function IconRefresh({ className }: { className?: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5" />
    </svg>
  );
}
function IconEye() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
function IconUsers() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="9" cy="7" r="3" />
      <path d="M2 21v-1a6 6 0 0 1 12 0v1" />
      <path d="M16 3.1a3 3 0 0 1 0 5.8M22 21v-1a6 6 0 0 0-4-5.6" />
    </svg>
  );
}
function IconChevron({ open }: { open: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}
function IconArrowRight() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function relTime(iso: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return "hace un momento";
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return `hace ${d} d`;
}
function absTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-ES", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}
function nextRunLabel(): string {
  const mins = 10 - (new Date().getMinutes() % 10);
  return `en ~${mins} min`;
}

export function AdminView({
  statusOk,
  lastSuccessISO,
  rowsRead,
  totalRecords,
  cronIncidents,
  lastError,
  clients,
  runs,
}: {
  statusOk: boolean;
  lastSuccessISO: string | null;
  rowsRead: number;
  totalRecords: number;
  cronIncidents: string;
  lastError: string | null;
  clients: ClientRow[];
  runs: RunRow[];
}) {
  const [tab, setTab] = useState<"estado" | "historial">("estado");
  const [showError, setShowError] = useState(false);
  const [clientsOpen, setClientsOpen] = useState(false);
  // Selector en 2 fases: primero empresa, luego contacto.
  const [pickedCompany, setPickedCompany] = useState<ClientRow | null>(null);
  const [pending, startTransition] = useTransition();
  const [syncMsg, setSyncMsg] = useState<string | null>(null);
  // Sincronización parcial: panel + fuente en curso.
  const [partialOpen, setPartialOpen] = useState(false);
  const [runningSource, setRunningSource] = useState<PartialSource | null>(null);
  const [partialMsg, setPartialMsg] = useState<string | null>(null);

  function syncOne(src: PartialSource, label: string) {
    setPartialMsg(null);
    setRunningSource(src);
    startTransition(async () => {
      try {
        const r = await runPartialSync(src);
        setPartialMsg(
          r.ok ? `${label} · ${r.detail}` : `${label} · Error: ${r.detail}`,
        );
      } catch (e) {
        setPartialMsg(
          `${label} · Error: ${e instanceof Error ? e.message : e}`,
        );
      } finally {
        setRunningSource(null);
      }
    });
  }

  // Evita desajustes de hidratación en textos con hora relativa.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const lastRel = mounted ? relTime(lastSuccessISO) : "…";
  const nextRel = mounted ? nextRunLabel() : "…";

  function sync() {
    setSyncMsg(null);
    startTransition(async () => {
      try {
        const r = await runAllSync();
        setSyncMsg(
          r.ok
            ? `Sincronizado · ${r.rowsUpserted} registros actualizados`
            : `Con errores · ${r.error ?? "revisa el estado"}`,
        );
      } catch (e) {
        setSyncMsg(`Error · ${e instanceof Error ? e.message : e}`);
      }
    });
  }

  return (
    <div className="portal-reveal space-y-6">
      {/* Pestañas */}
      <div className="bg-muted inline-flex gap-1 rounded-full p-1">
        {(
          [
            ["estado", "Estado"],
            ["historial", "Historial"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === key
                ? "bg-card text-brand-accent shadow-[var(--shadow-sm)]"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "estado" && (
        <div className="space-y-4">
          <div>
            <span className="text-brand-accent bg-accent mb-3.5 inline-flex items-center gap-2 rounded-full px-3 py-[5px] text-[11.5px] font-bold tracking-[0.08em] uppercase">
              <IconLock width={13} height={13} />
              Panel interno · solo equipo Kairos
            </span>
            <h1 className="text-foreground text-[28px] leading-[1.1] font-extrabold tracking-tight">
              Sincronización de datos.
            </h1>
            <p className="text-muted-foreground mt-1.5 max-w-[60ch] text-[15px] leading-relaxed">
              Estado de la lectura de datos desde el espacio de trabajo. El
              cliente no ve esta pantalla — aquí controlas la sincronización y
              puedes previsualizar el portal tal como lo ve cada cliente con
              membresía.
            </p>
          </div>

          {/* Tarjeta de estado + sincronizar */}
          <div className="border-border bg-card flex flex-wrap items-center gap-4 rounded-[20px] border p-[22px] shadow-[var(--shadow-sm)]">
            <span
              className={`flex size-[46px] shrink-0 items-center justify-center rounded-full ${
                statusOk ? "bg-success" : "bg-warning"
              }`}
            >
              <span
                className={`size-3 rounded-full ${
                  statusOk ? "bg-success-foreground" : "bg-warning-foreground"
                }`}
              />
            </span>
            <div className="min-w-[180px] flex-1">
              <div className="text-foreground text-[17px] font-bold tracking-tight">
                {statusOk ? "Todo sincronizado" : "Error de sincronización"}
              </div>
              <div className="text-muted-foreground mt-0.5 text-[13.5px]">
                Última lectura {lastRel} · próxima {nextRel} · {totalRecords}{" "}
                registros
              </div>
            </div>
            <button
              type="button"
              onClick={sync}
              disabled={pending}
              className="bg-brand text-brand-foreground flex h-11 shrink-0 items-center gap-2.5 rounded-[14px] px-5 text-sm font-semibold shadow-[var(--shadow-md)] transition-opacity hover:opacity-90 disabled:opacity-60"
            >
              <IconRefresh className={pending ? "kp-spin" : ""} />
              {pending ? "Sincronizando…" : "Sincronizar ahora"}
            </button>
          </div>

          {syncMsg && (
            <p className="text-muted-foreground -mt-1 font-mono text-xs">
              {syncMsg}
            </p>
          )}

          {/* Sincronización parcial — elegir una sola base de datos */}
          <div>
            <button
              type="button"
              onClick={() => setPartialOpen((v) => !v)}
              className="border-border bg-card text-foreground hover:bg-muted flex w-full items-center gap-2.5 rounded-[14px] border px-4 py-3 text-sm font-semibold shadow-[var(--shadow-sm)] transition-colors"
            >
              <IconRefresh />
              Sincronizar parcialmente
              <span className="text-muted-foreground ml-auto text-xs font-semibold">
                elige la base de datos
              </span>
              <IconChevron open={partialOpen} />
            </button>

            {partialOpen && (
              <div className="mt-3 grid gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(230px,1fr))]">
                {PARTIAL_SOURCES.map((s) => {
                  const busy = runningSource === s.key;
                  return (
                    <button
                      key={s.key}
                      type="button"
                      disabled={pending}
                      onClick={() => syncOne(s.key, s.label)}
                      className="border-border bg-card hover:bg-muted flex items-center gap-3 rounded-2xl border p-3.5 text-left shadow-[var(--shadow-sm)] transition-colors disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <span className="bg-accent text-brand-accent flex size-9 shrink-0 items-center justify-center rounded-xl">
                        <IconRefresh className={busy ? "kp-spin" : ""} />
                      </span>
                      <span className="min-w-0">
                        <span className="text-foreground block text-[14px] font-semibold">
                          {s.label}
                        </span>
                        <span className="text-muted-foreground block text-[12px]">
                          {busy ? "Sincronizando…" : s.hint}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {partialMsg && (
              <p className="text-muted-foreground mt-2.5 font-mono text-xs">
                {partialMsg}
              </p>
            )}
          </div>

          {/* Rejilla de stats */}
          <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(210px,1fr))]">
            <StatCard title="Fuente" value="Activos · Incidencias" />
            <StatCard
              title="Modo"
              value="Programado"
              mono={cronIncidents + " · 03:00"}
            />
            <StatCard title="Estado">
              <span
                className={`inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[13px] font-semibold ${
                  statusOk
                    ? "bg-success text-success-foreground"
                    : "bg-warning text-warning-foreground"
                }`}
              >
                <span
                  className={`size-2 rounded-full ${
                    statusOk ? "bg-success-foreground" : "bg-warning-foreground"
                  }`}
                />
                {statusOk ? "Correcto" : "Error"}
              </span>
            </StatCard>
            <StatCard title="Última sincronización" value={lastRel} />
            <StatCard title="Próxima" value={nextRel} />
            <StatCard title="Registros leídos" valueMono={String(rowsRead)} />
          </div>

          {/* Estado de error */}
          <div>
            <button
              type="button"
              onClick={() => setShowError((v) => !v)}
              className="text-muted-foreground hover:text-foreground hover:bg-muted -ml-3.5 rounded-xl px-3.5 py-2 text-[13.5px] font-medium transition-colors"
            >
              {showError ? "Ocultar estado de error" : "Ver estado de error"}
            </button>
            {showError && (
              <div className="border-border bg-card mt-3 flex items-start gap-4 rounded-[18px] border p-6 shadow-[var(--shadow-sm)]">
                <span
                  className={`flex size-11 shrink-0 items-center justify-center rounded-full ${
                    lastError ? "bg-warning" : "bg-success"
                  }`}
                >
                  <IconAlert width={22} height={22} />
                </span>
                <div className="flex-1">
                  <div className="text-foreground text-base font-semibold">
                    {lastError
                      ? "Hubo un error de lectura"
                      : "Sin errores registrados"}
                  </div>
                  <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                    {lastError ??
                      "Las últimas ejecuciones se completaron correctamente."}
                  </p>
                  {lastError && (
                    <button
                      type="button"
                      onClick={sync}
                      disabled={pending}
                      className="border-border bg-card text-foreground hover:bg-muted mt-3.5 inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-[13.5px] font-medium transition-colors disabled:opacity-60"
                    >
                      <IconRefresh /> Reintentar
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Vista de cliente */}
          <div className="border-border mt-8 border-t pt-8">
            <span className="text-brand-accent mb-2.5 inline-flex items-center gap-2 text-[11.5px] font-bold tracking-[0.08em] uppercase">
              <IconEye />
              Vista de cliente
            </span>
            <h2 className="text-foreground text-xl font-extrabold tracking-tight">
              Ver el portal como un cliente
            </h2>
            <p className="text-muted-foreground mt-1.5 mb-4 max-w-[60ch] text-[14.5px] leading-relaxed">
              Entra en la vista de cualquier cliente con membresía activa para
              revisar exactamente lo que ve. Es solo lectura — no modificas
              ningún dato de su cuenta.
            </p>

            <button
              type="button"
              onClick={() => {
                setClientsOpen((v) => !v);
                setPickedCompany(null);
              }}
              className="border-border bg-card text-foreground hover:bg-muted flex w-full items-center gap-2.5 rounded-[14px] border px-4 py-3 text-sm font-semibold shadow-[var(--shadow-sm)] transition-colors"
            >
              <IconUsers />
              Elegir un cliente
              <span className="text-muted-foreground ml-auto text-xs font-semibold">
                {clients.length} con membresía
              </span>
              <IconChevron open={clientsOpen} />
            </button>

            {clientsOpen && (
              <div className="mt-3">
                {/* Pasos */}
                <div className="text-muted-foreground mb-3 flex items-center gap-2 text-[12px] font-semibold">
                  <span
                    className={
                      !pickedCompany ? "text-brand-accent" : "text-muted-foreground"
                    }
                  >
                    1 · Empresa
                  </span>
                  <IconArrowRight />
                  <span
                    className={
                      pickedCompany ? "text-brand-accent" : "text-muted-foreground/50"
                    }
                  >
                    2 · Contacto
                  </span>
                </div>

                {clients.length === 0 ? (
                  <p className="border-border bg-card text-muted-foreground rounded-2xl border px-4 py-6 text-center text-sm shadow-[var(--shadow-sm)]">
                    No hay clientes con membresía activa todavía.
                  </p>
                ) : !pickedCompany ? (
                  /* FASE 1 — empresa */
                  <div className="flex flex-col gap-2.5">
                    {clients.map((c) => (
                      <button
                        key={c.companyId}
                        type="button"
                        onClick={() => setPickedCompany(c)}
                        className="border-border bg-card hover:bg-muted flex w-full items-center gap-3.5 rounded-2xl border p-3.5 text-left shadow-[var(--shadow-sm)] transition-colors"
                      >
                        {c.logoUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={c.logoUrl}
                            alt={c.companyName}
                            className="border-border bg-card size-10 shrink-0 rounded-full border object-contain p-1"
                          />
                        ) : (
                          <span className="bg-accent text-brand-accent flex size-10 shrink-0 items-center justify-center rounded-full text-[15px] font-bold">
                            {c.companyName.charAt(0).toUpperCase()}
                          </span>
                        )}
                        <div className="min-w-[150px] flex-1">
                          <div className="text-foreground text-[14.5px] font-semibold">
                            {c.companyName}
                          </div>
                          <div className="text-muted-foreground mt-0.5 text-xs">
                            {c.users.length} contacto
                            {c.users.length === 1 ? "" : "s"}
                          </div>
                        </div>
                        <IconArrowRight />
                      </button>
                    ))}
                  </div>
                ) : (
                  /* FASE 2 — contacto */
                  <div>
                    <div className="border-border bg-card mb-3 flex items-center gap-3 rounded-2xl border p-3.5 shadow-[var(--shadow-sm)]">
                      <button
                        type="button"
                        onClick={() => setPickedCompany(null)}
                        className="border-border text-muted-foreground hover:bg-muted hover:text-foreground flex size-9 shrink-0 items-center justify-center rounded-xl border transition-colors"
                        aria-label="Volver a empresas"
                      >
                        <span className="rotate-180">
                          <IconArrowRight />
                        </span>
                      </button>
                      {pickedCompany.logoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={pickedCompany.logoUrl}
                          alt={pickedCompany.companyName}
                          className="border-border bg-card size-9 shrink-0 rounded-full border object-contain p-1"
                        />
                      ) : (
                        <span className="bg-accent text-brand-accent flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold">
                          {pickedCompany.companyName.charAt(0).toUpperCase()}
                        </span>
                      )}
                      <div className="text-foreground text-[14.5px] font-semibold">
                        {pickedCompany.companyName}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2.5">
                      {pickedCompany.users.length === 0 ? (
                        <p className="border-border bg-card text-muted-foreground rounded-2xl border px-4 py-6 text-center text-sm shadow-[var(--shadow-sm)]">
                          Esta empresa no tiene contactos con acceso.
                        </p>
                      ) : (
                        pickedCompany.users.map((u) => (
                          <div
                            key={u.id}
                            className="border-border bg-card flex flex-wrap items-center gap-3.5 rounded-2xl border p-3.5 shadow-[var(--shadow-sm)]"
                          >
                            <span className="bg-accent text-brand-accent flex size-10 shrink-0 items-center justify-center rounded-full text-[15px] font-bold">
                              {(u.name.charAt(0) || "?").toUpperCase()}
                            </span>
                            <div className="min-w-[150px] flex-1">
                              <div className="text-foreground flex items-center gap-2 text-[14.5px] font-semibold">
                                {u.name}
                                {u.billing && (
                                  <span className="bg-accent text-brand-accent rounded-full px-2 py-0.5 text-[10px] font-bold tracking-[0.06em] uppercase">
                                    Facturación
                                  </span>
                                )}
                              </div>
                              <div className="text-muted-foreground mt-0.5 font-mono text-xs">
                                {u.email}
                              </div>
                            </div>
                            <form
                              action={viewAsClient.bind(
                                null,
                                pickedCompany.companyId,
                                u.id,
                              )}
                            >
                              <button
                                type="submit"
                                className="border-border bg-card text-foreground hover:bg-muted inline-flex shrink-0 items-center gap-2 rounded-xl border px-4 py-2 text-[13.5px] font-semibold transition-colors"
                              >
                                Ver como este contacto
                                <IconArrowRight />
                              </button>
                            </form>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "historial" && (
        <div className="space-y-4">
          <div>
            <h1 className="text-foreground text-[28px] leading-[1.1] font-extrabold tracking-tight">
              Historial de sincronizaciones.
            </h1>
            <p className="text-muted-foreground mt-1.5 max-w-[60ch] text-[15px] leading-relaxed">
              Últimas {runs.length} ejecuciones registradas — fuente, modo,
              resultado y registros leídos/escritos.
            </p>
          </div>
          <div className="border-border bg-card overflow-x-auto rounded-[18px] border shadow-[var(--shadow-sm)]">
            <table className="w-full min-w-[640px] border-collapse text-left text-sm">
              <thead>
                <tr>
                  {["Fuente", "Modo", "Estado", "Leídos", "Escritos", "Cuándo"].map(
                    (h) => (
                      <th
                        key={h}
                        className="text-muted-foreground px-[18px] py-3.5 text-[11px] font-semibold tracking-[0.06em] uppercase"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {runs.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="text-muted-foreground px-5 py-10 text-center"
                    >
                      Sin ejecuciones registradas todavía.
                    </td>
                  </tr>
                ) : (
                  runs.map((r) => (
                    <tr
                      key={r.id}
                      className="border-border/60 border-t"
                    >
                      <td className="text-foreground px-[18px] py-3 font-medium">
                        {SOURCE_LABEL[r.source] ?? r.source}
                      </td>
                      <td className="text-muted-foreground px-[18px] py-3">
                        {MODE_LABEL[r.mode] ?? r.mode}
                      </td>
                      <td className="px-[18px] py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 text-[13px] font-semibold ${
                            r.status === "error"
                              ? "text-danger-foreground"
                              : r.status === "success"
                                ? "text-success-foreground"
                                : "text-muted-foreground"
                          }`}
                        >
                          {STATUS_LABEL[r.status] ?? r.status}
                        </span>
                      </td>
                      <td className="text-foreground px-[18px] py-3 font-mono tabular-nums">
                        {r.rows_read ?? "—"}
                      </td>
                      <td className="text-foreground px-[18px] py-3 font-mono tabular-nums">
                        {r.rows_upserted ?? "—"}
                      </td>
                      <td className="text-muted-foreground px-[18px] py-3 font-mono whitespace-nowrap">
                        {mounted ? absTime(r.started_at) : "…"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  title,
  value,
  valueMono,
  mono,
  children,
}: {
  title: string;
  value?: string;
  valueMono?: string;
  mono?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="border-border bg-card rounded-[18px] border p-5 shadow-[var(--shadow-sm)]">
      <div className="text-muted-foreground mb-2 text-[11.5px] font-semibold tracking-[0.08em] uppercase">
        {title}
      </div>
      {children ??
        (valueMono ? (
          <div className="text-foreground font-mono text-[15px] font-semibold">
            {valueMono}
          </div>
        ) : (
          <div className="text-foreground text-[15px] font-semibold">
            {value}
            {mono && (
              <span className="text-muted-foreground ml-1.5 font-mono text-xs font-normal">
                {mono}
              </span>
            )}
          </div>
        ))}
    </div>
  );
}
