"use client";

import { useMemo, useState } from "react";
import { StatusBadge } from "@/components/status-badge";
import {
  IconArrowLeft,
  IconCheck,
  IconExternal,
  IconFile,
  IconRefresh,
} from "@/components/icons";
import { Input } from "@/components/ui/input";
import { ReopenIncidentModal } from "@/components/reopen-incident-modal";
import { VerifyIncidentModal } from "@/components/verify-incident-modal";
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
  response_url: string | null;
  created_at: string | null;
  created_by: string | null;
  attachments: { name: string; url: string }[] | null;
  resolved_at: string | null;
  sla_deadline: string | null;
}

// Grupos por Estado de Notion.
const OPEN = new Set(["Pendiente", "Solucionando", "En Espera", "Escalada"]);
const VERIFY = new Set(["Verificación"]);
const RESOLVED = new Set(["Solucionada", "Solucionada con Acciones Pendientes"]);

const isOpen = (i: IncidentRow) => OPEN.has(i.status);
const isVerify = (i: IncidentRow) => VERIFY.has(i.status);
const isResolved = (i: IncidentRow) => RESOLVED.has(i.status);

function isImageUrl(url: string) {
  return /\.(png|jpe?g|webp|gif|svg|avif)(\?|$)/i.test(url);
}

/** Panel de detalle con los campos reales de la incidencia. */
function IncidentDetail({
  incident,
  onBack,
  onReopen,
  onVerify,
}: {
  incident: IncidentRow;
  onBack: () => void;
  onReopen: () => void;
  onVerify: () => void;
}) {
  const badge = incidentBadge(incident.status);
  const label = labelBadge(incident.label);
  const attachments = incident.attachments ?? [];
  const verify = isVerify(incident);
  const canReopen = verify || isResolved(incident);
  return (
    <div className="portal-reveal space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground -ml-2 flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[13.5px] font-medium transition-colors"
        >
          <IconArrowLeft width={16} height={16} />
          Volver a Incidencias
        </button>
        <div className="flex flex-wrap gap-2">
          {verify && (
            <button
              type="button"
              onClick={onVerify}
              className="bg-brand text-brand-foreground flex items-center gap-2 rounded-xl px-4 py-2 text-[13.5px] font-semibold shadow-[var(--shadow-sm)] transition-opacity hover:opacity-90"
            >
              <IconCheck width={15} height={15} />
              Verificar
            </button>
          )}
          {canReopen && (
            <button
              type="button"
              onClick={onReopen}
              className="border-border bg-card text-foreground hover:bg-muted flex items-center gap-2 rounded-xl border px-4 py-2 text-[13.5px] font-semibold transition-colors"
            >
              <IconRefresh width={15} height={15} />
              Reabrir
            </button>
          )}
        </div>
      </div>

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
        <div className="grid gap-4 sm:grid-cols-3">
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
              Creado por
            </div>
            <div className="text-foreground text-[15px] font-semibold">
              {incident.created_by || "—"}
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
          {incident.response_url && (
            <a
              href={incident.response_url}
              target="_blank"
              rel="noopener noreferrer"
              className="border-border bg-card text-foreground hover:bg-muted mt-3 inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-[13px] font-semibold transition-colors"
            >
              <IconExternal width={15} height={15} />
              Ver video asociado
            </a>
          )}
        </div>
        <div className="border-border/60 border-t pt-5">
          <div className="text-muted-foreground mb-2.5 text-[11.5px] font-semibold tracking-[0.08em] uppercase">
            Archivos
          </div>
          {attachments.length === 0 ? (
            <div className="text-muted-foreground text-[14.5px]">
              Sin archivo adjunto
            </div>
          ) : (
            <div className="flex flex-wrap gap-2.5">
              {attachments.map((f, i) =>
                isImageUrl(f.url) ? (
                  <a
                    key={i}
                    href={f.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={f.name}
                    className="border-border bg-muted block overflow-hidden rounded-xl border transition-opacity hover:opacity-90"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={f.url}
                      alt={f.name}
                      className="h-[86px] w-[86px] object-cover"
                    />
                  </a>
                ) : (
                  <a
                    key={i}
                    href={f.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="border-border bg-muted hover:bg-card flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 transition-colors"
                  >
                    <span className="bg-accent text-brand-accent flex size-8 shrink-0 items-center justify-center rounded-lg">
                      <IconFile width={16} height={16} />
                    </span>
                    <span className="text-foreground max-w-[22ch] truncate text-[13.5px] font-semibold">
                      {f.name}
                    </span>
                  </a>
                ),
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function IncidentsView({ incidents }: { incidents: IncidentRow[] }) {
  const [query, setQuery] = useState("");
  const [topView, setTopView] = useState<"abiertas" | "verificar">("abiertas");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reopenId, setReopenId] = useState<string | null>(null);
  const [verifyId, setVerifyId] = useState<string | null>(null);

  const byId = (id: string | null) =>
    id ? (incidents.find((i) => i.id === id) ?? null) : null;
  const selected = byId(selectedId);
  const reopenInc = byId(reopenId);
  const verifyInc = byId(verifyId);

  const match = (i: IncidentRow) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      i.title.toLowerCase().includes(q) ||
      (i.response ?? "").toLowerCase().includes(q) ||
      (i.label ?? "").toLowerCase().includes(q)
    );
  };

  const abiertas = useMemo(
    () => incidents.filter((i) => isOpen(i) && match(i)),
    [incidents, query],
  );
  const porVerificar = useMemo(
    () => incidents.filter((i) => isVerify(i) && match(i)),
    [incidents, query],
  );
  const resueltas = useMemo(
    () => incidents.filter((i) => isResolved(i) && match(i)),
    [incidents, query],
  );

  const modals = (
    <>
      {reopenInc && (
        <ReopenIncidentModal
          open
          incidentId={reopenInc.id}
          incidentTitle={reopenInc.title}
          onClose={() => setReopenId(null)}
        />
      )}
      {verifyInc && (
        <VerifyIncidentModal
          open
          incidentId={verifyInc.id}
          incidentTitle={verifyInc.title}
          onClose={() => setVerifyId(null)}
        />
      )}
    </>
  );

  if (selected) {
    return (
      <>
        <IncidentDetail
          incident={selected}
          onBack={() => setSelectedId(null)}
          onReopen={() => setReopenId(selected.id)}
          onVerify={() => setVerifyId(selected.id)}
        />
        {modals}
      </>
    );
  }

  return (
    <div className="space-y-8">
      {/* Búsqueda */}
      <div className="flex justify-end">
        <Input
          placeholder="Buscar incidencia…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-11 rounded-[14px] sm:max-w-xs"
        />
      </div>

      {/* Bloque superior: Abiertas / Por verificar */}
      <section>
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="bg-muted flex gap-1 rounded-full p-1">
            {(
              [
                { key: "abiertas", label: "Abiertas", n: abiertas.length },
                { key: "verificar", label: "Por verificar", n: porVerificar.length },
              ] as const
            ).map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTopView(t.key)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                  topView === t.key
                    ? "bg-card text-brand-accent shadow-[var(--shadow-sm)]"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t.label}
                <span className="font-mono text-xs opacity-70">{t.n}</span>
              </button>
            ))}
          </div>
        </div>

        {topView === "abiertas" ? (
          abiertas.length === 0 ? (
            <EmptyCard
              title="Sin incidencias abiertas"
              sub="Todo está funcionando con normalidad."
            />
          ) : (
            <div className="grid gap-3.5 min-[1100px]:grid-cols-4 min-[760px]:grid-cols-2 min-[900px]:grid-cols-3">
              {abiertas.map((i) => (
                <IncidentCard key={i.id} i={i} onOpen={() => setSelectedId(i.id)} />
              ))}
            </div>
          )
        ) : porVerificar.length === 0 ? (
          <EmptyCard
            title="Nada por verificar"
            sub="Cuando resolvamos algo, aquí podrás verificarlo y valorarlo."
          />
        ) : (
          <div className="grid gap-3.5 min-[1100px]:grid-cols-4 min-[760px]:grid-cols-2 min-[900px]:grid-cols-3">
            {porVerificar.map((i) => (
              <div
                key={i.id}
                className="border-border bg-card flex flex-col rounded-[20px] border p-[18px] shadow-[var(--shadow-sm)]"
              >
                <button
                  type="button"
                  onClick={() => setSelectedId(i.id)}
                  className="mb-3 text-left"
                >
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <span className="text-foreground text-[14.5px] font-semibold tracking-tight">
                      {i.title}
                    </span>
                    <StatusBadge label={i.status} spec={incidentBadge(i.status)} />
                  </div>
                  <div className="text-muted-foreground text-[12px]">
                    {formatDate(i.created_at)}
                    {i.label ? ` · ${i.label}` : ""}
                  </div>
                </button>
                <div className="mt-auto flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setVerifyId(i.id)}
                    className="bg-brand text-brand-foreground flex flex-1 items-center justify-center gap-1.5 rounded-[11px] px-3 py-2 text-[12.5px] font-semibold transition-opacity hover:opacity-90"
                  >
                    <IconCheck width={14} height={14} /> Verificar
                  </button>
                  <button
                    type="button"
                    onClick={() => setReopenId(i.id)}
                    className="border-border bg-card text-foreground hover:bg-muted flex flex-1 items-center justify-center gap-1.5 rounded-[11px] border px-3 py-2 text-[12.5px] font-semibold transition-colors"
                  >
                    <IconRefresh width={14} height={14} /> Reabrir
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Bloque inferior: Resueltas */}
      <section>
        <div className="mb-3.5 flex items-center gap-2.5">
          <h2 className="text-foreground text-[17px] font-bold tracking-tight">
            Resueltas
          </h2>
          <span className="text-success-foreground bg-success rounded-full px-2.5 py-0.5 font-mono text-xs font-semibold">
            {resueltas.length}
          </span>
        </div>
        {resueltas.length === 0 ? (
          <p className="border-border bg-card text-muted-foreground rounded-[20px] border px-5 py-8 text-center text-sm shadow-[var(--shadow-sm)]">
            No hay incidencias resueltas que coincidan.
          </p>
        ) : (
          <div className="border-border bg-card overflow-x-auto rounded-[18px] border shadow-[var(--shadow-sm)]">
            <table className="w-full min-w-[600px] border-collapse">
              <thead>
                <tr>
                  {["Estado", "Incidencia", "Tipo", "Resuelto"].map((h) => (
                    <th
                      key={h}
                      className="text-muted-foreground px-[18px] py-3.5 text-left text-[11px] font-semibold tracking-[0.06em] uppercase"
                    >
                      {h}
                    </th>
                  ))}
                  <th className="text-muted-foreground px-[18px] py-3.5 text-right text-[11px] font-semibold tracking-[0.06em] uppercase">
                    Respuesta
                  </th>
                </tr>
              </thead>
              <tbody>
                {resueltas.map((i) => (
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
                    <td className="px-[18px] py-4 text-right align-middle whitespace-nowrap">
                      {i.response_url ? (
                        <a
                          href={i.response_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="border-border bg-card text-foreground hover:bg-muted inline-flex items-center gap-1.5 rounded-[10px] border px-2.5 py-1.5 text-[12.5px] font-medium transition-colors"
                        >
                          <IconExternal width={13} height={13} />
                          Ver
                        </a>
                      ) : (
                        <span className="text-muted-foreground/50 text-sm">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {modals}
    </div>
  );
}

function EmptyCard({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="border-border bg-card rounded-[20px] border px-6 py-8 text-center shadow-[var(--shadow-sm)]">
      <div className="text-foreground text-[15px] font-semibold">{title}</div>
      <div className="text-muted-foreground mt-1 text-sm">{sub}</div>
    </div>
  );
}

function IncidentCard({
  i,
  onOpen,
}: {
  i: IncidentRow;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="border-border bg-card flex flex-col rounded-[20px] border p-[18px] text-left shadow-[var(--shadow-sm)] transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-md)]"
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <span className="text-foreground text-[14.5px] font-semibold tracking-tight">
          {i.title}
        </span>
        <StatusBadge label={i.status} spec={incidentBadge(i.status)} />
      </div>
      <div className="text-muted-foreground mt-auto text-[12px]">
        {formatDate(i.created_at)}
        {i.label ? ` · ${i.label}` : ""}
      </div>
    </button>
  );
}
