import { NextResponse } from "next/server";
import { getPortalDb } from "@/lib/session";
import { INCIDENT_OPEN } from "@/lib/status";

export const dynamic = "force-dynamic";

/**
 * Contador de incidencias abiertas para el distintivo del menú.
 *
 * El menú vive en el layout y Next no vuelve a pedir el layout cuando se navega
 * por cliente entre páginas: el número que se calculó al abrir el portal se
 * queda congelado el resto de la sesión. Por eso el menú lo repesca desde aquí
 * en cada cambio de página, en vez de fiarse de la prop del servidor.
 */
export async function GET() {
  const ctx = await getPortalDb();
  if (!ctx)
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });

  const { count } = await ctx.db
    .from("incidents")
    .select("id", { count: "exact", head: true })
    .eq("company_id", ctx.companyId)
    .in("status", [...INCIDENT_OPEN]);

  return NextResponse.json({ open: count ?? 0 });
}
