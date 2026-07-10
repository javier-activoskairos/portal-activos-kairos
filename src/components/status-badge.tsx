import { cn } from "@/lib/utils";
import { TONE_CLASS, dotClass, type BadgeSpec } from "@/lib/status";

export function StatusBadge({
  label,
  spec,
  className,
}: {
  label: string;
  spec: BadgeSpec;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12.5px] font-medium whitespace-nowrap",
        TONE_CLASS[spec.tone],
        className,
      )}
    >
      {spec.dot && (
        <span
          aria-hidden
          className={cn("size-1.5 shrink-0 rounded-full", dotClass(spec.tone))}
        />
      )}
      {label}
    </span>
  );
}
