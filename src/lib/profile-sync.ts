import { notionClient, plainText, dateStart } from "@/lib/notion";
import { createAdminClient } from "@/lib/supabase/admin";
import { updateNotionContact } from "@/lib/notion-write";

export interface ProfileValues {
  firstName: string;
  lastName: string;
  phone: string;
  roleTitle: string;
  personalEmail: string;
  birthday: string;
  avatarUrl: string | null;
}

const AVATARS = "avatars";

/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Hidrata el perfil del Portal desde el Contacto del CRM de Notion (doble sync,
 * dirección Notion→Portal). Rellena en portal_users cada campo que esté vacío
 * con el valor del CRM. Si el Portal no tiene imagen pero el contacto sí, la
 * re-hospeda en Storage (las URLs de Notion caducan) y la fija en ambos lados.
 *
 * Devuelve los valores ya combinados para pintar la vista. Best-effort: ante
 * cualquier fallo de Notion devuelve los valores actuales sin romper la página.
 */
export async function hydrateProfileFromNotion(opts: {
  userId: string;
  contactNotionId: string;
  current: ProfileValues;
}): Promise<ProfileValues> {
  const { userId, contactNotionId, current } = opts;
  try {
    const page: any = await notionClient().pages.retrieve({
      page_id: contactNotionId,
    });
    const p = page.properties ?? {};

    const crm = {
      firstName: plainText(p["Nombre"]) ?? "",
      lastName: plainText(p["Apellidos"]) ?? "",
      phone: p["Teléfono"]?.phone_number ?? "",
      roleTitle: plainText(p["Cargo"]) ?? "",
      personalEmail: p["Email personal"]?.email ?? "",
      birthday: dateStart(p["Nacimiento"]) ?? "",
    };
    const imgFile = (p["Imagen"]?.files ?? [])[0];
    const crmImageUrl: string | null =
      imgFile?.external?.url ?? imgFile?.file?.url ?? null;

    // Combina: se conserva lo del Portal; si está vacío, se toma del CRM.
    const merged: ProfileValues = {
      firstName: current.firstName || crm.firstName,
      lastName: current.lastName || crm.lastName,
      phone: current.phone || crm.phone,
      roleTitle: current.roleTitle || crm.roleTitle,
      personalEmail: current.personalEmail || crm.personalEmail,
      birthday: current.birthday || crm.birthday,
      avatarUrl: current.avatarUrl,
    };

    const admin = createAdminClient();

    // Imagen: si el Portal no tiene pero el CRM sí, re-hospedar y fijar estable.
    if (!merged.avatarUrl && crmImageUrl) {
      try {
        const res = await fetch(crmImageUrl);
        if (res.ok) {
          const ct = res.headers.get("content-type") || "image/png";
          const ext = ct.includes("jpeg")
            ? "jpg"
            : ct.includes("webp")
              ? "webp"
              : ct.includes("gif")
                ? "gif"
                : "png";
          const buf = Buffer.from(await res.arrayBuffer());
          const path = `${userId}.${ext}`;
          const up = await admin.storage
            .from(AVATARS)
            .upload(path, buf, { contentType: ct, upsert: true });
          if (!up.error) {
            const { data: pub } = admin.storage.from(AVATARS).getPublicUrl(path);
            const stable = `${pub.publicUrl}?v=${page.last_edited_time ? Date.parse(page.last_edited_time) : 0}`;
            merged.avatarUrl = stable;
            // Fija la URL estable también en el CRM (evita caducidad).
            try {
              await updateNotionContact(contactNotionId, { avatarUrl: stable });
            } catch {
              /* best-effort */
            }
          }
        }
      } catch {
        /* best-effort: si falla la imagen, seguimos con el resto */
      }
    }

    // Persiste en el Portal solo lo que cambió (rellenar vacíos).
    const patch: Record<string, string | null> = {};
    if (!current.firstName && merged.firstName) patch.first_name = merged.firstName;
    if (!current.lastName && merged.lastName) patch.last_name = merged.lastName;
    if (!current.phone && merged.phone) patch.phone = merged.phone;
    if (!current.roleTitle && merged.roleTitle) patch.role_title = merged.roleTitle;
    if (!current.personalEmail && merged.personalEmail)
      patch.personal_email = merged.personalEmail;
    if (!current.birthday && merged.birthday) patch.birthday = merged.birthday;
    if (current.avatarUrl !== merged.avatarUrl && merged.avatarUrl)
      patch.avatar_url = merged.avatarUrl;

    if (Object.keys(patch).length > 0) {
      await admin.from("portal_users").update(patch).eq("auth_user_id", userId);
    }

    return merged;
  } catch (e) {
    console.error("[profile-sync] hydrate", e);
    return current;
  }
}

export interface CompanyFiscal {
  fiscalName: string;
  taxId: string;
  address: string;
  city: string;
  region: string;
  postalCode: string;
}

/**
 * Hidrata los datos fiscales de la empresa desde [AK] - Empresas (Notion→Portal).
 * Rellena en companies cada campo vacío con el del CRM. Provincia/Estado no
 * existe en Notion → se conserva lo del Portal.
 */
export async function hydrateCompanyFromNotion(opts: {
  companyId: string;
  notionId: string;
  current: CompanyFiscal;
}): Promise<CompanyFiscal> {
  const { companyId, notionId, current } = opts;
  try {
    const page: any = await notionClient().pages.retrieve({ page_id: notionId });
    const p = page.properties ?? {};
    const crm = {
      fiscalName: plainText(p["Nombre Empresa Facturación"]) ?? "",
      taxId: plainText(p["CIF/EIN"]) ?? "",
      address: plainText(p["Dirección"]) ?? "",
      city: plainText(p["Localidad"]) ?? "",
      postalCode: plainText(p["CP"]) ?? "",
    };
    const merged: CompanyFiscal = {
      fiscalName: current.fiscalName || crm.fiscalName,
      taxId: current.taxId || crm.taxId,
      address: current.address || crm.address,
      city: current.city || crm.city,
      region: current.region,
      postalCode: current.postalCode || crm.postalCode,
    };

    const patch: Record<string, string | null> = {};
    if (!current.fiscalName && merged.fiscalName) patch.fiscal_name = merged.fiscalName;
    if (!current.taxId && merged.taxId) patch.tax_id = merged.taxId;
    if (!current.address && merged.address) patch.address = merged.address;
    if (!current.city && merged.city) patch.city = merged.city;
    if (!current.postalCode && merged.postalCode) patch.postal_code = merged.postalCode;

    if (Object.keys(patch).length > 0) {
      const admin = createAdminClient();
      await admin.from("companies").update(patch).eq("id", companyId);
    }
    return merged;
  } catch (e) {
    console.error("[profile-sync] hydrate company", e);
    return current;
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */
