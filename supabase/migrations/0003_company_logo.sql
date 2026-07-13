-- Logo de empresa: se descarga desde [AK] - Empresas (propiedad "Logo") y se
-- re-hospeda en Supabase Storage. companies.logo_url guarda la URL pública.

alter table public.companies add column if not exists logo_url text;

-- Bucket público para los logos (lectura anónima vía /object/public).
insert into storage.buckets (id, name, public)
values ('company-logos', 'company-logos', true)
on conflict (id) do update set public = true;
