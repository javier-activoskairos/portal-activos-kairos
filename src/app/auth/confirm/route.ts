import { type NextRequest, NextResponse } from "next/server";
import { type EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

// Confirma el enlace mágico del correo (fallback al código manual).
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/inicio";
  // Tras el proxy de Render, request.url apunta al host interno (localhost).
  const base = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin;

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) {
      return NextResponse.redirect(new URL(next, base));
    }
  }

  return NextResponse.redirect(new URL("/acceso-denegado", base));
}
