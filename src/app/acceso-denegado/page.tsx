export const metadata = { title: "Acceso denegado · Portal Activos Kairos" };

export default function AccesoDenegado() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-secondary px-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-8 text-center shadow-sm">
        <h1 className="text-lg font-semibold">Acceso no autorizado</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Tu cuenta no tiene acceso a este portal. Si crees que es un error,
          contacta con Activos Kairos.
        </p>
        <a
          href="/login"
          className="mt-6 inline-block text-sm font-medium text-brand hover:underline"
        >
          Volver a intentar
        </a>
      </div>
    </main>
  );
}
