-- Adjuntos (imagen opcional) de las incidencias creadas desde el portal.
-- Bucket público: la ruta lleva un id aleatorio (no adivinable).
insert into storage.buckets (id, name, public)
values ('incident-uploads', 'incident-uploads', true)
on conflict (id) do update set public = true;
