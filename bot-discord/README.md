# Puente Chat ⇄ Discord

El chat del portal (`/chat`) y el canal del cliente en el servidor de Discord de
Kairos son el mismo hilo visto desde dos sitios. Cada mensaje aparece en el otro
lado con el nombre de quien lo escribió.

## Cómo funciona

```
Portal  ──POST /api/chat──▶  Supabase (chat_messages)
                     └────▶  webhook del canal   (username = nombre del autor)

Discord ──MESSAGE_CREATE──▶  bot Asynk (este servicio)
                     └────▶  POST /api/chat/discord  ──▶  Supabase
                                                     └──▶  Realtime → navegador
```

- **Portal → Discord** lo hace el propio portal con el webhook del canal. No
  pasa por este servicio.
- **Discord → Portal** lo hace este bot: escucha el gateway 24/7 y reenvía cada
  mensaje humano al portal.
- **Anti-eco**: el bot ignora los mensajes de webhook (los que publica el
  portal) y los de cualquier bot. Sin eso, el puente se realimenta en bucle.
- **Idempotencia**: el portal guarda el `discord_message_id` con un índice único,
  así que reenviar el mismo mensaje (reconexión del gateway) no duplica nada.

## Qué empresa recibe cada mensaje

Lo decide el canal. En Supabase, `companies.discord_channel_id` guarda el id del
canal de Discord de cada cliente y `companies.discord_webhook_url` el webhook por
el que el portal publica. Un mensaje en un canal sin empresa asociada se ignora
(el bot escucha todo el servidor).

> `discord_webhook_url` contiene un token: se rellena a mano en Supabase, nunca
> se commitea ni se sincroniza desde Notion.

## Requisitos en Discord

1. Invitar al bot **Asynk** al servidor con permisos `View Channel` +
   `Read Message History` (66560).
2. Developer Portal → Bot → activar el intent privilegiado **MESSAGE CONTENT**.
   Sin él, `content` llega vacío y no se reenvía nada.
3. Crear un webhook en el canal del cliente y guardar su URL en
   `companies.discord_webhook_url`.

## Despliegue (EasyPanel, VPS Kairos)

Servicio de tipo App desde este repo, `bot-discord/` como contexto de build
(Dockerfile incluido). Sin puertos: es un proceso largo, no un servidor HTTP.

Variables de entorno: ver `.env.example`.

## Local

```bash
npm install
DISCORD_BOT_TOKEN=… PORTAL_URL=http://localhost:3000 CHAT_BRIDGE_SECRET=… npm start
```
