import { redirect } from "next/navigation";
import { getPortalSession } from "@/lib/session";
import { PortalNav } from "@/components/portal-nav";
import { exitViewAs } from "./admin/view-as-actions";
import { IconLogout } from "@/components/icons";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getPortalSession();
  // Autenticado pero sin acceso autorizado → fuera.
  if (!session) redirect("/acceso-denegado");

  return (
    <div className="bg-background min-h-screen">
      <PortalNav
        email={session.email}
        companyName={session.companyName}
        isAdmin={session.role === "admin"}
      />
      <main className="min-[900px]:ml-[244px]">
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
