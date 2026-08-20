// Mapea estados de Notion → tono visual (badge) en el portal.
export type Tone =
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "purple"
  | "orange"
  | "muted"
  | "brandSoft"
  | "outline";

export interface BadgeSpec {
  tone: Tone;
  dot: boolean;
}

const INCIDENT_BADGE: Record<string, BadgeSpec> = {
  Pendiente: { tone: "danger", dot: true },
  Solucionando: { tone: "info", dot: true },
  "En Espera": { tone: "purple", dot: true },
  Verificación: { tone: "warning", dot: true },
  Escalada: { tone: "orange", dot: true },
  Solucionada: { tone: "success", dot: false },
};

/*
 * Fuente única de verdad de los estados de incidencia. Se corresponden 1:1 con
 * el status de [AKS] - Incidencias en Notion (grupos To-do / In progress /
 * Complete). Cualquier vista que agrupe incidencias DEBE usar `incidentBucket`
 * en vez de redefinir sus propios conjuntos.
 */
export const INCIDENT_OPEN = [
  "Pendiente",
  "Solucionando",
  "En Espera",
] as const;
export const INCIDENT_VERIFY = ["Verificación"] as const;
export const INCIDENT_RESOLVED = ["Solucionada", "Escalada"] as const;

export type IncidentBucket = "open" | "verify" | "resolved";

const OPEN_SET: ReadonlySet<string> = new Set(INCIDENT_OPEN);
const VERIFY_SET: ReadonlySet<string> = new Set(INCIDENT_VERIFY);

/**
 * Clasifica una incidencia. Los estados desconocidos caen en "resolved" por
 * descarte, de forma que un estado nuevo en Notion siga siendo visible en algún
 * sitio en vez de desaparecer de todas las secciones.
 */
export function incidentBucket(
  status: string | null | undefined,
): IncidentBucket {
  if (!status) return "resolved";
  if (OPEN_SET.has(status)) return "open";
  if (VERIFY_SET.has(status)) return "verify";
  return "resolved";
}

// Etiqueta de cara al cliente: la página promete "sin jerga", así que no se
// muestran los nombres internos de Notion.
const INCIDENT_STATUS_LABEL: Record<string, string> = {
  Pendiente: "Recibida",
  Solucionando: "En curso",
  "En Espera": "En espera",
  Verificación: "Lista para que la revises",
  Escalada: "Resuelta, con seguimiento",
  Solucionada: "Resuelta",
};

export function incidentStatusLabel(status: string | null | undefined): string {
  if (!status) return "—";
  return INCIDENT_STATUS_LABEL[status] ?? status;
}

const ASSET_BADGE: Record<string, BadgeSpec> = {
  "Por Empezar": { tone: "warning", dot: true },
  "En Progreso": { tone: "info", dot: true },
  Terminado: { tone: "success", dot: false },
};

// Etiqueta legible del estado del activo (el diseño llama "Propuesto" al
// estado interno "Por Empezar").
const ASSET_STATUS_LABEL: Record<string, string> = {
  "Por Empezar": "Propuesto",
  "En Progreso": "En Progreso",
  Terminado: "Terminado",
};

export function assetStatusLabel(status: string): string {
  return ASSET_STATUS_LABEL[status] ?? status;
}

// Prioridad del activo (Notion) → clave visual del portal.
export type PriorityKey = "alta" | "media" | "baja";

export function priorityKey(priority: string | null | undefined): PriorityKey {
  switch (priority) {
    case "Importante":
    case "Alta":
      return "alta";
    case "Media":
      return "media";
    default:
      return "baja";
  }
}

const PRIORITY_BADGE: Record<PriorityKey, BadgeSpec> = {
  alta: { tone: "danger", dot: true },
  media: { tone: "brandSoft", dot: true },
  baja: { tone: "muted", dot: true },
};

const PRIORITY_LABEL: Record<PriorityKey, string> = {
  alta: "Alta",
  media: "Media",
  baja: "Baja",
};

export function priorityBadge(priority: string | null | undefined): BadgeSpec {
  return PRIORITY_BADGE[priorityKey(priority)];
}

export function priorityLabel(priority: string | null | undefined): string {
  return PRIORITY_LABEL[priorityKey(priority)];
}

// Etiqueta de la incidencia (label) → tono visual.
const LABEL_BADGE: Record<string, BadgeSpec> = {
  Error: { tone: "danger", dot: true },
  Incidencia: { tone: "warning", dot: true },
  "Incidencia Externa": { tone: "info", dot: true },
};

export function incidentBadge(status: string): BadgeSpec {
  return INCIDENT_BADGE[status] ?? { tone: "muted", dot: false };
}

export function assetBadge(status: string): BadgeSpec {
  return ASSET_BADGE[status] ?? { tone: "muted", dot: false };
}

export function labelBadge(label: string | null | undefined): BadgeSpec {
  if (!label) return { tone: "muted", dot: true };
  return LABEL_BADGE[label] ?? { tone: "muted", dot: true };
}

export const TONE_CLASS: Record<Tone, string> = {
  success: "bg-success text-success-foreground",
  warning: "bg-warning text-warning-foreground",
  danger: "bg-danger text-danger-foreground",
  info: "bg-info text-info-foreground",
  purple: "bg-purple text-purple-foreground",
  orange: "bg-orange text-orange-foreground",
  brandSoft: "bg-accent-soft text-brand-accent",
  muted: "bg-muted text-muted-foreground",
  outline: "border border-border text-foreground",
};

const DOT_CLASS: Record<Tone, string> = {
  success: "bg-success-foreground",
  warning: "bg-warning-foreground",
  danger: "bg-danger-foreground",
  info: "bg-info-foreground",
  purple: "bg-purple-foreground",
  orange: "bg-orange-foreground",
  brandSoft: "bg-brand-accent",
  muted: "bg-muted-foreground",
  outline: "bg-foreground",
};

export function dotClass(tone: Tone): string {
  return DOT_CLASS[tone];
}

/*
 * Las fechas de Notion sin hora ("2026-08-01") se parsean como medianoche UTC.
 * Sin fijar zona, el navegador las formatea en la local y un cliente al oeste
 * (Empresas contempla idioma "Argentino") veía el día anterior. El negocio se
 * factura y se planifica en horario peninsular, así que se ancla ahí.
 */
export const DISPLAY_TIME_ZONE = "Europe/Madrid";

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: DISPLAY_TIME_ZONE,
  });
}

export function formatDateShort(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    timeZone: DISPLAY_TIME_ZONE,
  });
}

export function formatProgress(value: string | null | undefined): number {
  if (!value) return 0;
  const pctMatch = value.match(/(\d{1,3})\s*%/);
  if (pctMatch) return Math.min(100, Math.max(0, parseInt(pctMatch[1], 10)));
  // La fórmula "Progreso" de Notion devuelve una fracción (0–1). Si el valor es
  // <= 1 lo escalamos a porcentaje; si ya viene 0–100, se usa tal cual.
  const n = parseFloat(value);
  if (isNaN(n)) return 0;
  const pct = n <= 1 ? n * 100 : n;
  return Math.min(100, Math.max(0, Math.round(pct)));
}
