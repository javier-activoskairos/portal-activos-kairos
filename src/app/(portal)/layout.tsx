import { redirect } from "next/navigation";
import { getPortalSession } from "@/lib/session";
import { PortalNav } from "@/components/portal-nav";

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
        <div className="mx-auto w-full max-w-[1120px] px-4 py-6 min-[900px]:px-[clamp(24px,4vw,48px)] min-[900px]:py-9 min-[900px]:pb-16">
          {children}
        </div>
      </main>
    </div>
  );
}
