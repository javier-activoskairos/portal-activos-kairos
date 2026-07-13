import { createClient } from "@/lib/supabase/server";
import { AssetsView, type AssetRow } from "@/components/assets-view";

export const metadata = { title: "Activos · Portal Activos Kairos" };
export const dynamic = "force-dynamic";

export default async function ActivosPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("assets")
    .select(
      "id, name, status, desired_result, progress, priority, planned_at, started_at, ended_at, due_at, asset_url, tasks",
    )
    .order("started_at", { ascending: false, nullsFirst: false });

  const assets = (data ?? []) as AssetRow[];

  return <AssetsView assets={assets} />;
}
