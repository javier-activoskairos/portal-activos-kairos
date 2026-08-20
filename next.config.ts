import type { NextConfig } from "next";

// Baseline de cabeceras. El portal no enviaba ninguna: sin X-Frame-Options la
// pantalla de acceso era enmarcable (clickjacking sobre el formulario de OTP).
//
// La CSP se queda deliberadamente en las directivas que no pueden romper nada:
// el portal carga datos de Supabase y ficheros de Notion desde el navegador, así
// que un `default-src`/`connect-src` restrictivo hay que probarlo con la app
// autenticada antes de activarlo. Lo que sí aporta hoy va aquí.
const CSP = [
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CSP },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  // No anunciar el framework ni su versión.
  poweredByHeader: false,

  images: {
    remotePatterns: [],
  },
  // El catálogo de /herramientas se fusionó con /primeros-pasos. Los redirects
  // se evalúan antes que el proxy y que el sistema de ficheros, así que los
  // enlaces ya compartidos siguen funcionando en vez de dar 404.
  // `permanent: true` → 308 (conserva el método de la petición).
  async redirects() {
    return [
      {
        source: "/herramientas",
        destination: "/primeros-pasos",
        permanent: true,
      },
    ];
  },

  async headers() {
    return [
      { source: "/:path*", headers: SECURITY_HEADERS },
      {
        // /login se prerenderiza, así que salía con `s-maxage=31536000`: un año
        // cacheada en el edge de Cloudflare. Nada que cachear en una pantalla
        // de acceso.
        source: "/login",
        headers: [{ key: "Cache-Control", value: "no-store, must-revalidate" }],
      },
    ];
  },
};

export default nextConfig;
