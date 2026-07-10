"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      {step === "email" ? (
        <form onSubmit={sendCode} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Correo electrónico</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tucorreo@activoskairos.com"
            />
          </div>
          {error && <p className="text-sm text-danger-foreground">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Enviando…" : "Enviar código"}
          </Button>
        </form>
      ) : (
        <form onSubmit={verifyCode} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">Código de acceso</Label>
            <Input
              id="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="123456"
            />
            <p className="text-xs text-muted-foreground">
              Enviado a {email}.
            </p>
          </div>
          {error && <p className="text-sm text-danger-foreground">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Verificando…" : "Acceder"}
          </Button>
          <button
            type="button"
            className="w-full text-center text-xs text-muted-foreground hover:underline"
            onClick={() => {
              setStep("email");
              setCode("");
              setError(null);
            }}
          >
            Usar otro correo
          </button>
        </form>
      )}
    </div>
  );
}
