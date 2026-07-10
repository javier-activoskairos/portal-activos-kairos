import type { MetadataRoute } from "next";

// Portal privado: no indexar en buscadores.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      disallow: "/",
    },
  };
}
