"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { IconCheck, IconClose } from "@/components/icons";
import { BrandMark } from "@/components/brand-mark";
import { useModalA11y } from "@/lib/use-modal-a11y";

/** Mismo tope que aplica la ruta antes de escribir en Notion. */
const MAX_MOTIVO = 1900;

export function CancelIncidentModal({
  open,
  incidentId,
  incidentTitle,
  onClose,
}: {
  open: boolean;
  incidentId: string;
  incidentTitle: string;
  /** Se invoca siempre al cerrar; recibe si hubo un envío correcto para que la
   *  vista pueda refrescarse (la lista es server-rendered y no se entera sola). */
  onClose: (didSubmit?: boolean) => void;
}) {
  const [motivo, setMotivo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (!open) {
      setMotivo("");
      setLoading(false);
      setError(null);
      setSent(false);
    }
  }

  const dialogRef = useModalA11y(open);

  // Cerrar a mitad de un envío dejaba la petición en el aire sin confirmación:
  // el usuario reintentaba sobre una incidencia que ya estaba anulada.
  const requestClose = () => {
    if (loading) return;
    onClose(sent);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onClose(sent);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, loading, sent]);

  if (!open || typeof document === "undefined") return null;

  const valid = motivo.trim().length > 0;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/incidencias/anular", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incidentId, motivo: motivo.trim() }),
      });
      if (!res.ok) {
        // El servidor explica el motivo (403 en previsualización, 409 si ya se
        // había cerrado…). Mostrarlo evita reintentos a ciegas.
        let msg =
          "No hemos podido anular la incidencia. Inténtalo de nuevo en un momento.";
        try {
          const body = await res.json();
          if (body?.error) msg = String(body.error);
        } catch {
          // Respuesta sin cuerpo JSON: se queda el mensaje por defecto.
        }
        setError(msg);
        return;
      }
      setSent(true);
    } catch {
      setError(
        "No hemos podido conectar. Revisa tu conexión e inténtalo de nuevo.",
      );
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div
      onClick={requestClose}
      className="animate-in fade-in-0 fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-[rgba(15,12,9,0.55)] p-5 backdrop-blur-[4px] duration-200"
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="border-border bg-card animate-in fade-in-0 zoom-in-95 relative my-auto max-h-[calc(100vh-40px)] w-full max-w-[500px] overflow-y-auto rounded-[22px] border p-[30px] shadow-[var(--shadow-lg)] duration-200 outline-none"
      >
        <button
          type="button"
          onClick={requestClose}
          aria-label="Cerrar"
          className="border-border bg-card text-muted-foreground hover:bg-muted absolute top-4 right-4 flex size-[34px] items-center justify-center rounded-[10px] border transition-colors"
        >
          <IconClose />
        </button>

        <div className="mb-[18px] flex items-center gap-2.5">
          <BrandMark size={34} radius={9} />
          <span className="text-muted-foreground text-[11px] font-bold tracking-[0.1em] uppercase">
            Anular incidencia
          </span>
        </div>

        {sent ? (
          <div className="animate-in fade-in-0 py-4 text-center duration-200">
            <span className="bg-success text-success-foreground mb-3.5 inline-flex size-[52px] items-center justify-center rounded-full">
              <IconCheck width={26} height={26} />
            </span>
            <h2
              id="cancel-modal-title"
              className="text-foreground text-[21px] font-extrabold tracking-tight"
            >
              Incidencia anulada
            </h2>
            <p className="text-muted-foreground mx-auto mt-1.5 mb-5 max-w-[42ch] text-sm leading-relaxed">
              El equipo Kairos deja de trabajarla. La encontrarás entre las
              cerradas por si necesitas consultarla.
            </p>
            <button
              type="button"
              onClick={requestClose}
              className="bg-brand text-brand-foreground h-11 rounded-[13px] px-6 text-sm font-semibold shadow-[var(--shadow-sm)] transition-opacity hover:opacity-90"
            >
              Cerrar
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="animate-in fade-in-0 duration-200">
            <h2
              id="cancel-modal-title"
              className="text-foreground text-[22px] font-extrabold tracking-tight"
            >
              Anular incidencia
            </h2>
            <p className="text-muted-foreground mt-1 mb-1.5 text-sm leading-relaxed">
              Vas a anular{" "}
              <span className="text-foreground font-semibold">
                {incidentTitle}
              </span>
              . Dejaremos de trabajarla.
            </p>

            <div className="mt-4">
              <label
                htmlFor="cancel-motivo"
                className="text-foreground mb-1.5 block text-[12.5px] font-bold"
              >
                ¿Por qué la anulas?
                <span className="text-brand-accent"> *</span>
              </label>
              <textarea
                id="cancel-motivo"
                required
                rows={4}
                maxLength={MAX_MOTIVO}
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="¿Se abrió por error, se ha resuelto sola, ya no aplica…?"
                className="border-border bg-muted/60 text-foreground focus:border-brand/50 min-h-24 w-full resize-y rounded-xl border px-3 py-2.5 text-sm transition-colors outline-none"
              />
            </div>

            {error && (
              <p
                role="alert"
                className="text-danger-foreground mt-4 text-[13px]"
              >
                {error}
              </p>
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
              <IconClose width={16} height={16} />
              {loading ? "Anulando…" : "Anular incidencia"}
            </button>
          </form>
        )}
      </div>
    </div>,
    document.body,
  );
}
