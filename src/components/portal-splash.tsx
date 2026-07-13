"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * Transición de entrada al portal: la K naranja de Activos Kairos se rellena
 * de abajo a arriba (carga rápida) al abrir la interfaz. Aparece una vez por
 * sesión; no depende de que el servidor esté "frío" (el keep-alive lo mantiene
 * caliente). Es un overlay de cliente.
 *
 * La K se dibuja con el isotipo como máscara: fondo naranja tenue de base y un
 * relleno naranja que sube de 0% a 100% de altura (ver `.kp-kfill` en
 * globals.css).
 */
export function PortalSplash() {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("kp-splash-v2")) {
      const t = setTimeout(() => setVisible(false), 0);
      return () => clearTimeout(t);
    }
    sessionStorage.setItem("kp-splash-v2", "1");
    const t1 = setTimeout(() => setFading(true), 1000);
    const t2 = setTimeout(() => setVisible(false), 1350);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

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
      <div className="kp-kfill" style={mask} />
      <p className="text-foreground text-lg font-extrabold tracking-tight">
        Activos Kairos
      </p>
    </div>
  );
}
