"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Transición de entrada al portal: la K naranja de Activos Kairos animada al
 * abrir la interfaz. Aparece una vez por sesión y NO depende de que el
 * servidor esté "frío" (el keep-alive lo mantiene caliente, así que la
 * pantalla de carga del servidor apenas se veía). Es un overlay de cliente.
 */
export function PortalSplash() {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    // Ya mostrada en esta sesión → ocultar (en un tick, sin set-state directo
    // en el efecto).
    if (sessionStorage.getItem("kp-splash")) {
      const t = setTimeout(() => setVisible(false), 0);
      return () => clearTimeout(t);
    }
    sessionStorage.setItem("kp-splash", "1");
    const t1 = setTimeout(() => setFading(true), 850);
    const t2 = setTimeout(() => setVisible(false), 1200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      aria-hidden
      className={cn(
        "bg-background fixed inset-0 z-[100] flex flex-col items-center justify-center gap-5 transition-opacity duration-300",
        fading ? "opacity-0" : "opacity-100",
      )}
    >
      <Image
        src="/isotipo.png"
        alt=""
        width={78}
        height={78}
        priority
        className="animate-pulse"
        style={{ width: 78, height: 78 }}
      />
      <p className="text-foreground text-lg font-extrabold tracking-tight">
        Activos Kairos
      </p>
    </div>
  );
}
