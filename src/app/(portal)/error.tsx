"use client";

export default function PortalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="border-border bg-card w-full max-w-sm rounded-2xl border p-8 text-center shadow-[var(--shadow-md)]">
        <h1 className="text-lg font-semibold">Algo no ha ido bien</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          No hemos podido cargar esta página. Inténtalo de nuevo.
        </p>
        <button
          type="button"
          onClick={reset}
          className="bg-primary text-primary-foreground hover:bg-primary/80 mt-6 inline-flex h-11 items-center justify-center rounded-[14px] px-5 text-sm font-medium"
        >
          Reintentar
        </button>
      </div>
    </div>
  );
}
