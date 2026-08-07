import { NextResponse } from "next/server";
import { getPortalSession } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { postToDiscord, MAX_CHAT_BODY } from "@/lib/chat";
import { fullNameFromEmail } from "@/lib/utils";

export const dynamic = "force-dynamic";

/**
 * Envío de un mensaje desde el portal.
 *
 * Guarda el mensaje en Supabase (fuente de verdad del hilo) y lo publica en el
 * canal de Discord de la empresa con el nombre real del autor. Si Discord falla,
 * el mensaje NO se pierde: queda guardado y el cliente lo ve igual — solo se
 * queda sin espejar (`discord_message_id` a null).
 *
 * Escribe con service_role a propósito: `chat_messages` no tiene policy de
 * INSERT, así que el navegador no puede insertar por su cuenta ni falsear el
 * autor. El `company_id` sale siempre de la sesión, nunca del cuerpo.
 */
export async function POST(request: Request) {
  const session = await getPortalSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // "Ver como cliente" es solo lectura: un admin previsualizando el portal de
  // un cliente no puede escribir haciéndose pasar por él.
  if (session.viewingAs) {
    return NextResponse.json(
      { error: "El chat es de solo lectura en la vista de cliente" },
      { status: 403 },
    );
  }

  let body = "";
  try {
    const json = await request.json();
    body = String(json.body ?? "").trim();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  if (!body) {
    return NextResponse.json(
      { error: "El mensaje está vacío" },
      { status: 400 },
    );
  }
  if (body.length > MAX_CHAT_BODY) {
    return NextResponse.json(
      { error: `El mensaje supera los ${MAX_CHAT_BODY} caracteres` },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  const { data: company } = await admin
    .from("companies")
    .select("discord_webhook_url")
    .eq("id", session.companyId)
    .maybeSingle();

  const { data: author } = await admin
    .from("portal_users")
    .select("id, first_name, last_name, avatar_url")
    .eq("auth_user_id", session.userId)
    .maybeSingle();

  const authorName =
    [author?.first_name, author?.last_name].filter(Boolean).join(" ") ||
    fullNameFromEmail(session.email) ||
    session.email;

  const { data: message, error } = await admin
    .from("chat_messages")
    .insert({
      company_id: session.companyId,
      body,
      author_name: authorName,
      author_side: "client",
      author_user_id: author?.id ?? null,
    })
    .select("id, body, author_name, author_side, created_at")
    .single();

  if (error || !message) {
    return NextResponse.json(
      { error: "No se pudo guardar el mensaje" },
      { status: 502 },
    );
  }

  // Espejo en Discord. Best-effort: el hilo del portal ya está actualizado.
  if (company?.discord_webhook_url) {
    const discordId = await postToDiscord({
      webhookUrl: company.discord_webhook_url,
      authorName,
      avatarUrl: author?.avatar_url ?? null,
      body,
    });
    if (discordId) {
      await admin
        .from("chat_messages")
        .update({ discord_message_id: discordId })
        .eq("id", message.id);
    }
  }

  return NextResponse.json({ ok: true, message });
}
