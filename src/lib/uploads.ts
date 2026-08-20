/*
 * Validación de imágenes subidas por el usuario.
 *
 * Dos reglas que no se pueden relajar:
 *  1. La extensión de la clave de Storage se deriva del MIME validado, NUNCA
 *     del `filename` del multipart. El nombre lo controla el cliente y las
 *     subidas van con service_role: interpolarlo en la ruta permite escapar
 *     del bucket (`%2e%2e%2f...`) y escribir en cualquier otro.
 *  2. Solo mapas de bits. `image/svg+xml` es un documento ejecutable: servido
 *     desde Storage ejecutaría su JS embebido en el origen del proyecto.
 */

const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
};

/** Extensiones que puede haber generado este módulo (para borrados). */
export const IMAGE_EXTENSIONS = ["png", "jpg", "webp", "gif"] as const;

export const IMAGE_TYPES_HELP = "PNG, JPG, WEBP o GIF";

/**
 * Extensión segura para la clave de Storage, o `null` si el tipo no está
 * permitido. El `type` del File viene de la cabecera multipart (controlada por
 * el cliente), así que esto es una allowlist, no una comprobación de confianza:
 * el valor devuelto es siempre uno de los literales de arriba.
 */
export function safeImageExtension(
  mime: string | null | undefined,
): string | null {
  if (!mime) return null;
  // El navegador puede añadir parámetros ("image/png; charset=..."), y el
  // registro IANA no distingue mayúsculas.
  const base = mime.split(";")[0]!.trim().toLowerCase();
  return ALLOWED_IMAGE_TYPES[base] ?? null;
}

/** Sanea un nombre para usarlo en `Content-Disposition` o como metadato. */
export function safeFileName(
  name: string | null | undefined,
  fallback: string,
): string {
  const cleaned = (name ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\w.-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return cleaned || fallback;
}
