"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { IconCheck, IconClose } from "@/components/icons";
import { BrandMark } from "@/components/brand-mark";

export function VerifyIncidentModal({
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
  const [stars, setStars] = useState(0);
  const [hover, setHover] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (!open) {
      setStars(0);
      setHover(0);
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

  if (!open || typeof document === "undefined") return null;

  const submit = async () => {
    if (stars < 1 || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/incidencias/verificar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incidentId, valoracion: stars }),
      });
      if (!res.ok) throw new Error("request failed");
      setSent(true);
    } catch {
      setError(
        "No hemos podido verificar la incidencia. Inténtalo de nuevo en un momento.",
      );
    } finally {
      setLoading(false);
    }
  };

  const shown = hover || stars;

  return createPortal(
    <div
      onClick={onClose}
      className="animate-in fade-in-0 fixed inset-0 z-[100] flex items-center justify-center bg-[rgba(15,12,9,0.55)] p-5 backdrop-blur-[4px] duration-200"
      role="dialog"
      aria-modal="true"
      aria-label="Verificar incidencia"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="border-border bg-card animate-in fade-in-0 zoom-in-95 relative w-full max-w-[500px] rounded-[22px] border p-[30px] shadow-[var(--shadow-lg)] duration-200"
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
            Verificar incidencia
          </span>
        </div>

        {sent ? (
          <div className="animate-in fade-in-0 py-4 text-center duration-200">
            <span className="bg-success text-success-foreground mb-3.5 inline-flex size-[52px] items-center justify-center rounded-full">
              <IconCheck width={26} height={26} />
            </span>
            <h2 className="text-foreground text-[21px] font-extrabold tracking-tight">
              ¡Gracias por tu valoración!
            </h2>
            <p className="text-muted-foreground mx-auto mt-1.5 mb-5 max-w-[42ch] text-sm leading-relaxed">
              La incidencia queda marcada como resuelta. La verás en el bloque de
              incidencias resueltas.
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
          <div className="animate-in fade-in-0 duration-200">
            <h2 className="text-foreground text-[22px] font-extrabold tracking-tight">
              ¿Todo resuelto?
            </h2>
            <p className="text-muted-foreground mt-1 mb-1 text-sm leading-relaxed">
              Vas a dar por resuelta{" "}
              <span className="text-foreground font-semibold">
                {incidentTitle}
              </span>
              . Valora del 1 al 5 cómo lo hemos gestionado.
            </p>

            <div className="mt-5 flex items-center justify-center gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setStars(n)}
                  onMouseEnter={() => setHover(n)}
                  onMouseLeave={() => setHover(0)}
                  aria-label={`${n} estrella${n > 1 ? "s" : ""}`}
                  className="transition-transform hover:scale-110"
                >
                  <svg
                    width="40"
                    height="40"
                    viewBox="0 0 24 24"
                    fill={n <= shown ? "var(--brand)" : "none"}
                    stroke={n <= shown ? "var(--brand)" : "currentColor"}
                    strokeWidth="1.6"
                    className={n <= shown ? "" : "text-muted-foreground/50"}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 2.5l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.8 6.2 20.9l1.1-6.5L2.6 9.8l6.5-.9L12 2.5z"
                    />
                  </svg>
                </button>
              ))}
            </div>
            <div className="text-muted-foreground mt-2 text-center text-[12.5px]">
              {shown > 0 ? `${shown} / 5` : "Selecciona una puntuación"}
            </div>

            {error && (
              <p className="text-danger-foreground mt-4 text-center text-[13px]">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={submit}
              disabled={stars < 1 || loading}
              className={`mt-5 flex h-[46px] w-full items-center justify-center gap-2 rounded-[13px] text-[14.5px] font-semibold transition-opacity ${
                stars >= 1 && !loading
                  ? "bg-brand text-brand-foreground shadow-[var(--shadow-sm)] hover:opacity-90"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              }`}
            >
              {loading ? "Enviando…" : "Verificar y valorar"}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
