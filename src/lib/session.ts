import { createClient } from "@/lib/supabase/server";

export interface PortalSession {
  email: string;
  userId: string;
  companyId: string;
  companyName: string;
  role: "client" | "admin";
}

/**
 * Resuelve la sesión del portal: usuario auth + su fila portal_users + empresa.
 * Devuelve null si no hay sesión o el usuario no está autorizado (sin fila activa).
 */
export async function getPortalSession(): Promise<PortalSession | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: pu } = await supabase
    .from("portal_users")
    .select("company_id, role")
    .eq("auth_user_id", user.id)
    .eq("active", true)
    .maybeSingle();
  if (!pu) return null;

  const { data: company } = await supabase
    .from("companies")
    .select("name")
    .eq("id", pu.company_id)
    .maybeSingle();

  return {
    email: user.email ?? "",
    userId: user.id,
    companyId: pu.company_id,
    companyName: company?.name ?? "Activos Kairos",
    role: pu.role as "client" | "admin",
  };
}
