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
  if (f.firstName !== undefined) properties["Nombre"] = { title: rich(f.firstName) };
  if (f.lastName !== undefined) properties["Apellidos"] = { rich_text: rich(f.lastName) };
  if (f.phone !== undefined)
    properties["Teléfono"] = { phone_number: f.phone?.trim() || null };
  if (f.roleTitle !== undefined) properties["Cargo"] = { rich_text: rich(f.roleTitle) };
  if (f.personalEmail !== undefined)
    properties["Email personal"] = { email: f.personalEmail?.trim() || null };
  if (f.birthday !== undefined) properties["Nacimiento"] = { date: dateProp(f.birthday) };
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
    properties["Nombre Empresa Facturación"] = { rich_text: rich(f.fiscalName) };
  if (f.taxId !== undefined) properties["CIF/EIN"] = { rich_text: rich(f.taxId) };
  if (f.address !== undefined) properties["Dirección"] = { rich_text: rich(f.address) };
  if (f.city !== undefined) properties["Localidad"] = { rich_text: rich(f.city) };
  if (f.postalCode !== undefined) properties["CP"] = { rich_text: rich(f.postalCode) };
  await notionClient().pages.update({ page_id: pageId, properties } as any);
}
/* eslint-enable @typescript-eslint/no-explicit-any */
