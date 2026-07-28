import { redirect } from "next/navigation";
import { getPortalDb } from "@/lib/session";
import { PortalNav } from "@/components/portal-nav";
import { exitViewAs } from "./admin/view-as-actions";
import { IconLogout } from "@/components/icons";
import { INCIDENT_OPEN } from "@/lib/status";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getPortalDb();
  // Autenticado pero sin acceso autorizado → fuera.
  if (!ctx) redirect("/acceso-denegado");
  const { session, db, companyId } = ctx;

  // Contador de incidencias abiertas para el badge del menú. Usa la lista
  // canónica de @/lib/status: antes este contador incluía "Escalada", que la
  // vista de Incidencias trata como resuelta, así que el badge decía "3" y en
  // la pantalla solo se veía 1 abierta.
  const { count: openIncidents } = await db
    .from("incidents")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .in("status", [...INCIDENT_OPEN]);

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
  // En "Ver como cliente" no se muestra nada interno (Sincronización): el
  // portal se ve exactamente igual que lo ve el cliente.
  const showInternal = session.role === "admin" && !va;

  return (
    <div className="bg-background min-h-screen">
      <PortalNav
        email={navEmail}
        displayName={navDisplayName}
        avatarUrl={navAvatar}
        companyName={session.companyName}
        logoUrl={session.logoUrl}
        isAdmin={showInternal}
        canBilling={session.canManageCompany}
        custodianUserIds={session.custodianUserIds}
        openIncidents={openIncidents ?? 0}
        // En previsualización el backend rechaza las escrituras con 403: los
        // CTA se deshabilitan para no invitar a una acción que va a fallar.
        readOnly={!!va}
      />
      <main className="transition-[margin] duration-200 min-[900px]:ml-[var(--kp-sidebar-w,244px)]">
        {/* Vista de cliente: píldora flotante, no una barra. Así el portal se
            renderiza exactamente igual que lo ve el cliente. */}
        {va && (
          <div className="fixed right-4 bottom-4 z-50 flex items-center gap-2.5 rounded-full bg-[rgba(15,12,9,0.88)] py-1.5 pr-1.5 pl-4 text-[12.5px] font-medium text-white shadow-[var(--shadow-lg)] backdrop-blur-md">
            <span className="whitespace-nowrap">
              Vista de <span className="font-bold">{va.companyName}</span>
            </span>
            <form action={exitViewAs}>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1.5 font-semibold whitespace-nowrap transition-colors hover:bg-white/30"
              >
                <IconLogout width={13} height={13} /> Salir
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
