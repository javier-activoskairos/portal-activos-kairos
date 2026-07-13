import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getPortalSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB

/**
 * Alta de incidencia desde el portal. Resuelve la sesión del usuario, obtiene
 * el `notion_id` de su empresa y reenvía la incidencia al webhook de n8n.
 * Acepta multipart/form-data con una imagen opcional: se sube a Supabase
 * Storage y se envía su URL pública (`imagenUrl`) al webhook.
 * La API key vive solo en el servidor (nunca se expone al cliente).
 */
export async function POST(request: Request) {
  const session = await getPortalSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let titulo = "";
  let contexto = "";
  let loom = "";
  let imagen: File | null = null;

  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    titulo = String(form.get("titulo") ?? "").trim();
    contexto = String(form.get("contexto") ?? "").trim();
    loom = String(form.get("loom") ?? "").trim();
    const file = form.get("imagen");
    if (file instanceof File && file.size > 0) imagen = file;
  } else {
    try {
      const body = await request.json();
      titulo = (body.titulo ?? "").trim();
      contexto = (body.contexto ?? "").trim();
      loom = (body.loom ?? "").trim();
    } catch {
      return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
    }
  }

  if (!titulo || !contexto) {
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

  // Sube la imagen (si existe) y obtiene su URL pública.
  let imagenUrl: string | null = null;
  let imagenNombre: string | null = null;
  if (imagen) {
    try {
      const admin = createAdminClient();
      const ext = (imagen.name.split(".").pop() || "png").toLowerCase();
      const path = `${session.companyId}/${randomUUID()}.${ext}`;
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
        titulo,
        contexto,
        loom,
        correo: session.email,
        tipo: "incidencia",
        empresaNotionId: company?.notion_id ?? null,
        contactoNotionId: session.contactNotionId,
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
      { error: "No se pudo registrar la incidencia" },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
