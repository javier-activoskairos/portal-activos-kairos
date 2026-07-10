import { createClient } from "@/lib/supabase/server";
import { IncidentsView, type IncidentRow } from "./incidents-view";

export const metadata = { title: "Incidencias · Portal Activos Kairos" };
export const dynamic = "force-dynamic";

export default async function IncidenciasPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("incidents")
    .select(
      "id, title, status, label, source, response, created_at, resolved_at, sla_deadline",
    )
    .order("created_at", { ascending: false });

  const incidents = (data ?? []) as IncidentRow[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Incidencias</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Histórico de incidencias y su estado de resolución.
        </p>
      </div>
      <IncidentsView incidents={incidents} />
    </div>
  );
}
