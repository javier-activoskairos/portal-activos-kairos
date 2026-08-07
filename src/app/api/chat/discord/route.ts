import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { MAX_CHAT_BODY } from "@/lib/chat";

export const dynamic = "force-dynamic";

/**
 * Entrada del puente: el bot de Discord (Asynk, gateway 24/7) reenvía aquí cada
 * MESSAGE_CREATE de un canal de cliente.
 *
 * El bot ya filtra su propio eco (mensajes de webhook y de bots); aquí solo se
 * confía en el secreto compartido y en el `channelId`, que decide la empresa.
 * No hay sesión de usuario: la petición viene de servidor a servidor.
 */

interface DiscordHookBody {
  channelId?: string;
  messageId?: string;
  authorName?: string;
  body?: string;
}

/** Comparación en tiempo constante (evita distinguir el secreto por latencia). */
function secretMatches(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const expected = process.env.CHAT_BRIDGE_SECRET;
  if (!expected) {
    return NextResponse.json(
      { error: "Configuración del servidor incompleta" },
      { status: 500 },
    );
  }

  const given = request.headers.get("x-chat-bridge-secret") ?? "";
  if (!secretMatches(given, expected)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let payload: DiscordHookBody;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const channelId = String(payload.channelId ?? "").trim();
  const messageId = String(payload.messageId ?? "").trim();
  const authorName = String(payload.authorName ?? "").trim() || "Equipo Kairos";
  const body = String(payload.body ?? "")
    .trim()
    .slice(0, MAX_CHAT_BODY);

  if (!channelId || !messageId || !body) {
    return NextResponse.json(
      { error: "Faltan campos obligatorios" },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  const { data: company } = await admin
    .from("companies")
    .select("id")
    .eq("discord_channel_id", channelId)
    .maybeSingle();

  // Canal sin empresa asociada: el bot escucha todo el servidor, así que esto es
  // lo normal en canales internos. 200 para que no lo reintente.
  if (!company) {
    return NextResponse.json({ ok: true, ignored: "canal sin empresa" });
  }

  const { error } = await admin.from("chat_messages").insert({
    company_id: company.id,
    body,
    author_name: authorName,
    author_side: "kairos",
    discord_message_id: messageId,
  });

  // 23505 = unique_violation en `discord_message_id`: el mismo MESSAGE_CREATE
  // reenviado tras una reconexión del gateway. Ya está guardado, no es un fallo.
  if (error && error.code !== "23505") {
    return NextResponse.json(
      { error: "No se pudo guardar el mensaje" },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
