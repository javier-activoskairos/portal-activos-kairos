-- Seguimientos de acompañamiento (Astrapi / Areté / Prótos) para el gráfico
-- "Horas de acompañamiento por mes" del Inicio.
create table if not exists public.meetings (
  id             uuid primary key default gen_random_uuid(),
  notion_id      text unique not null,
  company_id     uuid not null references public.companies (id) on delete cascade,
  type           text not null,
  duration_min   numeric,
  meeting_date   date,
  last_edited_at timestamptz,
  synced_at      timestamptz not null default now()
);
create index if not exists meetings_company_idx on public.meetings (company_id);

alter table public.meetings enable row level security;
drop policy if exists meetings_by_company on public.meetings;
create policy meetings_by_company on public.meetings
  for select using (company_id = public.auth_company_id());

-- Racha de semanas del plan (Tempo/Stasis) para el bloque del Inicio.
alter table public.companies add column if not exists plan_streak_weeks int not null default 0;
