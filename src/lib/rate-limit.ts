/*
 * Limitador de peticiones en memoria (ventana deslizante simple).
 *
 * Alcance deliberadamente modesto: el portal corre en una sola instancia de
 * Render, así que un Map basta para frenar el guessing de códigos OTP y el
 * barrido de correos. No sustituye a un CAPTCHA en Supabase Auth ni sobrevive
 * a un reinicio; si algún día hay varias instancias, esto debe moverse a la BD.
 */

interface Hit {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Hit>();

// Poda perezosa: sin esto el Map crecería sin límite con el tiempo.
function prune(now: number) {
  if (buckets.size < 500) return;
  for (const [key, hit] of buckets) {
    if (hit.resetAt <= now) buckets.delete(key);
  }
}

export interface RateLimitResult {
  ok: boolean;
  retryAfterSeconds: number;
}

/**
 * Consume una unidad del cupo de `key`. Devuelve ok:false cuando se ha superado
 * `limit` dentro de `windowMs`.
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  prune(now);

  const hit = buckets.get(key);
  if (!hit || hit.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSeconds: 0 };
  }

  hit.count++;
  if (hit.count > limit) {
    return {
      ok: false,
      retryAfterSeconds: Math.max(1, Math.ceil((hit.resetAt - now) / 1000)),
    };
  }
  return { ok: true, retryAfterSeconds: 0 };
}

/** IP del cliente a partir de las cabeceras del proxy de Render. */
export function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "desconocida";
}
