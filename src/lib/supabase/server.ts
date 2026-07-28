import { cookies } from "next/headers";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

import { SESSION_COOKIE_OPTIONS } from "./cookie-options";

export { SESSION_COOKIE_OPTIONS };

type CookieToSet = { name: string; value: string; options?: CookieOptions };

// Cliente Supabase para Server Components / Route Handlers.
// Usa la anon key + cookies de sesión → RLS aplica según el usuario logueado.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: SESSION_COOKIE_OPTIONS,
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, {
                ...options,
                ...SESSION_COOKIE_OPTIONS,
              }),
            );
          } catch {
            // Llamado desde un Server Component: lo gestiona el proxy.
          }
        },
      },
    },
  );
}
