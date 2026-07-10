export const metadata = { title: "Acceso denegado · Portal Activos Kairos" };

export default function AccesoDenegado() {
  return (
    <main className="bg-background flex min-h-screen items-center justify-center px-4">
      <div className="border-border bg-card w-full max-w-sm rounded-2xl border p-8 text-center shadow-[var(--shadow-md)]">
        <h1 className="text-lg font-semibold">Acceso no autorizado</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Tu cuenta no tiene acceso a este portal. Si crees que es un error,
          contacta con Activos Kairos.
        </p>
        <a
          href="/login"
          className="text-brand-accent mt-6 inline-block text-sm font-medium hover:underline"
        >
          Volver a intentar
        </a>
      </div>
    </main>
  );
}
