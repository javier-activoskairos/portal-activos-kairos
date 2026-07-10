import { Suspense } from "react";
import { LoginForm } from "./login-form";

export const metadata = { title: "Acceder · Portal Activos Kairos" };

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-secondary px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand text-brand-foreground text-xl font-bold">
            K
          </div>
          <h1 className="text-xl font-semibold">Portal Activos Kairos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Accede con tu correo. Te enviaremos un código.
          </p>
        </div>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
