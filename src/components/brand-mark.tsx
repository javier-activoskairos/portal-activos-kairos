import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * Isotipo de Activos Kairos en badge naranja: la K blanca sobre un cuadrado
 * naranja de marca. Reutiliza /isotipo.png (K naranja) y la vuelve blanca con
 * un filtro CSS inline (brightness(0) invert(1)), sin necesidad de un asset
 * aparte. El filtro va inline —no como clase Tailwind— porque la clase
 * arbitraria `[filter:...]` no siempre se genera y dejaba la K invisible.
 */
export function BrandMark({
  size = 38,
  radius = 11,
  className,
  priority = false,
}: {
  size?: number;
  radius?: number;
  className?: string;
  priority?: boolean;
}) {
  const inner = Math.round(size * 0.62);
  return (
    <span
      className={cn(
        "bg-brand inline-flex items-center justify-center",
        className,
      )}
      style={{ width: size, height: size, borderRadius: radius }}
    >
      <Image
        src="/isotipo.png"
        alt="Activos Kairos"
        width={inner}
        height={inner}
        priority={priority}
        style={{
          width: inner,
          height: inner,
          filter: "brightness(0) invert(1)",
        }}
      />
    </span>
  );
}
