import { Client } from "@notionhq/client";

// Cliente Notion (solo servidor / cron). Token de lectura sobre Activos + Incidencias.
export function notionClient() {
  const auth = process.env.NOTION_TOKEN;
  if (!auth) throw new Error("Falta NOTION_TOKEN");
  return new Client({ auth });
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
  const text = arr.map((t: any) => t.plain_text).join("").trim();
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
