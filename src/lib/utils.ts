import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Nombre "amable" a partir del correo (parte local, capitalizada). */
export function nameFromEmail(email: string): string {
  const local = (email.split("@")[0] || "").trim();
  if (!local) return "";
  const first = local.split(/[._-]+/)[0] || local;
  return first.charAt(0).toUpperCase() + first.slice(1);
}

/** Iniciales (1-2 letras) a partir del correo. */
export function initialsFromEmail(email: string): string {
  const local = (email.split("@")[0] || "").trim();
  if (!local) return "?";
  const parts = local.split(/[._-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return local.slice(0, 2).toUpperCase();
}
