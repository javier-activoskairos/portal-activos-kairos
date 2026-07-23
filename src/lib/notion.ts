import { Client } from "@notionhq/client";

// Firma del fetch que acepta el SDK de Notion (ClientOptions["fetch"]).
type FetchNotion = (
  url: string,
  init?: {
    agent?: unknown;
    body?: string;
    headers?: Record<string, string>;
    method?: string;
  },
) => Promise<{
  ok: boolean;
  text: () => Promise<string>;
  headers: unknown;
  status: number;
}>;

// Códigos que indican un fallo transitorio del borde de Notion (Cloudflare) o
// un rate limit: se reintentan. El resto de errores se propagan tal cual.
const REINTENTABLES = new Set([429, 500, 502, 503, 504]);
const MAX_INTENTOS = 5;
const ESPERA_BASE_MS = 500;

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

// fetch con backoff exponencial. Sin esto, un 502 Bad Gateway puntual de la API
// de Notion aborta el sync completo (incidencia sync-assets del 22/07/2026).
export const fetchConReintento: FetchNotion = async (url, init) => {
  // `agent` es propio del SDK y no lo acepta el fetch global de Node.
  const { agent: _agent, ...rest } = init ?? {};
  let ultimoError: unknown = null;

  for (let intento = 1; intento <= MAX_INTENTOS; intento++) {
    try {
      const res = await fetch(url, rest as RequestInit);
      if (!REINTENTABLES.has(res.status) || intento === MAX_INTENTOS)
        return res;
      console.warn(
        `[notion] ${res.status} en ${url} - reintento ${intento}/${MAX_INTENTOS - 1}`,
      );
    } catch (err) {
      // Fallo de red (ECONNRESET, timeout DNS...). Mismo tratamiento.
      ultimoError = err;
      if (intento === MAX_INTENTOS) throw err;
      console.warn(
        `[notion] error de red en ${url} - reintento ${intento}/${MAX_INTENTOS - 1}`,
      );
    }
    await espera(ESPERA_BASE_MS * 2 ** (intento - 1));
  }

  throw ultimoError ?? new Error("Notion: reintentos agotados");
};

// Cliente Notion (solo servidor / cron). Token de lectura sobre Activos + Incidencias.
export function notionClient() {
  const auth = process.env.NOTION_TOKEN;
  if (!auth) throw new Error("Falta NOTION_TOKEN");
  return new Client({ auth, fetch: fetchConReintento });
}

// ---------------------------------------------------------------------------
// Extractores tolerantes de propiedades Notion → primitivos JS
// ---------------------------------------------------------------------------
/* eslint-disable @typescript-eslint/no-explicit-any */
export function plainText(prop: any): string | null {
  if (!prop) return null;
  const arr =
    prop.type === "title"
      ? prop.title
      : prop.type === "rich_text"
        ? prop.rich_text
        : null;
  if (!arr || arr.length === 0) return null;
  const text = arr
    .map((t: any) => t.plain_text)
    .join("")
    .trim();
  return text || null;
}

export function statusName(prop: any): string | null {
  if (!prop) return null;
  if (prop.type === "status") return prop.status?.name ?? null;
  if (prop.type === "select") return prop.select?.name ?? null;
  return null;
}

export function selectName(prop: any): string | null {
  return prop?.select?.name ?? null;
}

export function urlValue(prop: any): string | null {
  return prop?.url ?? null;
}

export function dateStart(prop: any): string | null {
  if (!prop) return null;
  if (prop.type === "date") return prop.date?.start ?? null;
  if (prop.type === "created_time") return prop.created_time ?? null;
  return null;
}

export function dateEnd(prop: any): string | null {
  if (prop?.type === "date") return prop.date?.end ?? null;
  return null;
}

export function formulaValue(prop: any): string | null {
  if (prop?.type !== "formula") return null;
  const f = prop.formula;
  if (!f) return null;
  if (f.type === "string") return f.string ?? null;
  if (f.type === "number") return f.number != null ? String(f.number) : null;
  if (f.type === "date") return f.date?.start ?? null;
  if (f.type === "boolean") return f.boolean != null ? String(f.boolean) : null;
  return null;
}

export function firstRelationId(prop: any): string | null {
  if (prop?.type !== "relation") return null;
  return prop.relation?.[0]?.id ?? null;
}

// Normaliza un id de Notion a formato con guiones (para comparar/guardar).
export function normalizeId(id: string | null | undefined): string | null {
  if (!id) return null;
  const raw = id.replace(/-/g, "");
  if (raw.length !== 32) return id;
  return `${raw.slice(0, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}-${raw.slice(16, 20)}-${raw.slice(20)}`;
}
/* eslint-enable @typescript-eslint/no-explicit-any */
