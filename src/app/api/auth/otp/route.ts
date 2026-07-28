import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/**
 * Envía el código de acceso. Se resuelve en el servidor (antes lo pedía el
 * navegador con la anon key) por dos motivos:
 *
 *  - La respuesta es SIEMPRE la misma. Supabase distingue entre un correo
 *    aprovisionado y uno que no lo está, lo que permitía enumerar por script
 *    qué correos corporativos tienen acceso al portal.
 *  - Permite limitar por IP y por correo.
 */
export async function POST(request: Request) {
  let email = "";
  try {
    const body = await request.json();
    email = String(body.email ?? "").trim().toLowerCase();
  } catch {
    return NextResponse.json({ error: "Petición inválida" }, { status: 400 });
  }

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Correo inválido" }, { status: 400 });
  }

  const ip = clientIp(request);
  const byIp = rateLimit(`otp:ip:${ip}`, 10, 15 * 60 * 1000);
  const byEmail = rateLimit(`otp:email:${email}`, 5, 15 * 60 * 1000);
  if (!byIp.ok || !byEmail.ok) {
    const retry = Math.max(byIp.retryAfterSeconds, byEmail.retryAfterSeconds);
    return NextResponse.json(
      { error: "Demasiados intentos. Espera unos minutos y vuelve a probar." },
      { status: 429, headers: { "Retry-After": String(retry) } },
    );
  }

  const supabase = await createClient();
  // shouldCreateUser:false → solo entran usuarios ya autorizados.
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false },
  });
  if (error) {
    // Se registra pero NO se refleja en la respuesta: para el cliente, pedir
    // código para un correo sin acceso es indistinguible de pedirlo para uno
    // válido. Quien tenga acceso recibirá el correo; quien no, nada.
    console.warn(`[auth:otp] ${email}: ${error.message}`);
  }

  return NextResponse.json({ ok: true });
}
