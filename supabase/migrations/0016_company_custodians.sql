-- Custodios Kairos de la empresa (ids de usuario de Notion, propiedad
-- "Custodio Kairos" de [AK] - Empresas). Se usan para mostrar en el modal de
-- reuniones solo los consultores asignados a esa empresa.
alter table public.companies
  add column if not exists custodian_user_ids text[] not null default '{}';
