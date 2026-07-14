/* eslint-disable @typescript-eslint/no-explicit-any */
import { notionClient, plainText, statusName } from "@/lib/notion";
import { createAdminClient } from "@/lib/supabase/admin";

const EMPRESAS_DB = "0b692bd1-743e-4ccd-af88-746ef6c80570";
const CONTACTOS_DB = "912d0b8e-1c39-4071-8d15-dcb40a4f394b";

async function queryAll(notion: any, database_id: string, filter: any) {
  const out: any[] = [];
  let cursor: string | undefined;
  do {
    const res: any = await notion.databases.query({
      database_id,
      filter,
      start_cursor: cursor,
      page_size: 100,
    });
    out.push(...res.results);
    cursor = res.has_more ? res.next_cursor : undefined;
  } while (cursor);
  return out;
}

function slugify(s: string) {
  return (
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "empresa"
  );
}

export interface MemberPlanItem {
  email: string;
  empresaId: string;
  empresaName: string;
  estado: string | null;
  contactId: string;
  facturacion: boolean;
}

/**
 * Provisión de miembros del portal desde Notion.
 *
 * Reglas de admisión:
 *  - La empresa tiene membresía activa (Tempo o Stasis): "Membresía" con
 *    relación, o "Es Tempo?" = true.
 *  - El contacto está "Activo" y tiene el rol "Avans" O "Facturación".
 *  - El rol "Facturación" (checkbox) concede `can_manage_company`
 *    (podrá cambiar la configuración de su empresa).
 *
 * Por defecto es DRY-RUN: no modifica nada y devuelve el plan de miembros
 * elegibles. Con `{ apply: true }` crea/actualiza filas (companies +
 * portal_users) de forma idempotente, sin degradar nunca a un admin existente.
 */
export async function syncPortalMembers({
  apply = false,
}: { apply?: boolean } = {}) {
  const admin = createAdminClient();
  const notion = notionClient();

  // 1) Empresas con membresía activa (Tempo o Stasis).
  const companies = await queryAll(notion, EMPRESAS_DB, {
    or: [
      { property: "Membresía", relation: { is_not_empty: true } },
      { property: "Es Tempo?", formula: { checkbox: { equals: true } } },
    ],
  });
  const eligibleCompanies = new Map<
    string,
    { name: string; estado: string | null }
  >();
  for (const c of companies) {
    eligibleCompanies.set(c.id, {
      name: plainText(c.properties["Nombre"]) ?? "Empresa",
      estado: statusName(c.properties["Estado"]),
    });
  }

  // 2) Contactos "Activo" con rol "Avans" o "Facturación".
  const contacts = await queryAll(notion, CONTACTOS_DB, {
    and: [
      { property: "Estado", status: { equals: "Activo" } },
      {
        or: [
          { property: "Avans", checkbox: { equals: true } },
          { property: "Facturación", checkbox: { equals: true } },
        ],
      },
    ],
  });

  const plan: MemberPlanItem[] = [];
  for (const ct of contacts) {
    const email = ct.properties["Email"]?.email as string | undefined;
    const empresaId = ct.properties["Empresa"]?.relation?.[0]?.id as
      | string
      | undefined;
    if (!email || !empresaId || !eligibleCompanies.has(empresaId)) continue;
    const info = eligibleCompanies.get(empresaId)!;
    plan.push({
      email: email.toLowerCase(),
      empresaId,
      empresaName: info.name,
      estado: info.estado,
      contactId: ct.id,
      facturacion: ct.properties["Facturación"]?.checkbox === true,
    });
  }

  if (!apply) {
    return {
      applied: false,
      eligibleCompanies: eligibleCompanies.size,
      eligibleMembers: plan.length,
      plan,
    };
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;
  for (const m of plan) {
    // Asegura la fila de empresa.
    const { data: comp } = await admin
      .from("companies")
      .select("id")
      .eq("notion_id", m.empresaId)
      .maybeSingle();
    let companyId = comp?.id as string | undefined;
    if (!companyId) {
      const ins = await admin
        .from("companies")
        .insert({
          notion_id: m.empresaId,
          name: m.empresaName,
          estado: m.estado,
          is_client: true,
          active: true,
          slug: `${slugify(m.empresaName)}-${m.empresaId.replace(/-/g, "").slice(0, 6)}`,
        })
        .select("id")
        .single();
      if (ins.error) throw ins.error;
      companyId = ins.data.id;
    }

    // Upsert del usuario por email (nunca degradar a un admin).
    const { data: existing } = await admin
      .from("portal_users")
      .select("id, role")
      .eq("email", m.email)
      .maybeSingle();
    if (existing) {
      if (existing.role === "admin") {
        skipped++;
        continue;
      }
      const upd = await admin
        .from("portal_users")
        .update({
          company_id: companyId,
          contact_notion_id: m.contactId,
          can_manage_company: m.facturacion,
          active: true,
        })
        .eq("id", existing.id);
      if (upd.error) throw upd.error;
      updated++;
    } else {
      const ins = await admin.from("portal_users").insert({
        email: m.email,
        company_id: companyId,
        role: "client",
        active: true,
        contact_notion_id: m.contactId,
        can_manage_company: m.facturacion,
      });
      if (ins.error) throw ins.error;
      created++;
    }
  }
  return {
    applied: true,
    eligibleCompanies: eligibleCompanies.size,
    eligibleMembers: plan.length,
    created,
    updated,
    skipped,
  };
}
