import { redirect } from "next/navigation";
import { getPortalDb } from "@/lib/session";
import { ConfigView } from "@/components/config-view";
import {
  hydrateProfileFromNotion,
  hydrateCompanyFromNotion,
} from "@/lib/profile-sync";

export const metadata = { title: "Configuración · Portal Activos Kairos" };
export const dynamic = "force-dynamic";

export default async function ConfiguracionPage() {
  const ctx = await getPortalDb();
  if (!ctx) redirect("/acceso-denegado");
  const { session, db, companyId } = ctx;

  const [{ data: profile }, { data: company }] = await Promise.all([
    db
      .from("portal_users")
      .select(
        "first_name, last_name, phone, role_title, personal_email, birthday, avatar_url",
      )
      .eq("auth_user_id", session.userId)
      .maybeSingle(),
    db
      .from("companies")
      .select("notion_id, fiscal_name, tax_id, address, city, region, postal_code")
      .eq("id", companyId)
      .maybeSingle(),
  ]);

  let profileValues = {
    firstName: profile?.first_name ?? "",
    lastName: profile?.last_name ?? "",
    phone: profile?.phone ?? "",
    roleTitle: profile?.role_title ?? "",
    personalEmail: profile?.personal_email ?? "",
    birthday: profile?.birthday ?? "",
    avatarUrl: profile?.avatar_url ?? null,
  };
  let companyValues = {
    fiscalName: company?.fiscal_name ?? "",
    taxId: company?.tax_id ?? "",
    address: company?.address ?? "",
    city: company?.city ?? "",
    region: company?.region ?? "",
    postalCode: company?.postal_code ?? "",
  };

  // Doble sync (Notion→Portal): rellena desde el CRM lo que esté vacío.
  if (session.contactNotionId) {
    profileValues = await hydrateProfileFromNotion({
      userId: session.userId,
      contactNotionId: session.contactNotionId,
      current: profileValues,
    });
  }
  if (company?.notion_id) {
    companyValues = await hydrateCompanyFromNotion({
      companyId,
      notionId: company.notion_id,
      current: companyValues,
    });
  }

  return (
    <ConfigView
      email={session.email}
      canManageCompany={session.canManageCompany}
      readOnly={!!session.viewingAs}
      profile={profileValues}
      company={companyValues}
    />
  );
}
