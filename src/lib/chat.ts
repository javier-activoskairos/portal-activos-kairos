/**
 * Puente del chat del portal con Discord.
 *
 * El hilo de /chat y el canal del cliente en el servidor interno de Kairos son
 * el mismo chat visto desde dos sitios. Cada mensaje se publica en el otro lado
 * con el nombre de quien lo escribió, no con el de un bot:
 *
 *   portal → Discord   webhook del canal con `username` = autor  (aquí)
 *   Discord → portal   bot Asynk (gateway) → POST /api/chat/discord
 *
 * El bucle se corta en los dos extremos: aquí solo se publica lo que nace en el
 * portal, y el bot ignora los mensajes de webhooks y de bots (es decir, los
 * suyos propios y los que publica esta función).
 */

/** Longitud máxima de un mensaje (coincide con el CHECK de la tabla). */
export const MAX_CHAT_BODY = 4000;

/** Límite duro del contenido de un mensaje de Discord. */
const DISCORD_MAX_CONTENT = 2000;

/**
 * Adapta un nombre a lo que Discord acepta como `username` de webhook:
 * 1-80 caracteres y sin las palabras reservadas "discord", "everyone" y "here"
 * (un username que las contenga hace fallar la publicación con 400).
 */
export function discordUsername(name: string): string {
  const clean = name
    .replace(/discord/gi, "disc0rd")
    .replace(/@(everyone|here)/gi, "$1")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
  return clean || "Cliente";
}

/**
 * Publica un mensaje del portal en el canal de Discord de la empresa.
 * Devuelve el id del mensaje creado, o null si Discord rechaza la publicación.
 *
 * Nunca lanza: que Discord falle no debe tumbar el envío desde el portal — el
 * mensaje ya está guardado y visible para el cliente.
 */
export async function postToDiscord({
  webhookUrl,
  authorName,
  avatarUrl,
  body,
}: {
  webhookUrl: string;
  authorName: string;
  avatarUrl?: string | null;
  body: string;
}): Promise<string | null> {
  try {
    // `wait=true` devuelve el mensaje creado (necesitamos su id).
    const res = await fetch(`${webhookUrl}?wait=true`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: discordUsername(authorName),
        ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
        content: body.slice(0, DISCORD_MAX_CONTENT),
        // Un cliente no puede provocar pings al escribir "@everyone".
        allowed_mentions: { parse: [] },
      }),
    });
    if (!res.ok) return null;
    const created = (await res.json()) as { id?: string };
    return created.id ?? null;
  } catch {
    return null;
  }
}
