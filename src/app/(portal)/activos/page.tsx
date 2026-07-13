import { redirect } from "next/navigation";
import { getPortalDb } from "@/lib/session";
import { AssetsView, type AssetRow } from "@/components/assets-view";

export const metadata = { title: "Activos · Portal Activos Kairos" };
export const dynamic = "force-dynamic";

export default async function ActivosPage() {
  const ctx = await getPortalDb();
  if (!ctx) redirect("/acceso-denegado");
  const { db, companyId } = ctx;

  const { data } = await db
    .from("assets")
    .select(
      "id, name, status, desired_result, progress, priority, planned_at, started_at, ended_at, due_at, asset_url, tasks",
    )
    .eq("company_id", companyId)
    .order("started_at", { ascending: false, nullsFirst: false });

  const assets = (data ?? []) as AssetRow[];

  return <AssetsView assets={assets} />;
}
