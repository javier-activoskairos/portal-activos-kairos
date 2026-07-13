"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Transición de entrada al portal: la K naranja se rellena de abajo a arriba
 * (0.7s) al abrir la interfaz. El relleno es un div naranja que crece con
 * `transform: scaleY` (fluido por GPU, siempre completa) enmascarado con la
 * forma del isotipo. El fade NO empieza hasta que el relleno termina
 * (`onAnimationEnd`). Aparece una vez por sesión.
 */
export function PortalSplash() {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("kp-splash-v5")) {
      const t = setTimeout(() => setVisible(false), 0);
      return () => clearTimeout(t);
    }
    sessionStorage.setItem("kp-splash-v5", "1");
    // Seguridad: si no llega animationend (p. ej. reduced-motion), ocultar.
    const t1 = setTimeout(() => setFading(true), 1500);
    const t2 = setTimeout(() => setVisible(false), 1820);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  // La K terminó de rellenarse → ahora sí, fundido de salida.
  const onFillDone = () => {
    setFading(true);
    setTimeout(() => setVisible(false), 340);
  };

  if (!visible) return null;

  return (
    <div
      aria-hidden
      className={cn(
        "bg-background fixed inset-0 z-[100] flex flex-col items-center justify-center gap-5 transition-opacity duration-300",
        fading ? "opacity-0" : "opacity-100",
      )}
    >
      <div className="kp-kfill-mask" style={{ width: 84, height: 84 }}>
        <div className="kp-kfill-base" />
        <div className="kp-kfill-bar" onAnimationEnd={onFillDone} />
      </div>
      <p className="text-foreground text-lg font-extrabold tracking-tight">
        Activos Kairos
      </p>
    </div>
  );
}
