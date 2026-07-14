import { redirect } from "next/navigation";
import { getPortalDb } from "@/lib/session";
import { IncidentsView, type IncidentRow } from "./incidents-view";

export const metadata = { title: "Incidencias · Portal Activos Kairos" };
export const dynamic = "force-dynamic";

export default async function IncidenciasPage() {
  const ctx = await getPortalDb();
  if (!ctx) redirect("/acceso-denegado");
  const { db, companyId } = ctx;

  const { data } = await db
    .from("incidents")
    .select(
      "id, title, status, label, source, additional_info, response, error_url, response_url, created_at, created_by, attachments, resolved_at, sla_deadline",
    )
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  const incidents = (data ?? []) as IncidentRow[];

  return (
    <div className="portal-reveal space-y-6">
      <div>
        <p className="text-brand-accent text-[12.5px] font-semibold tracking-[0.14em] uppercase">
          Incidencias
        </p>
        <h1 className="text-foreground mt-2.5 text-[28px] leading-tight font-extrabold tracking-tight">
          Todo lo que ha pasado, en tu idioma.
        </h1>
        <p className="text-muted-foreground mt-1.5 max-w-[60ch] text-[15px] leading-relaxed">
          Sin jerga ni herramientas. Cada incidencia dice qué pasó y si ya está
          resuelta.
        </p>
      </div>
      <IncidentsView incidents={incidents} />
    </div>
  );
}
