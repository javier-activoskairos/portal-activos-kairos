import { BrandMark } from "@/components/brand-mark";

export default function PortalLoading() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 text-center">
      <BrandMark size={72} radius={20} priority className="animate-pulse" />
      <div className="space-y-1.5">
        <p className="text-foreground text-xl font-extrabold tracking-tight">
          Activos Kairos
        </p>
        <p className="text-muted-foreground text-sm">Cargando tu portal…</p>
      </div>
      <div className="border-brand/25 border-t-brand size-7 animate-spin rounded-full border-[3px]" />
    </div>
  );
}
