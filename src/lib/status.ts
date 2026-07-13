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
  Escalada: { tone: "orange", dot: true },
  Solucionada: { tone: "success", dot: false },
  "Solucionada con Acciones Pendientes": { tone: "warning", dot: true },
};

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

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateShort(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
}

export function formatProgress(value: string | null | undefined): number {
  if (!value) return 0;
  const match = value.match(/(\d{1,3})\s*%/);
  if (match) return Math.min(100, Math.max(0, parseInt(match[1], 10)));
  return 0;
}
