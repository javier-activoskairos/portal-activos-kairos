import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getPortalDb } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

/**
 * Reabre una incidencia desde el portal. Verifica que la incidencia pertenece a
 * la empresa de la sesión, sube una imagen opcional y reenvía al webhook de n8n
 * el notion_id + el motivo de reapertura (información de la 2ª vuelta).
 */
export async function POST(request: Request) {
  const ctx = await getPortalDb();
  if (!ctx) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const { session, db, companyId } = ctx;

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json({ error: "Formato inválido" }, { status: 400 });
  }
  const form = await request.formData();
  const incidentId = String(form.get("incidentId") ?? "").trim();
  const motivo = String(form.get("motivo") ?? "").trim();
  const loom = String(form.get("loom") ?? "").trim();
  const file = form.get("imagen");
  const imagen = file instanceof File && file.size > 0 ? file : null;

  if (!incidentId || !motivo) {
    return NextResponse.json(
      { error: "Faltan campos obligatorios" },
      { status: 400 },
    );
  }
  if (imagen) {
    if (!imagen.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "El adjunto debe ser una imagen" },
        { status: 400 },
      );
    }
    if (imagen.size > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { error: "La imagen supera el tamaño máximo (8 MB)" },
        { status: 400 },
      );
    }
  }

  // La incidencia debe pertenecer a la empresa de la sesión.
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

  const webhookUrl = process.env.N8N_REABRIR_URL;
  const apiKey = process.env.N8N_INCIDENCIA_APIKEY;
  if (!webhookUrl || !apiKey) {
    return NextResponse.json(
      { error: "Configuración del servidor incompleta" },
      { status: 500 },
    );
  }

  let imagenUrl: string | null = null;
  let imagenNombre: string | null = null;
  if (imagen) {
    try {
      const admin = createAdminClient();
      const ext = (imagen.name.split(".").pop() || "png").toLowerCase();
      const path = `${companyId}/${randomUUID()}.${ext}`;
      const buffer = Buffer.from(await imagen.arrayBuffer());
      const up = await admin.storage
        .from("incident-uploads")
        .upload(path, buffer, { contentType: imagen.type, upsert: false });
      if (up.error) throw up.error;
      const { data: pub } = admin.storage
        .from("incident-uploads")
        .getPublicUrl(path);
      imagenUrl = pub.publicUrl;
      imagenNombre = imagen.name;
    } catch {
      return NextResponse.json(
        { error: "No se pudo subir la imagen" },
        { status: 502 },
      );
    }
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
        motivo,
        loom,
        correo: session.email,
        imagenUrl,
        imagenNombre,
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
      { error: "No se pudo reabrir la incidencia" },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
