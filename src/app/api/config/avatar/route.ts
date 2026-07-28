import { NextResponse } from "next/server";
import { getPortalSession } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { updateNotionContact } from "@/lib/notion-write";
import {
  safeImageExtension,
  IMAGE_EXTENSIONS,
  IMAGE_TYPES_HELP,
} from "@/lib/uploads";

export const dynamic = "force-dynamic";

const BUCKET = "avatars";
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

/** Sube la imagen de perfil, la guarda en portal_users y la sincroniza a Notion. */
export async function POST(request: Request) {
  const session = await getPortalSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (session.viewingAs) {
    return NextResponse.json(
      { error: "No puedes editar datos en modo previsualización" },
      { status: 403 },
    );
  }

  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.includes("multipart/form-data")) {
    return NextResponse.json({ error: "Formato inválido" }, { status: 400 });
  }
  const form = await request.formData();
  const file = form.get("imagen");
  const imagen = file instanceof File && file.size > 0 ? file : null;
  if (!imagen) {
    return NextResponse.json({ error: "Falta la imagen" }, { status: 400 });
  }
  // Allowlist por MIME: el nombre del fichero lo controla el cliente y esta
  // ruta sube con service_role. Además deja fuera image/svg+xml, que en un
  // bucket público ejecutaría su JS embebido.
  const ext = safeImageExtension(imagen.type);
  if (!ext) {
    return NextResponse.json(
      { error: `El archivo debe ser una imagen (${IMAGE_TYPES_HELP})` },
      { status: 400 },
    );
  }
  if (imagen.size > MAX_IMAGE_BYTES) {
    return NextResponse.json(
      { error: "La imagen supera el tamaño máximo (4 MB)" },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const path = `${session.userId}.${ext}`;
  try {
    const buffer = Buffer.from(await imagen.arrayBuffer());
    const up = await admin.storage
      .from(BUCKET)
      .upload(path, buffer, { contentType: imagen.type, upsert: true });
    if (up.error) throw up.error;
  } catch {
    return NextResponse.json(
      { error: "No se pudo subir la imagen" },
      { status: 502 },
    );
  }
  const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path);
  const url = `${pub.publicUrl}?v=${Date.now()}`;

  const { error } = await admin
    .from("portal_users")
    .update({ avatar_url: url })
    .eq("auth_user_id", session.userId);
  if (error) {
    return NextResponse.json(
      { error: "No se pudo guardar la imagen" },
      { status: 500 },
    );
  }

  if (session.contactNotionId) {
    try {
      await updateNotionContact(session.contactNotionId, { avatarUrl: url });
    } catch (e) {
      console.error("[config:avatar] Notion write-back", e);
    }
  }

  return NextResponse.json({ ok: true, url });
}

/** Quita la imagen de perfil. */
export async function DELETE() {
  const session = await getPortalSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (session.viewingAs) {
    return NextResponse.json(
      { error: "No puedes editar datos en modo previsualización" },
      { status: 403 },
    );
  }

  const admin = createAdminClient();
  await admin.storage
    .from(BUCKET)
    .remove(IMAGE_EXTENSIONS.map((e) => `${session.userId}.${e}`));

  const { error } = await admin
    .from("portal_users")
    .update({ avatar_url: null })
    .eq("auth_user_id", session.userId);
  if (error) {
    return NextResponse.json(
      { error: "No se pudo quitar la imagen" },
      { status: 500 },
    );
  }

  if (session.contactNotionId) {
    try {
      await updateNotionContact(session.contactNotionId, { avatarUrl: null });
    } catch (e) {
      console.error("[config:avatar] Notion write-back", e);
    }
  }

  return NextResponse.json({ ok: true });
}
