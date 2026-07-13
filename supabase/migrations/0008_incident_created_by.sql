-- Nombre del contacto que creó la incidencia (Notion "Creado Por Texto"),
-- para mostrarlo en el detalle de la incidencia (como en el diseño).
alter table public.incidents add column if not exists created_by text;
