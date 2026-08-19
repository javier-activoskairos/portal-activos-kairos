import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
};

export default nextConfig;
