import { BrandMark } from "@/components/brand-mark";

export default function PortalLoading() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 text-center">
      <BrandMark size={54} radius={15} priority className="animate-pulse" />
      <div className="space-y-1">
        <p className="text-foreground text-lg font-bold tracking-tight">
          Activos Kairos
        </p>
        <p className="text-muted-foreground text-sm">Cargando tu portal…</p>
      </div>
      <div className="border-brand/30 border-t-brand h-6 w-6 animate-spin rounded-full border-2" />
    </div>
  );
}
