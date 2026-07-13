import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Cookie que activa la vista "Ver como cliente" (solo admins). Guarda el companyId destino. */
export const VIEW_AS_COOKIE = "kp_view_as";

export interface PortalSession {
  email: string;
  userId: string;
  companyId: string;
  companyName: string;
  role: "client" | "admin";
  /** Presente si un admin está previsualizando el portal de otro cliente. */
  viewingAs?: { companyId: string; companyName: string };
}

/**
 * Resuelve la sesión del portal: usuario auth + su fila portal_users + empresa.
 * Devuelve null si no hay sesión o el usuario no está autorizado (sin fila activa).
 *
 * Si el usuario es admin y tiene la cookie `kp_view_as` apuntando a otra empresa,
 * `companyId`/`companyName` pasan a ser los del cliente destino y se rellena
 * `viewingAs`. El rol real se conserva (admin) para poder salir de la vista.
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

  const session: PortalSession = {
    email: user.email ?? "",
    userId: user.id,
    companyId: pu.company_id,
    companyName: company?.name ?? "Activos Kairos",
    role: pu.role as "client" | "admin",
  };

  // Vista "Ver como cliente" — solo admins, empresa destino válida y distinta.
  if (session.role === "admin") {
    const cookieStore = await cookies();
    const target = cookieStore.get(VIEW_AS_COOKIE)?.value;
    if (target && target !== pu.company_id) {
      const admin = createAdminClient();
      const { data: tgt } = await admin
        .from("companies")
        .select("id, name")
        .eq("id", target)
        .maybeSingle();
      if (tgt) {
        session.companyId = tgt.id;
        session.companyName = tgt.name ?? "Cliente";
        session.viewingAs = {
          companyId: tgt.id,
          companyName: tgt.name ?? "Cliente",
        };
      }
    }
  }

  return session;
}

/**
 * Cliente de datos ya "apuntado" a la empresa efectiva de la sesión.
 * - Vista normal: cliente con la sesión del usuario (RLS lo restringe a su empresa).
 * - Vista "Ver como cliente": cliente service_role (bypassa RLS) — las consultas
 *   DEBEN filtrar por `companyId`, que aquí ya es el de la empresa destino.
 *
 * Devuelve null si no hay sesión autorizada.
 */
export async function getPortalDb(): Promise<{
  session: PortalSession;
  db: SupabaseClient;
  companyId: string;
} | null> {
  const session = await getPortalSession();
  if (!session) return null;
  const db = session.viewingAs
    ? (createAdminClient() as unknown as SupabaseClient)
    : ((await createClient()) as unknown as SupabaseClient);
  return { session, db, companyId: session.companyId };
}
