"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Transición de entrada al portal: la K naranja se rellena de abajo a arriba
 * (0.7s) al abrir la interfaz. El fade NO empieza hasta que el relleno llega
 * al 100% (se dispara con `onAnimationEnd` del relleno), así la animación no
 * se corta a medias. Aparece una vez por sesión.
 */
export function PortalSplash() {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("kp-splash-v4")) {
      const t = setTimeout(() => setVisible(false), 0);
      return () => clearTimeout(t);
    }
    sessionStorage.setItem("kp-splash-v4", "1");
    // Seguridad: si el relleno no emite animationend (p. ej. reduced-motion),
    // ocultar igualmente.
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

  const mask = {
    WebkitMaskImage: "url(/isotipo.png)",
    maskImage: "url(/isotipo.png)",
    WebkitMaskSize: "contain",
    maskSize: "contain",
    WebkitMaskRepeat: "no-repeat",
    maskRepeat: "no-repeat",
    WebkitMaskPosition: "center",
    maskPosition: "center",
    backgroundColor: "color-mix(in oklch, var(--brand), transparent 82%)",
    width: 84,
    height: 84,
  } as const;

  return (
    <div
      aria-hidden
      className={cn(
        "bg-background fixed inset-0 z-[100] flex flex-col items-center justify-center gap-5 transition-opacity duration-300",
        fading ? "opacity-0" : "opacity-100",
      )}
    >
      <div className="kp-kfill" style={mask} onAnimationEnd={onFillDone} />
      <p className="text-foreground text-lg font-extrabold tracking-tight">
        Activos Kairos
      </p>
    </div>
  );
}
