import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { SESSION_COOKIE_OPTIONS } from "@/lib/supabase/cookie-options";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

// Convención `proxy` de Next.js 16 (sustituye a `middleware`).
// Refresca la sesión de Supabase en cada request y protege las rutas privadas.
export default async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: SESSION_COOKIE_OPTIONS,
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, {
              ...options,
              ...SESSION_COOKIE_OPTIONS,
            }),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic =
    path === "/login" || path.startsWith("/auth") || path === "/acceso-denegado";

  // Las rutas /api responden JSON: redirigirlas a /login hacía que `fetch`
  // siguiera el 302 y `res.json()` reventara con un SyntaxError sobre el HTML
  // del login, así que los modales mostraban un error genérico en vez de pedir
  // volver a entrar.
  if (!user && path.startsWith("/api")) {
    if (path.startsWith("/api/auth")) return response;
    return NextResponse.json(
      { error: "Tu sesión ha caducado. Vuelve a entrar." },
      { status: 401 },
    );
  }

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  if (user && path === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/inicio";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // Protege todo salvo estáticos y assets. Las rutas /api gestionan su propia auth.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
