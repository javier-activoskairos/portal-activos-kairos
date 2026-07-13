-- Sistema de miembros del portal.
-- Solo pueden unirse contactos con rol "Avans" cuya empresa es o ha sido
-- cliente. El rol "Facturación" (can_manage_company) permite además cambiar la
-- configuración de la empresa.

-- Empresa: estado y si es/ha sido cliente (para la elegibilidad de miembros).
alter table public.companies add column if not exists estado text;
alter table public.companies add column if not exists is_client boolean not null default false;

-- Capacidad "Facturación": puede gestionar la configuración de su empresa.
alter table public.portal_users add column if not exists can_manage_company boolean not null default false;
