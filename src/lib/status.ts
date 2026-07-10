// Mapea estados de Notion → tono visual (badge) en el portal.
export type Tone = "success" | "warning" | "danger" | "muted" | "brand";

const INCIDENT_TONE: Record<string, Tone> = {
  Pendiente: "danger",
  Solucionando: "warning",
  "En Espera": "warning",
  Escalada: "danger",
  Solucionada: "success",
  "Solucionada con Acciones Pendientes": "warning",
};

const ASSET_TONE: Record<string, Tone> = {
  "En Progreso": "brand",
  Terminado: "success",
};

export function incidentTone(status: string): Tone {
  return INCIDENT_TONE[status] ?? "muted";
}

export function assetTone(status: string): Tone {
  return ASSET_TONE[status] ?? "muted";
}

export const TONE_CLASS: Record<Tone, string> = {
  success: "bg-success text-success-foreground",
  warning: "bg-warning text-warning-foreground",
  danger: "bg-danger text-danger-foreground",
  brand: "bg-accent text-brand-accent",
  muted: "bg-muted text-muted-foreground",
};

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
