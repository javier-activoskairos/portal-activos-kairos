"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { IconArrow, IconMail } from "@/components/icons";

type Step = "email" | "code";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/inicio";

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    // shouldCreateUser:false → solo usuarios ya autorizados pueden entrar.
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: false },
    });
    setLoading(false);
    if (error) {
      setError(
        "No se pudo enviar el código. Verifica que el correo tenga acceso autorizado.",
      );
      return;
    }
    setStep("code");
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: "email",
    });
    setLoading(false);
    if (error) {
      setError("Código incorrecto o caducado.");
      return;
    }
    router.replace(next);
    router.refresh();
  }

  return (
    <div className="border-border bg-card rounded-[24px] border p-[34px] shadow-[var(--shadow-lg)]">
      <p className="text-brand-accent mb-3 text-[12.5px] font-semibold tracking-[0.14em] uppercase">
        Portal de cliente
      </p>

      {step === "email" ? (
        <form onSubmit={sendCode}>
          <h1 className="text-foreground text-[28px] leading-tight font-extrabold tracking-tight">
            Entra a tu portal.
          </h1>
          <p className="text-muted-foreground mt-2 mb-6 text-[15px] leading-relaxed">
            Escribe tu correo y te enviaremos un código de acceso. Sin
            contraseñas.
          </p>

          <label
            htmlFor="email"
            className="text-foreground mb-2 block text-[13px] font-semibold"
          >
            Correo
          </label>
          <div className="border-border bg-card focus-within:border-brand mb-4 flex h-12 items-center gap-2.5 rounded-[14px] border px-3.5 transition-colors">
            <IconMail className="text-muted-foreground shrink-0" />
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@empresa.com"
              className="text-foreground h-full min-w-0 flex-1 border-none bg-transparent text-sm outline-none"
            />
          </div>

          {error && (
            <p className="text-danger-foreground mb-4 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="bg-brand flex h-12 w-full items-center justify-center gap-2 rounded-[14px] text-[15px] font-semibold text-white shadow-[var(--shadow-md)] transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {loading ? "Enviando…" : "Enviar código"}
            {!loading && <IconArrow width={17} height={17} />}
          </button>
        </form>
      ) : (
        <form onSubmit={verifyCode}>
          <h1 className="text-foreground text-[28px] leading-tight font-extrabold tracking-tight">
            Revisa tu correo.
          </h1>
          <p className="text-muted-foreground mt-2 mb-6 text-[15px] leading-relaxed">
            Enviamos un código de 6 dígitos a{" "}
            <span className="text-foreground font-medium">{email}</span>.
          </p>

          <label
            htmlFor="code"
            className="text-foreground mb-2 block text-[13px] font-semibold"
          >
            Código de acceso
          </label>
          <div className="border-brand bg-card mb-6 flex h-12 items-center rounded-[14px] border-[1.5px] px-4">
            <input
              id="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              placeholder="123456"
              className="text-foreground h-full min-w-0 flex-1 border-none bg-transparent font-mono text-xl tracking-[0.5em] outline-none"
            />
          </div>

          {error && (
            <p className="text-danger-foreground mb-4 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="bg-brand h-12 w-full rounded-[14px] text-[15px] font-semibold text-white shadow-[var(--shadow-md)] transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {loading ? "Verificando…" : "Entrar"}
          </button>
          <button
            type="button"
            onClick={() => {
              setStep("email");
              setCode("");
              setError(null);
            }}
            className="text-muted-foreground hover:text-foreground mt-2.5 h-10 w-full rounded-xl text-[13.5px] font-medium transition-colors"
          >
            Usar otro correo
          </button>
        </form>
      )}
    </div>
  );
}
