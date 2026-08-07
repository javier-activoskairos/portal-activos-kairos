-- ============================================================================
-- Chat del portal ⇄ Discord
-- Hilo de mensajes por empresa, visible en /chat y espejado en el canal de
-- Discord del cliente (categoría Clientes del servidor interno de Kairos).
--
-- A diferencia del resto de tablas, Notion NO es la fuente de verdad aquí:
-- los mensajes nacen en el portal o en Discord y viven solo en esta tabla.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Enlace empresa ⇄ canal de Discord
-- El webhook contiene un token: se rellena a mano (o desde el panel), NUNCA
-- se commitea ni se sincroniza desde Notion.
-- ---------------------------------------------------------------------------
alter table public.companies
  add column if not exists discord_channel_id text,
  add column if not exists discord_webhook_url text;

create unique index if not exists companies_discord_channel_idx
  on public.companies (discord_channel_id)
  where discord_channel_id is not null;

-- ---------------------------------------------------------------------------
-- Mensajes
-- author_side: quién habla, no dónde se escribió.
--   'client' → la empresa (escribe desde el portal)
--   'kairos' → el equipo  (escribe desde Discord)
-- author_name se guarda desnormalizado a propósito: es el nombre que se mostró
-- en su momento en ambos lados, y no debe cambiar si luego se edita el perfil.
-- discord_message_id da idempotencia: si el bot reenvía el mismo MESSAGE_CREATE
-- (reconexión del gateway), el unique lo corta en seco.
-- ---------------------------------------------------------------------------
create table if not exists public.chat_messages (
  id                 uuid primary key default gen_random_uuid(),
  company_id         uuid not null references public.companies (id) on delete cascade,
  body               text not null check (length(body) between 1 and 4000),
  author_name        text not null,
  author_side        text not null check (author_side in ('client', 'kairos')),
  author_user_id     uuid references public.portal_users (id) on delete set null,
  discord_message_id text unique,
  created_at         timestamptz not null default now()
);

create index if not exists chat_messages_company_idx
  on public.chat_messages (company_id, created_at desc);

-- ---------------------------------------------------------------------------
-- RLS
-- SELECT: cada usuario ve el hilo de su empresa.
-- Sin policy de INSERT/UPDATE/DELETE a propósito: el navegador nunca escribe
-- directo. Todas las altas pasan por /api/chat o /api/chat/discord, que validan
-- la identidad y escriben con service_role.
-- ---------------------------------------------------------------------------
alter table public.chat_messages enable row level security;

drop policy if exists chat_messages_by_company on public.chat_messages;
create policy chat_messages_by_company on public.chat_messages
  for select using (company_id = public.auth_company_id());

-- ---------------------------------------------------------------------------
-- Realtime — el hilo se actualiza solo cuando responde el equipo desde Discord.
-- Realtime respeta la policy de SELECT de arriba: cada cliente solo recibe los
-- mensajes de su propia empresa.
-- ---------------------------------------------------------------------------
do $$
begin
  alter publication supabase_realtime add table public.chat_messages;
exception
  when duplicate_object then null;  -- ya estaba en la publicación
  when undefined_object then null;  -- la publicación no existe en este entorno
end
$$;
