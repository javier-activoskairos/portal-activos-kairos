-- ============================================================================
-- Portal Activos Kairos — Fase 1
-- Esquema de la réplica SQL + RLS por empresa + trazabilidad de sincronización.
-- Notion sigue siendo la fuente de verdad; aquí solo vive la réplica de lectura.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Empresas (tenant)
-- ---------------------------------------------------------------------------
create table if not exists public.companies (
  id         uuid primary key default gen_random_uuid(),
  notion_id  text unique not null,
  name       text not null,
  slug       text unique,
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Usuarios del portal (acceso). En fase 1 solo Javier.
-- auth_user_id se rellena al primer login OTP (trigger handle_new_user).
-- ---------------------------------------------------------------------------
create table if not exists public.portal_users (
  id           uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users (id) on delete set null,
  email        text unique not null,
  company_id   uuid not null references public.companies (id) on delete cascade,
  role         text not null default 'client' check (role in ('client', 'admin')),
  active       boolean not null default true,
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Activos visibles (solo En Progreso y Terminado)
-- ---------------------------------------------------------------------------
create table if not exists public.assets (
  id             uuid primary key default gen_random_uuid(),
  notion_id      text unique not null,
  company_id     uuid not null references public.companies (id) on delete cascade,
  name           text not null,
  status         text not null,
  desired_result text,
  progress       text,
  planned_at     date,
  due_at         date,
  started_at     date,
  ended_at       date,
  asset_url      text,             -- propiedad "URL" de Notion (enlace/loom del activo)
  notion_url     text,             -- referencia interna, no visible al cliente
  last_edited_at timestamptz,
  synced_at      timestamptz not null default now()
);
create index if not exists assets_company_idx on public.assets (company_id);
create index if not exists assets_status_idx on public.assets (status);

-- ---------------------------------------------------------------------------
-- Incidencias (histórico completo; sin PII innecesaria)
-- ---------------------------------------------------------------------------
create table if not exists public.incidents (
  id              uuid primary key default gen_random_uuid(),
  notion_id       text unique not null,
  company_id      uuid not null references public.companies (id) on delete cascade,
  title           text not null,
  status          text not null,
  label           text,
  source          text,
  additional_info text,
  response        text,
  created_at      timestamptz,
  started_at      timestamptz,
  resolved_at     timestamptz,
  sla_deadline    timestamptz,
  source_url      text,
  error_url       text,
  notion_url      text,
  last_edited_at  timestamptz,
  synced_at       timestamptz not null default now()
);
create index if not exists incidents_company_idx on public.incidents (company_id);
create index if not exists incidents_status_idx on public.incidents (status);

-- ---------------------------------------------------------------------------
-- Auditoría de ejecuciones de sincronización
-- ---------------------------------------------------------------------------
create table if not exists public.sync_runs (
  id            uuid primary key default gen_random_uuid(),
  source        text not null,            -- 'incidents' | 'assets'
  mode          text not null,            -- 'cron' | 'manual'
  started_at    timestamptz not null default now(),
  finished_at   timestamptz,
  status        text not null default 'running', -- running | success | error
  rows_read     integer default 0,
  rows_upserted integer default 0,
  error_summary text
);
create index if not exists sync_runs_source_idx on public.sync_runs (source, started_at desc);

-- ---------------------------------------------------------------------------
-- Cursor / lock por fuente (evita solapes)
-- ---------------------------------------------------------------------------
create table if not exists public.sync_state (
  source          text primary key,       -- 'incidents' | 'assets'
  last_success_at timestamptz,
  last_cursor     text,
  locked_until    timestamptz
);

-- ============================================================================
-- Helpers de seguridad (SECURITY DEFINER para poder leer portal_users bajo RLS)
-- ============================================================================
create or replace function public.auth_company_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select company_id
  from public.portal_users
  where auth_user_id = auth.uid() and active
  limit 1
$$;

create or replace function public.auth_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.portal_users
    where auth_user_id = auth.uid() and active and role = 'admin'
  )
$$;

-- ============================================================================
-- Trigger: al crear un usuario en auth.users, vincularlo a su portal_users
-- por email (si existe y está activo). No crea accesos nuevos.
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.portal_users
     set auth_user_id = new.id
   where lower(email) = lower(new.email)
     and auth_user_id is null;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- RLS
-- ============================================================================
alter table public.companies    enable row level security;
alter table public.portal_users enable row level security;
alter table public.assets       enable row level security;
alter table public.incidents    enable row level security;
alter table public.sync_runs    enable row level security;
alter table public.sync_state   enable row level security;

-- El navegador nunca recibe service_role; estas policies aplican a usuarios auth.
-- (service_role bypassa RLS para las escrituras de sincronización.)

-- portal_users: cada usuario ve solo su propia fila
drop policy if exists portal_users_self on public.portal_users;
create policy portal_users_self on public.portal_users
  for select using (auth_user_id = auth.uid());

-- companies: el usuario ve solo su empresa
drop policy if exists companies_own on public.companies;
create policy companies_own on public.companies
  for select using (id = public.auth_company_id());

-- assets: solo los de la empresa del usuario
drop policy if exists assets_by_company on public.assets;
create policy assets_by_company on public.assets
  for select using (company_id = public.auth_company_id());

-- incidents: solo los de la empresa del usuario
drop policy if exists incidents_by_company on public.incidents;
create policy incidents_by_company on public.incidents
  for select using (company_id = public.auth_company_id());

-- sync_runs / sync_state: solo admins (para el panel interno)
drop policy if exists sync_runs_admin on public.sync_runs;
create policy sync_runs_admin on public.sync_runs
  for select using (public.auth_is_admin());

drop policy if exists sync_state_admin on public.sync_state;
create policy sync_state_admin on public.sync_state
  for select using (public.auth_is_admin());

-- ============================================================================
-- Seed — empresa Activos Kairos + acceso admin de Javier (fase 1)
-- notion_id = page id de Activos Kairos en [AK] - Empresas
-- ============================================================================
insert into public.companies (notion_id, name, slug, active)
values ('1f70114d-3502-80a1-b653-e32b11c32fca', 'Activos Kairos', 'activos-kairos', true)
on conflict (notion_id) do update set name = excluded.name, active = true;

insert into public.portal_users (email, company_id, role, active)
select 'javier.salido@activoskairos.com', c.id, 'admin', true
from public.companies c
where c.notion_id = '1f70114d-3502-80a1-b653-e32b11c32fca'
on conflict (email) do update set role = 'admin', active = true;

insert into public.sync_state (source) values ('incidents'), ('assets')
on conflict (source) do nothing;
