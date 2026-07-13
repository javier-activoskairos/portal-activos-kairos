"use client";

import { useState } from "react";
import { niceScale, fmtHoras } from "@/lib/charts";
import { cn } from "@/lib/utils";

export interface ChartSeries {
  key: string;
  label: string;
  /** Clase Tailwind del color de barra (p. ej. "bg-brand"). */
  barClass: string;
  /** Clase Tailwind del punto en leyenda/popover. */
  dotClass: string;
}

export interface ChartMonth {
  label: string;
  data: Record<
    string,
    {
      /** Valor que aporta a la barra y al total (recuento u horas). */
      value: number;
      /** Recuento mostrado en el popover. */
      count: number;
      /** Texto a la derecha en el popover (p. ej. "3 · 2,25 h"). Si falta, se usa count. */
      valueLabel?: string;
      /** Lista de títulos a mostrar bajo la fila (incidencias). */
      items?: string[];
    }
  >;
}

/**
 * Gráfico de barras apiladas por mes con leyenda CLICABLE: cada serie se puede
 * activar/desactivar para filtrar la vista. Eje Y auto-escalado y popover por
 * barra con el desglose de las series visibles.
 */
export function LegendBarChart({
  title,
  series,
  months,
  unit,
  popoverSuffix = "",
  wave = false,
}: {
  title: string;
  series: ChartSeries[];
  months: ChartMonth[];
  unit?: "h";
  popoverSuffix?: string;
  wave?: boolean;
}) {
  const [active, setActive] = useState<Set<string>>(
    () => new Set(series.map((s) => s.key)),
  );
  const toggle = (key: string) =>
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const activeSeries = series.filter((s) => active.has(s.key));
  const totalOf = (m: ChartMonth) =>
    activeSeries.reduce((sum, s) => sum + (m.data[s.key]?.value ?? 0), 0);
  const scale = niceScale(Math.max(...months.map(totalOf)));
  const fmtTotal = (v: number) => (unit === "h" ? `${fmtHoras(v)} h` : `${v}`);

  return (
    <section className="border-border bg-card relative overflow-hidden rounded-[22px] border p-6 shadow-[var(--shadow-sm)]">
      {wave && (
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
      )}
      <div className="relative z-[1]">
        <h2 className="text-foreground text-base font-bold tracking-tight">
          {title}
        </h2>
        {/* Leyenda clicable — filtra series */}
        <div className="mt-2 mb-4 flex flex-wrap gap-x-4 gap-y-2">
          {series.map((s) => {
            const on = active.has(s.key);
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => toggle(s.key)}
                aria-pressed={on}
                className={cn(
                  "flex items-center gap-1.5 text-[12.5px] transition-opacity",
                  on
                    ? "text-muted-foreground"
                    : "text-muted-foreground/50 line-through",
                )}
              >
                <span
                  className={cn(
                    "size-[9px] rounded-[3px]",
                    s.dotClass,
                    !on && "opacity-40",
                  )}
                />
                {s.label}
              </button>
            );
          })}
        </div>

        <div className="flex h-[132px] items-stretch gap-2.5 px-0.5">
          {/* Eje Y */}
          <div className="flex flex-col">
            <div className="flex flex-1 flex-col items-end justify-between">
              {scale.ticks.map((t) => (
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

          {months.map((m, i) => {
            const total = totalOf(m);
            return (
              <div
                key={i}
                className="group relative flex h-full flex-1 flex-col items-center gap-2"
              >
                <div className="flex w-full flex-1 items-end justify-center">
                  <div
                    className="flex w-[68%] max-w-[34px] flex-col overflow-hidden rounded-t-md transition-[filter] group-hover:brightness-110"
                    style={{
                      height: `${(total / scale.max) * 100}%`,
                      minHeight: total > 0 ? 4 : 0,
                    }}
                  >
                    {/* Apila en orden inverso: la primera serie queda abajo. */}
                    {[...activeSeries].reverse().map((s) => {
                      const v = m.data[s.key]?.value ?? 0;
                      if (v <= 0) return null;
                      return (
                        <div
                          key={s.key}
                          className={s.barClass}
                          style={{ height: `${(v / total) * 100}%` }}
                        />
                      );
                    })}
                  </div>
                </div>
                <span className="text-muted-foreground text-[11.5px]">
                  {m.label}
                </span>
                {total > 0 && (
                  <div className="border-border bg-card pointer-events-none absolute bottom-[calc(100%+10px)] left-1/2 z-20 w-max max-w-[250px] -translate-x-1/2 translate-y-1 rounded-2xl border p-3.5 opacity-0 shadow-[var(--shadow-md)] transition-all group-hover:translate-y-0 group-hover:opacity-100">
                    <div className="mb-2 flex items-baseline justify-between gap-3">
                      <span className="text-muted-foreground text-[11px] font-bold tracking-[0.06em] uppercase">
                        {m.label}
                        {popoverSuffix ? ` · ${popoverSuffix}` : ""}
                      </span>
                      <span className="text-brand-accent font-mono text-xs font-bold">
                        {fmtTotal(total)}
                      </span>
                    </div>
                    <div className="flex flex-col gap-2.5">
                      {activeSeries.map((s) => {
                        const d = m.data[s.key];
                        if (!d || d.value <= 0) return null;
                        return (
                          <div key={s.key}>
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  "size-2 shrink-0 rounded-full",
                                  s.dotClass,
                                )}
                              />
                              <span className="text-foreground text-[12px] font-semibold">
                                {s.label}
                              </span>
                              <span className="text-muted-foreground ml-auto font-mono text-[11.5px]">
                                {d.valueLabel ?? d.count}
                              </span>
                            </div>
                            {d.items && d.items.length > 0 && (
                              <ul className="mt-0.5 flex flex-col gap-0.5 pl-4">
                                {d.items.map((t, j) => (
                                  <li
                                    key={j}
                                    className="text-foreground/90 text-[12px]"
                                  >
                                    {t}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
