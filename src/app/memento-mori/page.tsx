import { redirect } from "next/navigation";
import { getPortalSession } from "@/lib/session";
import { MementoMoriCalculator } from "@/components/memento-mori";

export const metadata = { title: "Memento Mori Empresarial · Activos Kairos" };
export const dynamic = "force-dynamic";

export default async function MementoMoriPage() {
  const session = await getPortalSession();
  if (!session) redirect("/acceso-denegado");
  return <MementoMoriCalculator />;
}
