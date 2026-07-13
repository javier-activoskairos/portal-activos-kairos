"use client";

import { useMemo, useState } from "react";
import { StatusBadge } from "@/components/status-badge";
import { IconArrowLeft } from "@/components/icons";
import { Input } from "@/components/ui/input";
import { formatDate, incidentBadge, labelBadge } from "@/lib/status";
import { cn } from "@/lib/utils";

export interface IncidentRow {
  id: string;
  title: string;
  status: string;
  label: string | null;
  source: string | null;
  additional_info: string | null;
  response: string | null;
  error_url: string | null;
  created_at: string | null;
  resolved_at: string | null;
  sla_deadline: string | null;
}

const FILTERS = [
  { key: "todas", label: "Todas" },
  { key: "abiertas", label: "Abiertas" },
  { key: "resueltas", label: "Resueltas" },
];

const OPEN = new Set([
  "Pendiente",
  "Solucionando",
  "En Espera",
  "Escalada",
  "Solucionada con Acciones Pendientes",
]);

function isOpen(i: IncidentRow) {
  return OPEN.has(i.status);
}

/** Panel de detalle con los campos reales de la incidencia. */
function IncidentDetail({
  incident,
  onBack,
}: {
  incident: IncidentRow;
  onBack: () => void;
}) {
  const badge = incidentBadge(incident.status);
  const label = labelBadge(incident.label);
  return (
    <div className="portal-reveal space-y-4">
      <button
        type="button"
        onClick={onBack}
        className="text-muted-foreground hover:text-foreground -ml-2 flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[13.5px] font-medium transition-colors"
      >
        <IconArrowLeft width={16} height={16} />
        Volver a Incidencias
      </button>

      <div className="border-border bg-card rounded-[22px] border p-7 shadow-[var(--shadow-sm)]">
        <p className="text-brand-accent mb-3 text-xs font-semibold tracking-[0.12em] uppercase">
          Incidencia
        </p>
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <h1 className="text-foreground max-w-[26ch] text-2xl leading-tight font-extrabold tracking-tight">
            {incident.title}
          </h1>
          <StatusBadge label={incident.status} spec={badge} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <div className="text-muted-foreground mb-2 text-[11.5px] font-semibold tracking-[0.08em] uppercase">
              Fecha de creación
            </div>
            <div className="text-foreground text-[15px] font-semibold">
              {formatDate(incident.created_at)}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground mb-2 text-[11.5px] font-semibold tracking-[0.08em] uppercase">
              Etiqueta
            </div>
            {incident.label ? (
              <StatusBadge label={incident.label} spec={label} />
            ) : (
              <span className="text-muted-foreground text-[15px]">—</span>
            )}
          </div>
        </div>
      </div>

      <div className="border-border bg-card flex flex-col gap-5 rounded-[22px] border p-7 shadow-[var(--shadow-sm)]">
        <div>
          <div className="text-muted-foreground mb-2 text-[11.5px] font-semibold tracking-[0.08em] uppercase">
            URL del error
          </div>
          {incident.error_url ? (
            <a
              href={incident.error_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-accent font-mono text-[13.5px] break-all hover:underline"
            >
              {incident.error_url}
            </a>
          ) : (
            <div className="text-muted-foreground text-[14.5px]">—</div>
          )}
        </div>
        <div className="border-border/60 border-t pt-5">
          <div className="text-muted-foreground mb-2 text-[11.5px] font-semibold tracking-[0.08em] uppercase">
            Información adicional
          </div>
          <p className="text-foreground/90 text-[14.5px] leading-relaxed">
            {incident.additional_info || "—"}
          </p>
        </div>
        <div className="border-border/60 border-t pt-5">
          <div className="text-muted-foreground mb-2 text-[11.5px] font-semibold tracking-[0.08em] uppercase">
            Respuesta
          </div>
          <p className="text-foreground/90 text-[14.5px] leading-relaxed">
            {incident.response || "Aún sin respuesta."}
          </p>
        </div>
      </div>
    </div>
  );
}

export function IncidentsView({ incidents }: { incidents: IncidentRow[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("todas");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = useMemo(
    () => incidents.find((i) => i.id === selectedId) ?? null,
    [incidents, selectedId],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return incidents.filter((i) => {
      if (filter === "abiertas" && !isOpen(i)) return false;
      if (filter === "resueltas" && isOpen(i)) return false;
      if (!q) return true;
      return (
        i.title.toLowerCase().includes(q) ||
        (i.response ?? "").toLowerCase().includes(q) ||
        (i.label ?? "").toLowerCase().includes(q)
      );
    });
  }, [incidents, query, filter]);

  const open = filtered.filter(isOpen);
  const resolved = filtered.filter((i) => !isOpen(i));

  if (selected) {
    return (
      <IncidentDetail incident={selected} onBack={() => setSelectedId(null)} />
    );
  }

  return (
    <div className="space-y-8">
      {/* Filtros + búsqueda */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="bg-muted flex gap-1 rounded-full p-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                filter === f.key
                  ? "bg-card text-brand-accent shadow-[var(--shadow-sm)]"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <Input
          placeholder="Buscar incidencia…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-11 rounded-[14px] sm:max-w-xs"
        />
      </div>

      {/* Abiertas — grid de tarjetas */}
      <section>
        <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <h2 className="text-foreground text-[17px] font-bold tracking-tight">
              Abiertas
            </h2>
            <span className="text-warning-foreground bg-warning rounded-full px-2.5 py-0.5 font-mono text-xs font-semibold">
              {open.length}
            </span>
          </div>
        </div>
        {open.length === 0 ? (
          <div className="border-border bg-card rounded-[20px] border px-6 py-8 text-center shadow-[var(--shadow-sm)]">
            <div className="text-foreground text-[15px] font-semibold">
              Sin incidencias abiertas
            </div>
            <div className="text-muted-foreground mt-1 text-sm">
              Todo está funcionando con normalidad.
            </div>
          </div>
        ) : (
          <div className="grid gap-3.5 min-[900px]:grid-cols-3 sm:grid-cols-2">
            {open.map((i) => (
              <button
                key={i.id}
                type="button"
                onClick={() => setSelectedId(i.id)}
                className="border-border bg-card flex flex-col rounded-[20px] border p-[22px] text-left shadow-[var(--shadow-sm)] transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-md)]"
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <span className="text-foreground text-[15.5px] font-semibold tracking-tight">
                    {i.title}
                  </span>
                  <StatusBadge
                    label={i.status}
                    spec={incidentBadge(i.status)}
                  />
                </div>
                {i.label && (
                  <div className="mb-3">
                    <StatusBadge label={i.label} spec={labelBadge(i.label)} />
                  </div>
                )}
                <div className="text-muted-foreground mt-auto text-[12.5px]">
                  {formatDate(i.created_at)}
                  {i.label ? ` · ${i.label}` : ""}
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Resueltas — tabla */}
      <section>
        <div className="mb-3.5 flex items-center gap-2.5">
          <h2 className="text-foreground text-[17px] font-bold tracking-tight">
            Resueltas
          </h2>
          <span className="text-success-foreground bg-success rounded-full px-2.5 py-0.5 font-mono text-xs font-semibold">
            {resolved.length}
          </span>
        </div>
        {resolved.length === 0 ? (
          <p className="border-border bg-card text-muted-foreground rounded-[20px] border px-5 py-8 text-center text-sm shadow-[var(--shadow-sm)]">
            No hay incidencias resueltas que coincidan.
          </p>
        ) : (
          <div className="border-border bg-card overflow-x-auto rounded-[18px] border shadow-[var(--shadow-sm)]">
            <table className="w-full min-w-[600px] border-collapse">
              <thead>
                <tr>
                  <th className="text-muted-foreground px-[18px] py-3.5 text-left text-[11px] font-semibold tracking-[0.06em] uppercase">
                    Estado
                  </th>
                  <th className="text-muted-foreground px-[18px] py-3.5 text-left text-[11px] font-semibold tracking-[0.06em] uppercase">
                    Incidencia
                  </th>
                  <th className="text-muted-foreground px-[18px] py-3.5 text-left text-[11px] font-semibold tracking-[0.06em] uppercase">
                    Tipo
                  </th>
                  <th className="text-muted-foreground px-[18px] py-3.5 text-left text-[11px] font-semibold tracking-[0.06em] uppercase">
                    Resuelto
                  </th>
                </tr>
              </thead>
              <tbody>
                {resolved.map((i) => (
                  <tr
                    key={i.id}
                    onClick={() => setSelectedId(i.id)}
                    className="border-border/60 hover:bg-muted/40 cursor-pointer border-t transition-colors"
                  >
                    <td className="px-[18px] py-4 align-middle">
                      <StatusBadge
                        label={i.status}
                        spec={incidentBadge(i.status)}
                      />
                    </td>
                    <td className="text-foreground px-[18px] py-4 align-middle text-sm font-semibold">
                      {i.title}
                    </td>
                    <td className="text-muted-foreground px-[18px] py-4 align-middle text-sm whitespace-nowrap">
                      {i.label ?? "—"}
                    </td>
                    <td className="text-muted-foreground px-[18px] py-4 align-middle text-sm whitespace-nowrap">
                      {formatDate(i.resolved_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
