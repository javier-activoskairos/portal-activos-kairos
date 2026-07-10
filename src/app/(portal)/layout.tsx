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
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
