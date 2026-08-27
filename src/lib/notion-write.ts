import { notionClient } from "@/lib/notion";

/* eslint-disable @typescript-eslint/no-explicit-any */
const rich = (v: string | null | undefined) =>
  v && v.trim() ? [{ type: "text", text: { content: v.trim() } }] : [];
const dateProp = (v: string | null | undefined) =>
  v && v.trim() ? { start: v.trim() } : null;

/**
 * Escribe de vuelta el perfil del usuario en su Contacto de Notion
 * ([AK] - Contactos). Best-effort: si Notion falla, se registra y sigue.
 */
export async function updateNotionContact(
  pageId: string,
  f: {
    firstName?: string | null;
    lastName?: string | null;
    phone?: string | null;
    roleTitle?: string | null;
    personalEmail?: string | null;
    birthday?: string | null;
    avatarUrl?: string | null;
  },
) {
  const properties: Record<string, any> = {};
  // "Nombre" es el TÍTULO de la página en [AK] - Contactos. Enviar un título
  // vacío dejaría el contacto como "Untitled" en el CRM, así que un nombre en
  // blanco simplemente no se propaga: el portal lo admite, Notion conserva el
  // que ya tenía.
  if (f.firstName !== undefined && f.firstName?.trim())
    properties["Nombre"] = { title: rich(f.firstName) };
  if (f.lastName !== undefined)
    properties["Apellidos"] = { rich_text: rich(f.lastName) };
  if (f.phone !== undefined)
    properties["Teléfono"] = { phone_number: f.phone?.trim() || null };
  if (f.roleTitle !== undefined)
    properties["Cargo"] = { rich_text: rich(f.roleTitle) };
  if (f.personalEmail !== undefined)
    properties["Email personal"] = { email: f.personalEmail?.trim() || null };
  if (f.birthday !== undefined)
    properties["Nacimiento"] = { date: dateProp(f.birthday) };
  if (f.avatarUrl !== undefined)
    properties["Imagen"] = {
      files: f.avatarUrl
        ? [{ type: "external", name: "avatar", external: { url: f.avatarUrl } }]
        : [],
    };
  await notionClient().pages.update({ page_id: pageId, properties } as any);
}

/**
 * Escribe de vuelta los datos fiscales en la Empresa de Notion
 * ([AK] - Empresas). Provincia/Estado no tiene propiedad en Notion → solo Portal.
 */
export async function updateNotionCompany(
  pageId: string,
  f: {
    fiscalName?: string | null;
    taxId?: string | null;
    address?: string | null;
    city?: string | null;
    postalCode?: string | null;
  },
) {
  const properties: Record<string, any> = {};
  if (f.fiscalName !== undefined)
    properties["Nombre Empresa Facturación"] = {
      rich_text: rich(f.fiscalName),
    };
  if (f.taxId !== undefined)
    properties["CIF/EIN"] = { rich_text: rich(f.taxId) };
  if (f.address !== undefined)
    properties["Dirección"] = { rich_text: rich(f.address) };
  if (f.city !== undefined)
    properties["Localidad"] = { rich_text: rich(f.city) };
  if (f.postalCode !== undefined)
    properties["CP"] = { rich_text: rich(f.postalCode) };
  await notionClient().pages.update({ page_id: pageId, properties } as any);
}

/** Estado de [AKS] - Incidencias que usa el portal al anular. */
export const NOTION_INCIDENT_CANCELLED = "Anulada";

/**
 * Anula una incidencia en [AKS] - Incidencias: pasa el Estado a "Anulada",
 * cierra "Fin" y deja el motivo del cliente en "Respuesta" sin pisar lo que ya
 * hubiera escrito el equipo (se antepone el nuevo texto).
 *
 * A diferencia de reabrir/verificar, aquí no hay webhook de n8n: no hay nada
 * que orquestar más allá del cambio de estado, así que se escribe directo con
 * el token de Notion del portal (mismo camino que `updateNotionContact`).
 */
export async function cancelNotionIncident(
  pageId: string,
  f: { motivo: string; email: string | null; previousResponse?: string | null },
) {
  const stamp = new Date().toISOString().slice(0, 10);
  const quien = f.email?.trim() ? ` por ${f.email.trim()}` : "";
  const nota = `Anulada desde el portal${quien} el ${stamp}: ${f.motivo.trim()}`;
  const previo = f.previousResponse?.trim();
  // Notion corta los rich_text a 2000 caracteres por bloque de texto; el motivo
  // ya llega recortado desde la ruta, así que solo se acota el histórico.
  const content = previo ? `${nota}\n\n${previo}`.slice(0, 2000) : nota;
  await notionClient().pages.update({
    page_id: pageId,
    properties: {
      Estado: { status: { name: NOTION_INCIDENT_CANCELLED } },
      Fin: { date: { start: stamp } },
      Respuesta: { rich_text: [{ type: "text", text: { content } }] },
    },
  } as any);
}
/* eslint-enable @typescript-eslint/no-explicit-any */
