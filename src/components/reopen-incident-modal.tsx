"use client";

import { useEffect, useState } from "react";
import { IconCheck, IconClose, IconRefresh } from "@/components/icons";
import { BrandMark } from "@/components/brand-mark";

const MAX_IMAGE_MB = 8;

export function ReopenIncidentModal({
  open,
  incidentId,
  incidentTitle,
  onClose,
}: {
  open: boolean;
  incidentId: string;
  incidentTitle: string;
  onClose: () => void;
}) {
  const [motivo, setMotivo] = useState("");
  const [loom, setLoom] = useState("");
  const [imagen, setImagen] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (!open) {
      setMotivo("");
      setLoom("");
      setImagen(null);
      setLoading(false);
      setError(null);
      setSent(false);
    }
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const valid = motivo.trim().length > 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || loading) return;
    if (imagen && imagen.size > MAX_IMAGE_MB * 1024 * 1024) {
      setError(`La imagen supera el tamaño máximo (${MAX_IMAGE_MB} MB).`);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("incidentId", incidentId);
      form.append("motivo", motivo.trim());
      if (loom.trim()) form.append("loom", loom.trim());
      if (imagen) form.append("imagen", imagen);
      const res = await fetch("/api/incidencias/reabrir", {
        method: "POST",
        body: form,
      });
      if (!res.ok) throw new Error("request failed");
      setSent(true);
    } catch {
      setError(
        "No hemos podido reabrir la incidencia. Inténtalo de nuevo en un momento.",
      );
    } finally {
      setLoading(false);
    }
  };

  const fieldClass =
    "border-border bg-muted/60 text-foreground focus:border-brand/50 w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition-colors";

  return (
    <div
      onClick={onClose}
      className="animate-in fade-in-0 fixed inset-0 z-[100] flex items-center justify-center bg-[rgba(15,12,9,0.55)] p-5 backdrop-blur-[4px] duration-200"
      role="dialog"
      aria-modal="true"
      aria-label="Reabrir incidencia"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="border-border bg-card animate-in fade-in-0 zoom-in-95 relative max-h-[calc(100vh-40px)] w-full max-w-[540px] overflow-y-auto rounded-[22px] border p-[30px] shadow-[var(--shadow-lg)] duration-200"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="border-border bg-card text-muted-foreground hover:bg-muted absolute top-4 right-4 flex size-[34px] items-center justify-center rounded-[10px] border transition-colors"
        >
          <IconClose />
        </button>

        <div className="mb-[18px] flex items-center gap-2.5">
          <BrandMark size={34} radius={9} />
          <span className="text-muted-foreground text-[11px] font-bold tracking-[0.1em] uppercase">
            Reabrir incidencia
          </span>
        </div>

        {sent ? (
          <div className="animate-in fade-in-0 py-4 text-center duration-200">
            <span className="bg-success text-success-foreground mb-3.5 inline-flex size-[52px] items-center justify-center rounded-full">
              <IconCheck width={26} height={26} />
            </span>
            <h2 className="text-foreground text-[21px] font-extrabold tracking-tight">
              Incidencia reabierta
            </h2>
            <p className="text-muted-foreground mx-auto mt-1.5 mb-5 max-w-[42ch] text-sm leading-relaxed">
              El equipo Kairos la retomará con la nueva información. La verás de
              nuevo entre tus incidencias abiertas.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="bg-brand text-brand-foreground h-11 rounded-[13px] px-6 text-sm font-semibold shadow-[var(--shadow-sm)] transition-opacity hover:opacity-90"
            >
              Cerrar
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="animate-in fade-in-0 duration-200">
            <h2 className="text-foreground text-[22px] font-extrabold tracking-tight">
              Reabrir incidencia
            </h2>
            <p className="text-muted-foreground mt-1 mb-1.5 text-sm leading-relaxed">
              Vas a reabrir{" "}
              <span className="text-foreground font-semibold">
                {incidentTitle}
              </span>
              . Cuéntanos qué sigue fallando.
            </p>

            <div className="mt-4 flex flex-col gap-4">
              <div>
                <label className="text-foreground mb-1.5 block text-[12.5px] font-bold">
                  ¿Por qué la reabres?
                  <span className="text-brand-accent"> *</span>
                </label>
                <textarea
                  required
                  rows={4}
                  value={motivo}
                  onChange={(e) => setMotivo(e.target.value)}
                  placeholder="¿Qué ha vuelto a pasar? ¿Sigue igual o ha cambiado algo desde que se cerró?"
                  className={`${fieldClass} min-h-24 resize-y`}
                />
              </div>
              <div>
                <label className="text-foreground mb-1.5 block text-[12.5px] font-bold">
                  Loom o enlace{" "}
                  <span className="text-muted-foreground font-medium">
                    (opcional)
                  </span>
                </label>
                <input
                  type="url"
                  value={loom}
                  onChange={(e) => setLoom(e.target.value)}
                  placeholder="https://www.loom.com/share/…"
                  className={fieldClass}
                />
              </div>
              <div>
                <label className="text-foreground mb-1.5 block text-[12.5px] font-bold">
                  Imagen asociada{" "}
                  <span className="text-muted-foreground font-medium">
                    (opcional)
                  </span>
                </label>
                {imagen ? (
                  <div className="border-border bg-muted/60 flex items-center gap-3 rounded-xl border px-3 py-2.5">
                    <span className="text-foreground min-w-0 flex-1 truncate text-sm">
                      {imagen.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => setImagen(null)}
                      className="text-muted-foreground hover:text-foreground shrink-0 text-[12.5px] font-medium"
                    >
                      Quitar
                    </button>
                  </div>
                ) : (
                  <label
                    className={`${fieldClass} text-muted-foreground hover:border-brand/50 flex cursor-pointer items-center gap-2`}
                  >
                    <span>Subir una captura o foto…</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => setImagen(e.target.files?.[0] ?? null)}
                    />
                  </label>
                )}
              </div>
            </div>

            {error && (
              <p className="text-danger-foreground mt-4 text-[13px]">{error}</p>
            )}

            <button
              type="submit"
              disabled={!valid || loading}
              className={`mt-5 flex h-[46px] w-full items-center justify-center gap-2 rounded-[13px] text-[14.5px] font-semibold transition-opacity ${
                valid && !loading
                  ? "bg-brand text-brand-foreground shadow-[var(--shadow-sm)] hover:opacity-90"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              }`}
            >
              <IconRefresh width={16} height={16} />
              {loading ? "Reabriendo…" : "Reabrir incidencia"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
