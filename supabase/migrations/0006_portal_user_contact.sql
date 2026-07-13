-- Notion ID del Contacto ([AK] - Contactos) asociado al usuario del portal.
-- Se usa para rellenar "Creado por" (relation) al crear una incidencia.
alter table public.portal_users add column if not exists contact_notion_id text;
