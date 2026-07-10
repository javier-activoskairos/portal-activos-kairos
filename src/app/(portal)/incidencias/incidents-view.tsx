"use client";

import { useMemo, useState } from "react";
import { StatusBadge } from "@/components/status-badge";
import { Input } from "@/components/ui/input";
import { incidentBadge, formatDate } from "@/lib/status";
import { cn } from "@/lib/utils";

export interface IncidentRow {
  id: string;
  title: string;
  status: string;
  label: string | null;
  source: string | null;
  response: string | null;
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

export function IncidentsView({ incidents }: { incidents: IncidentRow[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("todas");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return incidents.filter((i) => {
      if (filter === "abiertas" && !OPEN.has(i.status)) return false;
      if (filter === "resueltas" && i.status !== "Solucionada") return false;
      if (!q) return true;
      return (
        i.title.toLowerCase().includes(q) ||
        (i.response ?? "").toLowerCase().includes(q) ||
        (i.label ?? "").toLowerCase().includes(q)
      );
    });
  }, [incidents, query, filter]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="bg-muted flex gap-1 rounded-full p-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
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

      {filtered.length === 0 ? (
        <p className="border-border bg-card text-muted-foreground rounded-[20px] border px-5 py-10 text-center text-sm">
          No hay incidencias que coincidan.
        </p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((i) => (
            <li
              key={i.id}
              className="border-border bg-card rounded-2xl border p-5 shadow-[var(--shadow-sm)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-medium">{i.title}</h3>
                  <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                    <span>{formatDate(i.created_at)}</span>
                    {i.label && <span>{i.label}</span>}
                    {i.source && <span>Vía {i.source}</span>}
                  </div>
                </div>
                <StatusBadge label={i.status} spec={incidentBadge(i.status)} />
              </div>
              {i.response && (
                <p className="border-border text-muted-foreground mt-3 border-t pt-3 text-sm">
                  {i.response}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
