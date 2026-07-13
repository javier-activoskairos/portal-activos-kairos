-- Plan de membresía y sector de la empresa, sincronizados desde [AK] - Empresas.
-- plan: "Membresía Texto" (o "Tempo" si Es Tempo?), sector: propiedad Sector.

alter table public.companies add column if not exists plan text;
alter table public.companies add column if not exists sector text;
