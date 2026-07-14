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
  logoUrl: string | null;
  plan: string | null;
  sector: string | null;
  /** Semanas de racha del plan (Tempo/Stasis) para el bloque del Inicio. */
  planStreakWeeks: number;
  /** Notion ID del Contacto del usuario (para "Creado por" en incidencias). */
  contactNotionId: string | null;
  /** Rol "Facturación": puede cambiar la configuración de su empresa. */
  canManageCompany: boolean;
  role: "client" | "admin";
  /** Presente si un admin está previsualizando el portal de otro cliente.
   * Incluye la identidad de un usuario representativo de esa empresa para
   * impersonar del todo (saludo, bloque de usuario, perfil de configuración). */
  viewingAs?: {
    companyId: string;
    companyName: string;
    userEmail: string;
    displayName: string | null;
    contactNotionId: string | null;
    portalUserId: string | null;
    avatarUrl: string | null;
  };
}

// Buzones genéricos que preferimos NO usar como identidad representativa.
const GENERIC_MAILBOX =
  /^(admin|administracion|administración|facturacion|facturación|info|hola|contacto|ventas|soporte|hello|team|equipo|no-?reply)$/i;

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
    .select("company_id, role, contact_notion_id, can_manage_company")
    .eq("auth_user_id", user.id)
    .eq("active", true)
    .maybeSingle();
  if (!pu) return null;

  const { data: company } = await supabase
    .from("companies")
    .select("name, logo_url, plan, sector, plan_streak_weeks")
    .eq("id", pu.company_id)
    .maybeSingle();

  const session: PortalSession = {
    email: user.email ?? "",
    userId: user.id,
    companyId: pu.company_id,
    companyName: company?.name ?? "Activos Kairos",
    logoUrl: company?.logo_url ?? null,
    plan: company?.plan ?? null,
    sector: company?.sector ?? null,
    planStreakWeeks: company?.plan_streak_weeks ?? 0,
    contactNotionId: pu.contact_notion_id ?? null,
    canManageCompany: pu.can_manage_company ?? false,
    role: pu.role as "client" | "admin",
  };

  // Vista "Ver como cliente" — solo admins, empresa destino válida y distinta.
  if (session.role === "admin") {
    const cookieStore = await cookies();
    // Cookie: "companyId" o "companyId|portalUserId" (usuario concreto a impersonar).
    const raw = cookieStore.get(VIEW_AS_COOKIE)?.value ?? "";
    const [target, forcedUserId] = raw.split("|");
    if (target && target !== pu.company_id) {
      const admin = createAdminClient();
      const { data: tgt } = await admin
        .from("companies")
        .select("id, name, logo_url, plan, sector, plan_streak_weeks")
        .eq("id", target)
        .maybeSingle();
      if (tgt) {
        session.companyId = tgt.id;
        session.companyName = tgt.name ?? "Cliente";
        session.logoUrl = tgt.logo_url ?? null;
        session.plan = tgt.plan ?? null;
        session.sector = tgt.sector ?? null;
        session.planStreakWeeks = tgt.plan_streak_weeks ?? 0;

        // Usuario representativo de la empresa: impersonación completa.
        const { data: reps } = await admin
          .from("portal_users")
          .select("id, email, contact_notion_id, first_name, last_name, avatar_url")
          .eq("company_id", tgt.id)
          .eq("active", true)
          .neq("role", "admin");
        const bestPick = (reps ?? []).slice().sort((a, b) => {
          const ga = GENERIC_MAILBOX.test(a.email.split("@")[0]) ? 1 : 0;
          const gb = GENERIC_MAILBOX.test(b.email.split("@")[0]) ? 1 : 0;
          if (ga !== gb) return ga - gb;
          const na = a.first_name ? 0 : 1;
          const nb = b.first_name ? 0 : 1;
          if (na !== nb) return na - nb;
          return a.email.localeCompare(b.email);
        })[0];
        // Si se eligió un contacto concreto (fase 2), se usa ese; si no, el mejor.
        const best =
          (forcedUserId && (reps ?? []).find((r) => r.id === forcedUserId)) ||
          bestPick;
        const displayName = best
          ? [best.first_name, best.last_name].filter(Boolean).join(" ") || null
          : null;

        session.viewingAs = {
          companyId: tgt.id,
          companyName: tgt.name ?? "Cliente",
          userEmail: best?.email ?? session.email,
          displayName,
          contactNotionId: best?.contact_notion_id ?? null,
          portalUserId: best?.id ?? null,
          avatarUrl: best?.avatar_url ?? null,
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
