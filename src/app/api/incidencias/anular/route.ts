import { NextResponse } from "next/server";
import { getPortalDb } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { cancelNotionIncident } from "@/lib/notion-write";
import { INCIDENT_CANCELLABLE } from "@/lib/status";

export const dynamic = "force-dynamic";

const MAX_MOTIVO = 1900;

const CANCELLABLE: ReadonlySet<string> = new Set(INCIDENT_CANCELLABLE);

/**
 * Anula una incidencia desde el portal: el cliente retira una incidencia que ya
 * no procede (se abrió por error, se resolvió sola…) explicando por qué.
 *
 * Comprueba que la incidencia es de la empresa de la sesión y que sigue abierta,
 * escribe el estado "Anulada" en Notion y adelanta el cambio en Supabase para
 * que la vista no espere a la siguiente pasada de sync.
 */
export async function POST(request: Request) {
  const ctx = await getPortalDb();
  if (!ctx) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  // Mismo motivo que en reabrir/verificar: en previsualización la sesión usa un
  // cliente service_role sobre la empresa del cliente, y anular aquí cerraría
  // una incidencia real de su Notion a nombre del admin.
  if (ctx.session.viewingAs) {
    return NextResponse.json(
      { error: "No puedes anular incidencias en modo previsualización" },
      { status: 403 },
    );
  }
  const { session, db, companyId } = ctx;

  let body: { incidentId?: string; motivo?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Formato inválido" }, { status: 400 });
  }
  const incidentId = String(body.incidentId ?? "").trim();
  const motivo = String(body.motivo ?? "")
    .trim()
    .slice(0, MAX_MOTIVO);
  if (!incidentId || !motivo) {
    return NextResponse.json(
      { error: "Faltan campos obligatorios" },
      { status: 400 },
    );
  }

  const { data: incident, error: incErr } = await db
    .from("incidents")
    .select("notion_id, status, response")
    .eq("id", incidentId)
    .eq("company_id", companyId)
    .maybeSingle();
  // Un fallo de BD no es "no encontrada": devolver 404 hace creer al usuario
  // que la incidencia se ha borrado y que no tiene sentido reintentar.
  if (incErr) {
    console.error(`[incidencias:anular] ${incidentId}`, incErr.message);
    return NextResponse.json(
      { error: "No hemos podido comprobar la incidencia. Inténtalo de nuevo." },
      { status: 500 },
    );
  }
  if (!incident) {
    return NextResponse.json(
      { error: "Incidencia no encontrada" },
      { status: 404 },
    );
  }
  // Una incidencia ya cerrada (resuelta, escalada o anulada) no se anula: si dos
  // personas de la empresa abren la ficha a la vez, la segunda recibe el motivo
  // real en vez de reescribir el cierre de la primera.
  if (!CANCELLABLE.has(incident.status)) {
    return NextResponse.json(
      { error: "Esta incidencia ya no está abierta, no se puede anular" },
      { status: 409 },
    );
  }

  try {
    await cancelNotionIncident(incident.notion_id, {
      motivo,
      email: session.email,
      previousResponse: incident.response,
    });
  } catch (e) {
    console.error(
      `[incidencias:anular] notion ${incident.notion_id}`,
      e instanceof Error ? e.message : e,
    );
    return NextResponse.json(
      { error: "No se pudo anular la incidencia" },
      { status: 502 },
    );
  }

  // Notion ya es la fuente de verdad; esto solo adelanta el cambio en el portal
  // hasta que la sync incremental lo traiga. Si falla, no se rompe la anulación.
  const { error: updErr } = await createAdminClient()
    .from("incidents")
    .update({
      status: "Anulada",
      resolved_at: new Date().toISOString(),
    })
    .eq("id", incidentId)
    .eq("company_id", companyId);
  if (updErr) {
    console.error(
      `[incidencias:anular] supabase ${incidentId}`,
      updErr.message,
    );
  }

  return NextResponse.json({ ok: true });
}
