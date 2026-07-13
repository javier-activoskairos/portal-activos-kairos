import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  // Tras el proxy de Render, request.url apunta al host interno (localhost).
  // Usamos la URL pública del sitio para no redirigir a localhost.
  const base = process.env.NEXT_PUBLIC_SITE_URL || request.nextUrl.origin;
  return NextResponse.redirect(new URL("/login", base), {
    status: 303,
  });
}
