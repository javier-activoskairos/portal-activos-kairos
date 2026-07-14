-- URL Respuesta: enlace a la respuesta/resolución de la incidencia (p. ej. el
-- email de resolución). Se muestra en las incidencias resueltas que la tengan.
alter table public.incidents add column if not exists response_url text;
