"use client";

import { useEffect, useRef } from "react";

const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

/**
 * Comportamiento de diálogo modal que el marcado por sí solo no da:
 *
 *  - foco inicial dentro del diálogo (si no, el primer Tab se va al contenido
 *    de detrás y el lector de pantalla lee la página de fondo),
 *  - Tab y Shift+Tab ciclan dentro del diálogo,
 *  - al cerrar, el foco vuelve al elemento que lo abrió,
 *  - el fondo no hace scroll mientras está abierto (en móvil el formulario se
 *    perdía de vista al arrastrar).
 *
 * `onEscape` se deja al llamante porque cada modal decide qué hacer (algunos
 * retroceden un paso en vez de cerrarse) y porque no debe interrumpir un envío
 * en curso.
 */
export function useModalA11y(open: boolean) {
  const ref = useRef<HTMLDivElement | null>(null);
  const restoreTo = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    restoreTo.current = document.activeElement as HTMLElement | null;

    const node = ref.current;
    if (node) {
      const first = node.querySelector<HTMLElement>(FOCUSABLE);
      // El contenedor lleva tabIndex={-1} como último recurso: siempre debe
      // haber foco dentro, incluso en el panel de éxito sin campos.
      (first ?? node).focus({ preventScroll: true });
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const el = ref.current;
      if (!el) return;
      const items = Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (n) => n.offsetParent !== null || n === document.activeElement,
      );
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0]!;
      const last = items[items.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
      restoreTo.current?.focus?.({ preventScroll: true });
    };
  }, [open]);

  return ref;
}
