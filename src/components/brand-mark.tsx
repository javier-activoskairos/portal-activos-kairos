import Image from "next/image";
import { cn } from "@/lib/utils";

/** Isotipo (K) de Activos Kairos en su naranja de marca. */
export function BrandMark({
  size = 38,
  radius,
  className,
  priority = false,
}: {
  size?: number;
  radius?: number;
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src="/isotipo.png"
      alt="Activos Kairos"
      width={size}
      height={size}
      priority={priority}
      className={cn(className)}
      style={{ width: size, height: size, borderRadius: radius }}
    />
  );
}
