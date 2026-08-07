// ============================================================================
// Puente Discord → Portal (bot Asynk)
//
// Escucha los canales de cliente del servidor de Kairos y reenvía cada mensaje
// humano al portal, que lo guarda y lo muestra en la pestaña Chat del cliente.
// El sentido contrario (portal → Discord) NO pasa por aquí: el portal publica
// directamente con el webhook del canal.
//
// Anti-eco: se ignoran los mensajes de webhook (los que publica el portal) y
// los de cualquier bot. Sin esto, el puente se realimenta en bucle.
// ============================================================================

import { Client, GatewayIntentBits, Partials, Events } from "discord.js";

const TOKEN = process.env.DISCORD_BOT_TOKEN;
const PORTAL_URL = (process.env.PORTAL_URL ?? "").replace(/\/$/, "");
const SECRET = process.env.CHAT_BRIDGE_SECRET;

for (const [name, value] of Object.entries({
  DISCORD_BOT_TOKEN: TOKEN,
  PORTAL_URL,
  CHAT_BRIDGE_SECRET: SECRET,
})) {
  if (!value) {
    console.error(`[bridge] Falta la variable de entorno ${name}`);
    process.exit(1);
  }
}

const ENDPOINT = `${PORTAL_URL}/api/chat/discord`;

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    // Privilegiado: sin él, `content` llega vacío y el puente no reenvía nada.
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Channel],
});

/** Nombre que verá el cliente: el del servidor si lo hay, si no el global. */
function displayNameOf(message) {
  return (
    message.member?.displayName ||
    message.author.globalName ||
    message.author.username
  );
}

/** Texto + enlaces de los adjuntos (el portal no aloja archivos de Discord). */
function bodyOf(message) {
  const parts = [message.content?.trim()].filter(Boolean);
  for (const a of message.attachments.values()) parts.push(a.url);
  return parts.join("\n");
}

async function forward(message) {
  const body = bodyOf(message);
  if (!body) return; // stickers, embeds vacíos, etc.

  const payload = {
    channelId: message.channelId,
    messageId: message.id,
    authorName: displayNameOf(message),
    body,
  };

  // Dos intentos: un corte de red no debe perder un mensaje del equipo.
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-chat-bridge-secret": SECRET,
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) return;
      console.error(
        `[bridge] portal respondió ${res.status}`,
        await res.text(),
      );
      if (res.status < 500) return; // 401/400: reintentar no arregla nada
    } catch (err) {
      console.error("[bridge] error de red", err?.message ?? err);
    }
    if (attempt === 1) await new Promise((r) => setTimeout(r, 1500));
  }
}

client.on(Events.MessageCreate, (message) => {
  if (message.webhookId) return; // eco de lo que publicó el portal
  if (message.author?.bot) return; // cualquier otro bot del servidor
  if (!message.guildId) return; // DMs: fuera del puente
  void forward(message);
});

client.once(Events.ClientReady, (c) => {
  console.log(`[bridge] conectado como ${c.user.tag} → ${ENDPOINT}`);
});

client.on(Events.Error, (err) => console.error("[bridge] gateway", err));

// EasyPanel/Docker paran el contenedor con SIGTERM: cerrar limpio el gateway.
for (const sig of ["SIGTERM", "SIGINT"]) {
  process.on(sig, () => {
    console.log(`[bridge] ${sig}, cerrando`);
    client.destroy();
    process.exit(0);
  });
}

client.login(TOKEN);
