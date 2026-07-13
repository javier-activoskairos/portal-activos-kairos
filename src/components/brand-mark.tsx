import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Isotipo de Activos Kairos en badge naranja: la K blanca sobre un cuadrado
 * naranja de marca. Reutiliza /isotipo.png (K naranja) y la vuelve blanca con
 * un filtro CSS, sin necesidad de un asset aparte.
 */
export function BrandMark({
  size = 38,
  radius = 11,
  className,
}: {
  size?: number;
  radius?: number;
  className?: string;
}) {
  const inner = Math.round(size * 0.62);
  return (
    <span
      className={cn("bg-brand inline-flex items-center justify-center", className)}
      style={{ width: size, height: size, borderRadius: radius }}
    >
      <Image
        src="/isotipo.png"
        alt="Activos Kairos"
        width={inner}
        height={inner}
        className="[filter:brightness(0)_invert(1)]"
        style={{ width: inner, height: inner }}
      />
    </span>
  );
}
