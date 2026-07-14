import { NextResponse } from "next/server";
import { getPortalSession } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { updateNotionCompany } from "@/lib/notion-write";

export const dynamic = "force-dynamic";

const clean = (v: unknown) => {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length ? s : null;
};

/**
 * Guarda los datos fiscales de la empresa. Solo rol "Facturación"
 * (can_manage_company). Escribe en companies (Portal) y sincroniza de vuelta a
 * la Empresa de Notion (doble sync). Provincia/Estado solo se guarda en Portal.
 */
export async function PUT(request: Request) {
  const session = await getPortalSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (!session.canManageCompany) {
    return NextResponse.json(
      { error: "No tienes acceso de Facturación" },
      { status: 403 },
    );
  }
  if (session.viewingAs) {
    return NextResponse.json(
      { error: "No puedes editar datos en modo previsualización" },
      { status: 403 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Formato inválido" }, { status: 400 });
  }

  const fiscalName = clean(body.fiscalName);
  const taxId = clean(body.taxId);
  const address = clean(body.address);
  const city = clean(body.city);
  const region = clean(body.region);
  const postalCode = clean(body.postalCode);

  const admin = createAdminClient();
  const { data: company, error } = await admin
    .from("companies")
    .update({
      fiscal_name: fiscalName,
      tax_id: taxId,
      address,
      city,
      region,
      postal_code: postalCode,
    })
    .eq("id", session.companyId)
    .select("notion_id")
    .maybeSingle();
  if (error) {
    return NextResponse.json(
      { error: "No se pudieron guardar los datos fiscales" },
      { status: 500 },
    );
  }

  let notionSynced = true;
  if (company?.notion_id) {
    try {
      await updateNotionCompany(company.notion_id, {
        fiscalName,
        taxId,
        address,
        city,
        postalCode,
      });
    } catch (e) {
      notionSynced = false;
      console.error("[config:empresa] Notion write-back", e);
    }
  }

  return NextResponse.json({ ok: true, notionSynced });
}
