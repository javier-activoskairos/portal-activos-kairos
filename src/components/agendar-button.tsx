"use client";

import { useState } from "react";
import { IconCalendar } from "@/components/icons";
import { MeetingModal } from "@/components/meeting-modal";

/**
 * Botón "Agendar Reunión" + modal embebido. Wrapper client para poder usarlo
 * dentro de server components (cabecera de Inicio) y en la barra móvil.
 * - variant "button": botón primario naranja con etiqueta.
 * - variant "icon": botón cuadrado solo icono (barra superior móvil).
 */
export function AgendarButton({
  variant = "button",
}: {
  variant?: "button" | "icon";
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {variant === "icon" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          title="Agendar Reunión"
          aria-label="Agendar Reunión"
          className="bg-brand text-brand-foreground flex size-[38px] items-center justify-center rounded-[11px] shadow-[var(--shadow-sm)] transition-opacity hover:opacity-90"
        >
          <IconCalendar />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="bg-brand text-brand-foreground inline-flex h-10 shrink-0 items-center gap-2 rounded-xl px-4 text-[13.5px] font-semibold shadow-[var(--shadow-sm)] transition-opacity hover:opacity-90"
        >
          <IconCalendar width={17} height={17} />
          Agendar Reunión
        </button>
      )}
      <MeetingModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
