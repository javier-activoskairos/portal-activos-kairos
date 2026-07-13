"use client";

import { useMemo, useState } from "react";
import { StatusBadge } from "@/components/status-badge";
import { IconArrow, IconArrowLeft, IconCheck } from "@/components/icons";
import {
  assetBadge,
  assetStatusLabel,
  formatDateShort,
  formatProgress,
  priorityBadge,
  priorityLabel,
  type BadgeSpec,
} from "@/lib/status";
import { cn } from "@/lib/utils";

export interface AssetTask {
  name: string;
  state: "todo" | "doing" | "done";
}

export interface AssetRow {
  id: string;
  name: string;
  status: string;
  desired_result: string | null;
  progress: string | null;
  priority: string | null;
  planned_at: string | null;
  started_at: string | null;
  ended_at: string | null;
  due_at: string | null;
  asset_url: string | null;
  tasks: AssetTask[] | null;
}

// Estados de tarea del diseño → etiqueta + color del punto del checklist.
const TASK_LABEL: Record<AssetTask["state"], string> = {
  done: "Hecho",
  doing: "En curso",
  todo: "Pendiente",
};
const TASK_RING: Record<AssetTask["state"], string> = {
  done: "var(--success-foreground)",
  doing: "var(--brand)",
  todo: "var(--muted-foreground)",
};

interface Derived {
  statusLabel: string;
  badge: BadgeSpec;
  pct: number;
  width: string;
  pctLabel: string;
  pctColor: string;
  barColor: string;
  tintBase: string;
  deliver: string;
  plazo: string;
}

// Deriva presentación (badge, barra, %, plazo) a partir del estado real,
// replicando `mkAsset` del diseño de referencia.
function derive(a: AssetRow): Derived {
  const pct = formatProgress(a.progress);
  const done = a.status === "Terminado";
  const prop = a.status === "Por Empezar";
  const muted = !done && !prop && pct < 10;

  const tintBase = done
    ? "var(--success-foreground)"
    : prop
      ? "var(--warning-foreground)"
      : "var(--info-foreground)";

  const deliver = done
    ? a.ended_at
      ? `Entregado · ${formatDateShort(a.ended_at)}`
      : "Entregado"
    : prop
      ? "Propuesto · pendiente de inicio"
      : a.due_at
        ? `Entrega estimada · ${formatDateShort(a.due_at)}`
        : "Entrega por definir";

  const plazo = prop
    ? a.planned_at
      ? formatDateShort(a.planned_at)
      : "Por definir"
    : done
      ? a.ended_at
        ? formatDateShort(a.ended_at)
        : a.due_at
          ? formatDateShort(a.due_at)
          : "—"
      : a.due_at
        ? formatDateShort(a.due_at)
        : "Por definir";

  return {
    statusLabel: assetStatusLabel(a.status),
    badge: assetBadge(a.status),
    pct,
    width: `${pct}%`,
    pctLabel: done
      ? "100 %"
      : prop
        ? "Por empezar"
        : muted
          ? "Recién iniciado"
          : `${pct} %`,
    pctColor:
      prop || muted
        ? "text-muted-foreground"
        : done
          ? "text-success-foreground"
          : "text-brand-accent",
    barColor: done
      ? "var(--success-foreground)"
      : prop
        ? "var(--border)"
        : muted
          ? "#f8b058"
          : "var(--brand)",
    tintBase,
    deliver,
    plazo,
  };
}

/** Tarjeta de galería ("En proceso"). Clicable → abre el detalle. */
function AssetCard({ a, onOpen }: { a: AssetRow; onOpen: () => void }) {
  const d = derive(a);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex flex-col rounded-[20px] border px-[22px] py-5 text-left shadow-[var(--shadow-sm)] transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-md)] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
      style={{
        background: `color-mix(in srgb, ${d.tintBase} 6%, var(--card))`,
        borderColor: `color-mix(in srgb, ${d.tintBase} 32%, transparent)`,
      }}
    >
      <div className="mb-3.5 flex items-start justify-between gap-3">
        <span className="text-foreground text-base leading-snug font-semibold tracking-tight">
          {a.name}
        </span>
        <StatusBadge label={d.statusLabel} spec={d.badge} />
      </div>
      <div className="mb-4">
        <StatusBadge
          label={`Prioridad ${priorityLabel(a.priority)}`}
          spec={priorityBadge(a.priority)}
        />
      </div>
      <div className="mt-auto">
        <div className="mb-[7px] flex items-center justify-between gap-3">
          <span className="text-muted-foreground text-xs">{d.deliver}</span>
          <span
            className={cn(
              "font-mono text-xs font-semibold whitespace-nowrap",
              d.pctColor,
            )}
          >
            {d.pctLabel}
          </span>
        </div>
        <div className="bg-muted h-[7px] overflow-hidden rounded-full">
          <div
            className="h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none"
            style={{ width: d.width, background: d.barColor }}
          />
        </div>
      </div>
    </button>
  );
}

/** Tabla de activos (Propuestos / Implementados). Filas clicables → detalle. */
function AssetTable({
  rows,
  onOpen,
  showPlazo = true,
}: {
  rows: AssetRow[];
  onOpen: (id: string) => void;
  showPlazo?: boolean;
}) {
  return (
    <div className="border-border bg-card overflow-x-auto rounded-[18px] border shadow-[var(--shadow-sm)]">
      <table className="w-full min-w-[520px] border-collapse">
        <thead>
          <tr>
            <th className="text-muted-foreground px-[18px] py-3.5 text-left text-[11px] font-semibold tracking-[0.06em] uppercase">
              Estado
            </th>
            <th className="text-muted-foreground px-[18px] py-3.5 text-left text-[11px] font-semibold tracking-[0.06em] uppercase">
              Activo
            </th>
            <th className="text-muted-foreground px-[18px] py-3.5 text-left text-[11px] font-semibold tracking-[0.06em] uppercase">
              Prioridad
            </th>
            {showPlazo && (
              <th className="text-muted-foreground px-[18px] py-3.5 text-left text-[11px] font-semibold tracking-[0.06em] uppercase">
                Plazo
              </th>
            )}
            <th className="w-11 px-[18px] py-3.5" />
          </tr>
        </thead>
        <tbody>
          {rows.map((a) => {
            const d = derive(a);
            return (
              <tr
                key={a.id}
                onClick={() => onOpen(a.id)}
                className="border-border/60 hover:bg-muted/40 cursor-pointer border-t transition-colors"
              >
                <td className="px-[18px] py-4 align-middle">
                  <StatusBadge label={d.statusLabel} spec={d.badge} />
                </td>
                <td className="text-foreground px-[18px] py-4 align-middle text-sm font-semibold">
                  {a.name}
                </td>
                <td className="px-[18px] py-4 align-middle">
                  <StatusBadge
                    label={priorityLabel(a.priority)}
                    spec={priorityBadge(a.priority)}
                  />
                </td>
                {showPlazo && (
                  <td className="text-muted-foreground px-[18px] py-4 align-middle text-sm whitespace-nowrap">
                    {d.plazo}
                  </td>
                )}
                <td className="text-muted-foreground px-[18px] py-4 align-middle">
                  <IconArrow width={16} height={16} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Vista de detalle de un activo (estado + progreso + checklist de tareas). */
function AssetDetail({ a, onBack }: { a: AssetRow; onBack: () => void }) {
  const d = derive(a);
  const isProp = a.status === "Por Empezar";
  const tasks = a.tasks ?? [];
  const doneCount = tasks.filter((t) => t.state === "done").length;

  // Tareas agrupadas por estado y ordenadas por su número ("12. …").
  const numOf = (name: string) => {
    const m = name.match(/^\s*(\d+)[.)]/);
    return m ? parseInt(m[1], 10) : Number.POSITIVE_INFINITY;
  };
  const taskGroups = (["doing", "todo", "done"] as AssetTask["state"][])
    .map((state) => ({
      state,
      items: tasks
        .filter((t) => t.state === state)
        .sort(
          (x, y) =>
            numOf(x.name) - numOf(y.name) || x.name.localeCompare(y.name),
        ),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="portal-reveal space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="text-muted-foreground hover:text-foreground -ml-2 flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[13.5px] font-medium transition-colors"
      >
        <IconArrowLeft width={16} height={16} />
        Volver a Activos
      </button>

      <div className="border-border bg-card rounded-[22px] border p-7 shadow-[var(--shadow-sm)]">
        <p className="text-brand-accent mb-3 text-xs font-semibold tracking-[0.12em] uppercase">
          Activo Kairos
        </p>
        <div className="mb-5">
          <h1 className="text-foreground max-w-[24ch] text-2xl leading-tight font-extrabold tracking-tight">
            {a.name}
          </h1>
        </div>

        <div className="mb-6 grid [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))] gap-4">
          <div>
            <div className="text-muted-foreground mb-2 text-[11.5px] font-semibold tracking-[0.08em] uppercase">
              Estado
            </div>
            <StatusBadge label={d.statusLabel} spec={d.badge} />
          </div>
          <div>
            <div className="text-muted-foreground mb-2 text-[11.5px] font-semibold tracking-[0.08em] uppercase">
              Prioridad
            </div>
            <StatusBadge
              label={priorityLabel(a.priority)}
              spec={priorityBadge(a.priority)}
            />
          </div>
          <div>
            <div className="text-muted-foreground mb-2 text-[11.5px] font-semibold tracking-[0.08em] uppercase">
              Plazo
            </div>
            <div className="text-foreground text-[15px] font-semibold">
              {d.plazo}
            </div>
          </div>
        </div>

        {a.desired_result && (
          <p className="text-muted-foreground mb-6 text-[14.5px] leading-relaxed">
            {a.desired_result}
          </p>
        )}

        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="text-muted-foreground text-[13px]">Progreso</span>
          {!isProp && (
            <span
              className={cn("font-mono text-[13px] font-semibold", d.pctColor)}
            >
              {d.pctLabel}
            </span>
          )}
        </div>
        <div className="bg-muted h-2.5 overflow-hidden rounded-full">
          <div
            className="h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none"
            style={{ width: d.width, background: d.barColor }}
          />
        </div>
      </div>

      <div className="border-border bg-card rounded-[22px] border p-7 shadow-[var(--shadow-sm)]">
        <div className="mb-5 flex items-center gap-2.5">
          <h2 className="text-foreground text-[17px] font-bold tracking-tight">
            Tareas
          </h2>
          {tasks.length > 0 && (
            <span className="text-success-foreground bg-success rounded-full px-2.5 py-0.5 font-mono text-xs font-semibold">
              {doneCount}/{tasks.length}
            </span>
          )}
        </div>

        {tasks.length === 0 ? (
          <p className="text-muted-foreground text-[14.5px]">
            Sin tareas registradas.
          </p>
        ) : (
          <div className="flex flex-col gap-6">
            {taskGroups.map((g) => (
              <div key={g.state}>
                <div className="mb-1 flex items-center gap-2">
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ background: TASK_RING[g.state] }}
                  />
                  <span className="text-muted-foreground text-[11.5px] font-bold tracking-[0.08em] uppercase">
                    {TASK_LABEL[g.state]}
                  </span>
                  <span className="text-muted-foreground font-mono text-[11.5px] font-semibold">
                    {g.items.length}
                  </span>
                </div>
                <div className="flex flex-col">
                  {g.items.map((t, i) => {
                    const done = t.state === "done";
                    return (
                      <div
                        key={`${t.name}-${i}`}
                        className={cn(
                          "flex items-center gap-3 py-3",
                          i > 0 && "border-border/60 border-t",
                        )}
                      >
                        <span
                          aria-hidden
                          className={cn(
                            "flex size-[18px] shrink-0 items-center justify-center rounded-full",
                            done && "text-white",
                          )}
                          style={
                            done
                              ? { background: TASK_RING.done }
                              : { border: `2px solid ${TASK_RING[t.state]}` }
                          }
                        >
                          {done && <IconCheck width={11} height={11} />}
                        </span>
                        <span
                          className={cn(
                            "text-[14.5px]",
                            done
                              ? "text-muted-foreground line-through"
                              : "text-foreground/90",
                          )}
                        >
                          {t.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function AssetsView({ assets }: { assets: AssetRow[] }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<"propuestos" | "implementados">(
    "propuestos",
  );

  const selected = useMemo(
    () => assets.find((a) => a.id === selectedId) ?? null,
    [assets, selectedId],
  );

  const inProgress = assets.filter((a) => a.status === "En Progreso");
  const propuestos = assets.filter((a) => a.status === "Por Empezar");
  // Implementados ordenados por plazo (entrega) descendente.
  const plazoTime = (a: AssetRow) => {
    const v = a.ended_at ?? a.due_at;
    return v ? new Date(v).getTime() : 0;
  };
  const implementados = assets
    .filter((a) => a.status === "Terminado")
    .sort((a, b) => plazoTime(b) - plazoTime(a));

  if (selected) {
    return <AssetDetail a={selected} onBack={() => setSelectedId(null)} />;
  }

  const tableRows = view === "propuestos" ? propuestos : implementados;
  const viewDefs = [
    {
      key: "propuestos" as const,
      label: "Propuestos",
      count: propuestos.length,
    },
    {
      key: "implementados" as const,
      label: "Implementados",
      count: implementados.length,
    },
  ];

  return (
    <div className="portal-reveal space-y-10">
      <div>
        <p className="text-brand-accent text-[12.5px] font-semibold tracking-[0.14em] uppercase">
          Tus activos
        </p>
        <h1 className="text-foreground mt-2.5 text-[28px] leading-tight font-extrabold tracking-tight">
          Lo que estamos construyendo para ti.
        </h1>
        <p className="text-muted-foreground mt-1.5 max-w-[60ch] text-[15px] leading-relaxed">
          Cada activo es un sistema que se queda contigo. Aquí ves su avance y
          su entrega estimada.
        </p>
      </div>

      {/* En proceso — galería de tarjetas */}
      <section>
        <div className="mb-3.5 flex items-center gap-2.5">
          <h2 className="text-foreground text-[17px] font-bold tracking-tight">
            En proceso
          </h2>
          <span className="text-brand-accent bg-accent rounded-full px-2.5 py-0.5 font-mono text-xs font-semibold">
            {inProgress.length}
          </span>
        </div>
        {inProgress.length === 0 ? (
          <p className="border-border bg-card text-muted-foreground rounded-[20px] border px-5 py-8 text-center text-sm shadow-[var(--shadow-sm)]">
            No hay activos en progreso ahora mismo.
          </p>
        ) : (
          <div className="grid gap-3.5 [grid-template-columns:repeat(auto-fill,minmax(min(100%,300px),1fr))]">
            {inProgress.map((a) => (
              <AssetCard key={a.id} a={a} onOpen={() => setSelectedId(a.id)} />
            ))}
          </div>
        )}
      </section>

      {/* Vistas seleccionables — Propuestos / Implementados */}
      <section>
        <div className="mb-4.5 flex flex-wrap items-center gap-3">
          <div className="bg-muted inline-flex gap-0.5 rounded-full p-1">
            {viewDefs.map((v) => {
              const active = view === v.key;
              return (
                <button
                  key={v.key}
                  type="button"
                  onClick={() => setView(v.key)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[13.5px] font-medium transition-all",
                    active
                      ? "bg-card text-foreground shadow-[var(--shadow-sm)]"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {v.label}
                  <span
                    className={cn(
                      "font-mono text-[11.5px] font-semibold",
                      active ? "text-brand-accent" : "text-muted-foreground",
                    )}
                  >
                    {v.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {tableRows.length > 0 ? (
          <AssetTable
            rows={tableRows}
            onOpen={setSelectedId}
            showPlazo={view === "implementados"}
          />
        ) : (
          <div className="border-border bg-card rounded-[20px] border px-6 py-10 text-center shadow-[var(--shadow-sm)]">
            <div className="text-foreground text-[15px] font-semibold">
              Nada por aquí todavía
            </div>
            <div className="text-muted-foreground mt-1 text-sm">
              Aún no hay activos en esta vista.
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
