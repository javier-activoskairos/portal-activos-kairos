// Mapea estados de Notion → tono visual (badge) en el portal.
export type Tone =
  | "success"
  | "warning"
  | "danger"
  | "muted"
  | "brandSoft"
  | "outline";

export interface BadgeSpec {
  tone: Tone;
  dot: boolean;
}

const INCIDENT_BADGE: Record<string, BadgeSpec> = {
  Pendiente: { tone: "danger", dot: true },
  Solucionando: { tone: "warning", dot: true },
  "En Espera": { tone: "warning", dot: true },
  Escalada: { tone: "danger", dot: true },
  Solucionada: { tone: "success", dot: false },
  "Solucionada con Acciones Pendientes": { tone: "warning", dot: true },
};

const ASSET_BADGE: Record<string, BadgeSpec> = {
  "En Progreso": { tone: "brandSoft", dot: true },
  Terminado: { tone: "success", dot: false },
};

export function incidentBadge(status: string): BadgeSpec {
  return INCIDENT_BADGE[status] ?? { tone: "muted", dot: false };
}

export function assetBadge(status: string): BadgeSpec {
  return ASSET_BADGE[status] ?? { tone: "muted", dot: false };
}

export const TONE_CLASS: Record<Tone, string> = {
  success: "bg-success text-success-foreground",
  warning: "bg-warning text-warning-foreground",
  danger: "bg-danger text-danger-foreground",
  brandSoft: "bg-accent-soft text-brand-accent",
  muted: "bg-muted text-muted-foreground",
  outline: "border border-border text-foreground",
};

const DOT_CLASS: Record<Tone, string> = {
  success: "bg-success-foreground",
  warning: "bg-warning-foreground",
  danger: "bg-danger-foreground",
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
