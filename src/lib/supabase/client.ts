import { createBrowserClient } from "@supabase/ssr";

/*
 * SIN USO. Se conserva por si alguna vez hiciera falta Supabase en el
 * navegador, pero NO debe emplearse para autenticar.
 *
 * Las cookies de sesión son httpOnly (ver SESSION_COOKIE_OPTIONS en
 * ./server.ts) precisamente para que un XSS no pueda robarlas. Este cliente no
 * puede leerlas, y usarlo para iniciar sesión volvería a escribirlas desde
 * JavaScript, deshaciendo esa protección. El login vive en /api/auth/*.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
