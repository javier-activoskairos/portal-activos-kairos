import Image from "next/image";
import { Suspense } from "react";
import { LoginForm } from "./login-form";

export const metadata = { title: "Acceder · Portal Activos Kairos" };

export default function LoginPage() {
  return (
    <main className="bg-background relative flex min-h-screen items-center justify-center px-4">
      {/* Realce de marca sutil en el fondo */}
      <div
        aria-hidden
        className="from-accent pointer-events-none absolute inset-x-0 top-0 h-64 bg-gradient-to-b to-transparent"
      />
      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Image
            src="/isotipo.png"
            alt="Activos Kairos"
            width={56}
            height={56}
            priority
            className="mb-4 h-14 w-14"
          />
          <h1 className="text-xl font-semibold tracking-tight">
            Portal Activos Kairos
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Accede con tu correo. Te enviaremos un código.
          </p>
        </div>
        <Suspense>
          <LoginForm />
        </Suspense>
        <p className="text-muted-foreground mt-6 text-center text-xs">
          Acceso exclusivo para clientes de Activos Kairos.
        </p>
      </div>
    </main>
  );
}
