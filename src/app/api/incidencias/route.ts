import { NextResponse } from "next/server";
import { getPortalSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Alta de incidencia desde el portal. Resuelve la sesión del usuario, obtiene
 * el `notion_id` de su empresa y reenvía la incidencia al webhook de n8n.
 * La API key vive solo en el servidor (nunca se expone al cliente).
 */
export async function POST(request: Request) {
  const session = await getPortalSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let body: { titulo?: string; contexto?: string; loom?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const titulo = (body.titulo ?? "").trim();
  const contexto = (body.contexto ?? "").trim();
  const loom = (body.loom ?? "").trim();
  if (!titulo || !contexto) {
    return NextResponse.json(
      { error: "Faltan campos obligatorios" },
      { status: 400 },
    );
  }

  const webhookUrl = process.env.N8N_INCIDENCIA_URL;
  const apiKey = process.env.N8N_INCIDENCIA_APIKEY;
  if (!webhookUrl || !apiKey) {
    return NextResponse.json(
      { error: "Configuración del servidor incompleta" },
      { status: 500 },
    );
  }

  const supabase = await createClient();
  const { data: company } = await supabase
    .from("companies")
    .select("notion_id")
    .eq("id", session.companyId)
    .maybeSingle();

  let res: Response;
  try {
    res = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "ak-n8n-apikey": apiKey,
      },
      body: JSON.stringify({
        titulo,
        contexto,
        loom,
        correo: session.email,
        tipo: "incidencia",
        empresaNotionId: company?.notion_id ?? null,
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
      { error: "No se pudo registrar la incidencia" },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
