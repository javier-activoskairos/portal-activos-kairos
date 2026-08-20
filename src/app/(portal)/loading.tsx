/*
 * Esqueleto de carga del portal.
 *
 * Todas las páginas son `force-dynamic` y consultan Supabase (Configuración,
 * además, hidrata desde Notion durante el render). Sin este archivo, al pulsar
 * un elemento del menú la interfaz se quedaba congelada en la pantalla anterior
 * durante segundos, sin ninguna señal: parecía que el clic no había funcionado.
 */
function Bar({ className = "" }: { className?: string }) {
  return <div className={`bg-muted animate-pulse rounded-lg ${className}`} />;
}

export default function PortalLoading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-live="polite">
      <span className="sr-only">Cargando…</span>

      {/* Cabecera */}
      <div className="space-y-2.5">
        <Bar className="h-3.5 w-32" />
        <Bar className="h-8 w-2/3 max-w-[420px]" />
        <Bar className="h-4 w-full max-w-[52ch]" />
      </div>

      {/* Tarjetas de KPI */}
      <div className="grid gap-3 min-[760px]:grid-cols-2 min-[1100px]:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="border-border bg-card rounded-[22px] border p-6 shadow-[var(--shadow-sm)]"
          >
            <Bar className="h-9 w-9 rounded-xl" />
            <Bar className="mt-4 h-7 w-16" />
            <Bar className="mt-2 h-3.5 w-32" />
          </div>
        ))}
      </div>

      {/* Bloque principal */}
      <div className="border-border bg-card rounded-[22px] border p-6 shadow-[var(--shadow-sm)]">
        <Bar className="h-5 w-48" />
        <div className="mt-5 space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <Bar key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
