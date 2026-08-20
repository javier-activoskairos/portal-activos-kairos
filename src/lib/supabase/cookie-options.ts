/*
 * Opciones de las cookies de sesión de Supabase.
 *
 * Vive en su propio módulo, sin importar nada, porque lo consumen tanto el
 * cliente de servidor (que carga `next/headers`) como `proxy.ts`, que corre en
 * el runtime del proxy: importarlo desde `./server` arrastraría `next/headers`
 * a ese bundle.
 *
 * `httpOnly` es lo importante. Por defecto @supabase/ssr escribe estas cookies
 * legibles desde JavaScript y con 400 días de vida, de modo que cualquier XSS
 * se convierte en robo de sesión permanente. Se puede forzar httpOnly porque el
 * login se resuelve entero en el servidor (/api/auth/*) y ningún componente de
 * cliente necesita leer el token.
 */
export const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 30, // 30 días
};
