-- Configuración: perfil de usuario (portal_users) + datos fiscales (companies).
-- Los datos se editan en el Portal y se sincronizan de vuelta a Notion (doble sync):
--   perfil  → [AK] - Contactos (contact_notion_id)
--   fiscal  → [AK] - Empresas   (companies.notion_id), solo rol Facturación.

-- Perfil de usuario (todos los usuarios).
alter table public.portal_users add column if not exists first_name     text;
alter table public.portal_users add column if not exists last_name      text;
alter table public.portal_users add column if not exists phone          text;
alter table public.portal_users add column if not exists role_title     text;
alter table public.portal_users add column if not exists personal_email text;
alter table public.portal_users add column if not exists birthday       date;
alter table public.portal_users add column if not exists avatar_url     text;

-- Datos fiscales de la empresa (solo editables por rol Facturación).
alter table public.companies add column if not exists fiscal_name text;
alter table public.companies add column if not exists tax_id      text;
alter table public.companies add column if not exists address     text;
alter table public.companies add column if not exists city        text;
alter table public.companies add column if not exists region      text; -- Provincia/Estado (solo Portal, sin propiedad en Notion)
alter table public.companies add column if not exists postal_code text;

-- Bucket público para imágenes de perfil.
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;
