-- Módulo de facturación. Solo accesible a usuarios con rol "Facturación"
-- (portal_users.can_manage_company).

create or replace function public.auth_can_manage_company()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.portal_users
    where auth_user_id = auth.uid() and active and can_manage_company
  )
$$;

-- Suscripción y método de pago por empresa (datos privados de facturación).
create table if not exists public.company_billing (
  company_id    uuid primary key references public.companies (id) on delete cascade,
  amount        text,
  cycle         text,
  next_charge_at date,
  pay_brand     text,
  pay_last4     text,
  pay_expiry    text,
  updated_at    timestamptz not null default now()
);

-- Historial de facturas.
create table if not exists public.invoices (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies (id) on delete cascade,
  number      text not null,
  concept     text not null,
  amount      text not null,
  status      text not null default 'pagada',
  issued_at   date,
  created_at  timestamptz not null default now()
);
create index if not exists invoices_company_idx on public.invoices (company_id);

alter table public.company_billing enable row level security;
alter table public.invoices enable row level security;

drop policy if exists company_billing_facturacion on public.company_billing;
create policy company_billing_facturacion on public.company_billing
  for select using (
    company_id = public.auth_company_id() and public.auth_can_manage_company()
  );

drop policy if exists invoices_facturacion on public.invoices;
create policy invoices_facturacion on public.invoices
  for select using (
    company_id = public.auth_company_id() and public.auth_can_manage_company()
  );
