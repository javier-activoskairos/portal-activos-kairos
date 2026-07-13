import { Suspense } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { LoginForm } from "./login-form";

export const metadata = { title: "Acceder · Portal Activos Kairos" };

export default function LoginPage() {
  return (
    <main className="bg-background relative flex min-h-screen items-center justify-center overflow-hidden px-5 py-8">
      {/* Realce de marca sutil en el fondo */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 h-[520px] w-[760px] -translate-x-1/2"
        style={{
          background:
            "radial-gradient(50% 60% at 50% 0%, color-mix(in oklch, var(--brand), transparent 86%), transparent 70%)",
        }}
      />
      <div className="absolute top-5 right-6 z-10">
        <ThemeToggle />
      </div>

      <div className="relative w-full max-w-[420px]">
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
