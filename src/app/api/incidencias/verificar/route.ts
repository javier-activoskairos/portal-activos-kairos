import { NextResponse } from "next/server";
import { getPortalDb } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * Verifica una incidencia (estado "Verificación" → "Solucionada") con una
 * valoración de 1-5 estrellas. Comprueba que la incidencia es de la empresa de
 * la sesión y reenvía al webhook de n8n que actualiza Notion.
 */
export async function POST(request: Request) {
  const ctx = await getPortalDb();
  if (!ctx) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (ctx.session.viewingAs) {
    return NextResponse.json(
      { error: "No puedes verificar en modo previsualización" },
      { status: 403 },
    );
  }
  const { session, db, companyId } = ctx;

  let body: { incidentId?: string; valoracion?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Formato inválido" }, { status: 400 });
  }
  const incidentId = String(body.incidentId ?? "").trim();
  const valoracion = Math.max(1, Math.min(5, Math.round(Number(body.valoracion) || 0)));
  if (!incidentId || valoracion < 1) {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 });
  }

  const { data: incident } = await db
    .from("incidents")
    .select("notion_id")
    .eq("id", incidentId)
    .eq("company_id", companyId)
    .maybeSingle();
  if (!incident) {
    return NextResponse.json(
      { error: "Incidencia no encontrada" },
      { status: 404 },
    );
  }

  const webhookUrl = process.env.N8N_VERIFICAR_URL;
  const apiKey = process.env.N8N_INCIDENCIA_APIKEY;
  if (!webhookUrl || !apiKey) {
    return NextResponse.json(
      { error: "Configuración del servidor incompleta" },
      { status: 500 },
    );
  }

  let res: Response;
  try {
    res = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "ak-n8n-apikey": apiKey,
      },
      body: JSON.stringify({
        incidenciaNotionId: incident.notion_id,
        valoracion,
        correo: session.email,
      }),
    });
  } catch {
    return NextResponse.json(
      { error: "No se pudo contactar con el servicio de incidencias" },
      { status: 502 },
    );
  }
  if (!res.ok) {
    return NextResponse.json(
      { error: "No se pudo verificar la incidencia" },
      { status: 502 },
    );
  }
  return NextResponse.json({ ok: true });
}
