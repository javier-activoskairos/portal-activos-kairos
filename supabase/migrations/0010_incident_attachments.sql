-- Adjuntos de la incidencia (propiedad "Archivo" de Notion) para mostrarlos en
-- el detalle. Array de { name, url }.
alter table public.incidents add column if not exists attachments jsonb not null default '[]'::jsonb;
