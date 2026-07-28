import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Canjea el código de acceso por una sesión. Al hacerse en el servidor, las
 * cookies se escriben con httpOnly (ver SESSION_COOKIE_OPTIONS) y el token
 * deja de ser legible desde JavaScript.
 */
export async function POST(request: Request) {
  let email = "";
  let code = "";
  try {
    const body = await request.json();
    email = String(body.email ?? "").trim().toLowerCase();
    code = String(body.code ?? "").trim();
  } catch {
    return NextResponse.json({ error: "Petición inválida" }, { status: 400 });
  }

  if (!email || !code) {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  }

  // Un código de 7 dígitos son 10^7 combinaciones: sin límite por correo el
  // guessing es viable dentro de la ventana de 5 minutos.
  const ip = clientIp(request);
  const byIp = rateLimit(`verify:ip:${ip}`, 20, 15 * 60 * 1000);
  const byEmail = rateLimit(`verify:email:${email}`, 8, 15 * 60 * 1000);
  if (!byIp.ok || !byEmail.ok) {
    const retry = Math.max(byIp.retryAfterSeconds, byEmail.retryAfterSeconds);
    return NextResponse.json(
      { error: "Demasiados intentos. Espera unos minutos y vuelve a probar." },
      { status: 429, headers: { "Retry-After": String(retry) } },
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({
    email,
    token: code,
    type: "email",
  });
  if (error) {
    return NextResponse.json(
      { error: "Código incorrecto o caducado." },
      { status: 401 },
    );
  }

  return NextResponse.json({ ok: true });
}
