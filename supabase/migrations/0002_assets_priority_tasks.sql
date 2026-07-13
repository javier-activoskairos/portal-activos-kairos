-- Portal Activos Kairos — ampliación de assets para el diseño completo.
-- Expone prioridad y tareas por activo (además del estado "Por Empezar"
-- = Propuesto, que ahora también se sincroniza). Datos reales desde Notion
-- ([AKC] - Activos Kairos + [AKC] - Tareas).
alter table public.assets
  add column if not exists priority text;

alter table public.assets
  add column if not exists tasks jsonb not null default '[]'::jsonb;
