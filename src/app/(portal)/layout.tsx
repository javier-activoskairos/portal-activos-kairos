import { redirect } from "next/navigation";
import { getPortalDb } from "@/lib/session";
import { PortalNav } from "@/components/portal-nav";
import { exitViewAs } from "./admin/view-as-actions";
import { IconLogout } from "@/components/icons";

const OPEN_INCIDENTS = [
  "Pendiente",
  "Solucionando",
  "En Espera",
  "Escalada",
  "Solucionada con Acciones Pendientes",
];

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getPortalDb();
  // Autenticado pero sin acceso autorizado → fuera.
  if (!ctx) redirect("/acceso-denegado");
  const { session, db, companyId } = ctx;

  // Contador de incidencias abiertas para el badge del menú.
  const { count: openIncidents } = await db
    .from("incidents")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .in("status", OPEN_INCIDENTS);

  // Perfil del usuario (avatar/nombre) para el bloque inferior de la nav.
  const { data: me } = await db
    .from("portal_users")
    .select("first_name, last_name, avatar_url")
    .eq("auth_user_id", session.userId)
    .maybeSingle();

  const va = session.viewingAs;
  const navEmail = va?.userEmail ?? session.email;
  const navDisplayName = va
    ? va.displayName
    : [me?.first_name, me?.last_name].filter(Boolean).join(" ") || null;
  const navAvatar = va ? va.avatarUrl : (me?.avatar_url ?? null);

  return (
    <div className="bg-background min-h-screen">
      <PortalNav
        email={navEmail}
        displayName={navDisplayName}
        avatarUrl={navAvatar}
        companyName={session.companyName}
        logoUrl={session.logoUrl}
        isAdmin={session.role === "admin"}
        canBilling={session.canManageCompany}
        openIncidents={openIncidents ?? 0}
      />
      <main className="transition-[margin] duration-200 min-[900px]:ml-[var(--kp-sidebar-w,244px)]">
        {session.viewingAs && (
          <div className="bg-brand text-brand-foreground sticky top-0 z-30 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 px-4 py-2 text-center text-[13px] font-medium min-[900px]:top-0">
            <span>
              Vista de cliente ·{" "}
              <span className="font-bold">{session.viewingAs.companyName}</span>{" "}
              — es solo lectura
            </span>
            <form action={exitViewAs}>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[12.5px] font-semibold transition-colors hover:bg-white/30"
              >
                <IconLogout width={14} height={14} /> Salir de la vista
              </button>
            </form>
          </div>
        )}
        <div className="mx-auto w-full max-w-[1120px] px-4 py-6 min-[900px]:px-[clamp(24px,4vw,48px)] min-[900px]:py-9 min-[900px]:pb-16">
          {children}
        </div>
      </main>
    </div>
  );
}
