"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { IconCheck, IconClose } from "@/components/icons";
import { BrandMark } from "@/components/brand-mark";
import { useModalA11y } from "@/lib/use-modal-a11y";

export function IncidentModal({
  open,
  onClose,
}: {
  open: boolean;
  /** Se invoca siempre al cerrar; recibe si hubo un envío correcto para que la
   *  vista pueda refrescarse (la lista es server-rendered y no se entera sola). */
  onClose: (didSubmit?: boolean) => void;
}) {
  const [titulo, setTitulo] = useState("");
  const [contexto, setContexto] = useState("");
  const [loom, setLoom] = useState("");
  const [imagen, setImagen] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const MAX_IMAGE_MB = 8;

  // Reset del formulario al cerrar (patrón de ajuste de estado en render por
  // cambio de prop; evita setState dentro de un efecto).
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (!open) {
      setTitulo("");
      setContexto("");
      setLoom("");
      setImagen(null);
      setLoading(false);
      setError(null);
      setSent(false);
    }
  }

  const dialogRef = useModalA11y(open);

  // Cerrar a mitad de un envío dejaba la petición en el aire sin confirmación:
  // el usuario reintentaba y se registraba una segunda incidencia en Notion.
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

  // Sin portal, un ancestro con `transform` reancla el `position: fixed` del
  // overlay a ese ancestro y el modal deja de cubrir la ventana.
  if (!open || typeof document === "undefined") return null;

  const valid = titulo.trim() && contexto.trim();

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
      form.append("titulo", titulo.trim());
      form.append("contexto", contexto.trim());
      form.append("loom", loom.trim());
      if (imagen) form.append("imagen", imagen);
      const res = await fetch("/api/incidencias", {
        method: "POST",
        body: form,
      });
      if (!res.ok) {
        // El servidor explica el motivo (403 en previsualización, 401 por
        // sesión caducada…). Mostrarlo evita reintentos a ciegas.
        let msg =
          "No hemos podido registrar la incidencia. Inténtalo de nuevo en un momento.";
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

  const fieldClass =
    "border-border bg-muted/60 text-foreground focus:border-brand/50 w-full rounded-xl border px-3 py-2.5 text-sm outline-none transition-colors";

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
        aria-labelledby="incident-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="border-border bg-card animate-in fade-in-0 zoom-in-95 relative my-auto max-h-[calc(100vh-40px)] w-full max-w-[540px] overflow-y-auto rounded-[22px] border p-[30px] shadow-[var(--shadow-lg)] duration-200 outline-none"
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
            Nueva incidencia
          </span>
        </div>

        {sent ? (
          <div className="animate-in fade-in-0 py-4 text-center duration-200">
            <span className="bg-success text-success-foreground mb-3.5 inline-flex size-[52px] items-center justify-center rounded-full">
              <IconCheck width={26} height={26} />
            </span>
            <h2
              id="incident-modal-title"
              className="text-foreground text-[21px] font-extrabold tracking-tight"
            >
              Incidencia registrada
            </h2>
            <p className="text-muted-foreground mx-auto mt-1.5 mb-5 max-w-[42ch] text-sm leading-relaxed">
              La hemos recibido y el equipo Kairos la revisará en breve. La
              verás reflejada en tu lista de incidencias.
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
              id="incident-modal-title"
              className="text-foreground text-[22px] font-extrabold tracking-tight"
            >
              Nueva incidencia
            </h2>
            <p className="text-muted-foreground mt-1 mb-5 text-sm leading-relaxed">
              Cuéntanos qué ocurre y el equipo Kairos se pondrá con ello.
            </p>

            <div className="flex flex-col gap-4">
              <div>
                <label
                  htmlFor="incident-titulo"
                  className="text-foreground mb-1.5 block text-[12.5px] font-bold"
                >
                  Resumen de la incidencia
                  <span className="text-brand-accent"> *</span>
                </label>
                <input
                  id="incident-titulo"
                  type="text"
                  required
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  placeholder="Ej. El informe semanal no llega los lunes"
                  className={fieldClass}
                />
              </div>
              <div>
                <label
                  htmlFor="incident-contexto"
                  className="text-foreground mb-1.5 block text-[12.5px] font-bold"
                >
                  Contexto detallado
                  <span className="text-brand-accent"> *</span>
                </label>
                <textarea
                  id="incident-contexto"
                  required
                  rows={4}
                  value={contexto}
                  onChange={(e) => setContexto(e.target.value)}
                  placeholder="¿Qué esperabas que pasara y qué pasó? ¿Desde cuándo? ¿Pasos para reproducirlo?"
                  className={`${fieldClass} min-h-24 resize-y`}
                />
              </div>
              <div>
                <label
                  htmlFor="incident-loom"
                  className="text-foreground mb-1.5 block text-[12.5px] font-bold"
                >
                  Loom asociado{" "}
                  <span className="text-muted-foreground font-medium">
                    (opcional)
                  </span>
                </label>
                <input
                  id="incident-loom"
                  type="url"
                  value={loom}
                  onChange={(e) => setLoom(e.target.value)}
                  placeholder="https://www.loom.com/share/…"
                  className={fieldClass}
                />
              </div>
              <div>
                <label
                  htmlFor="incident-imagen"
                  className="text-foreground mb-1.5 block text-[12.5px] font-bold"
                >
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
                    htmlFor="incident-imagen"
                    className={`${fieldClass} text-muted-foreground hover:border-brand/50 flex cursor-pointer items-center gap-2`}
                  >
                    <span>Subir una captura o foto…</span>
                    <input
                      id="incident-imagen"
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
              {loading ? "Enviando…" : "Enviar incidencia"}
            </button>
          </form>
        )}
      </div>
    </div>,
    document.body,
  );
}
