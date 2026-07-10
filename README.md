# Portal Activos Kairos — Fase 1

Portal de cliente e incidencias de **Activos Kairos** (`portal.activoskairos.com`).
Next.js (App Router) + Supabase (réplica SQL + Auth OTP), desplegado en Render tras Cloudflare.

**Notion es la fuente de verdad.** Supabase es solo una réplica de lectura sincronizada.

## Arquitectura

- **Web** (Next.js 16): login OTP por email, 3 secciones (Inicio · Activos · Incidencias) + panel interno `/admin`.
- **Supabase**: Postgres con RLS por empresa (`company_id` desde la sesión) + Auth OTP nativo.
- **Sincronización** (Render Cron):
  - Incidencias → cada 10 min (`sync:incidents`).
  - Activos → reconciliación nocturna 03:00 (`sync:assets`), usa la propiedad **URL** de Notion como entregable.
- **Seguridad**: RLS por empresa; `service_role` solo en servidor/cron; secretos solo en Render/Supabase.

## Estructura

```
src/
  proxy.ts                 # Middleware Supabase (protege rutas)
  app/
    login/                 # Login OTP (código por email)
    auth/                  # confirm (magic link) + signout
    (portal)/              # Rutas protegidas: inicio, activos, incidencias, admin
  lib/
    supabase/              # server / client / admin
    notion.ts              # Cliente Notion + extractores de propiedades
    sync/                  # run (auditoría+lock), incidents, assets
    session.ts             # Resolución de sesión + autorización
    status.ts              # Mapeo estados → tono visual
scripts/
  sync-incidents.ts        # Entrada cron incidencias
  sync-assets.ts           # Entrada cron activos
supabase/
  migrations/0001_init.sql # Esquema + RLS + seed
```

## Variables de entorno

Ver `.env.example`. Los valores reales viven **solo** en Render / Supabase.

## Desarrollo local

```bash
npm install
npm run dev                                          # web
npx tsx --env-file=.env scripts/sync-incidents.ts    # probar sync
```

## Deploy

`render.yaml` define el web service + 2 cron jobs. Secretos en el dashboard (sync:false).
Dominio `portal.activoskairos.com` vía Cloudflare (CNAME al servicio Render).

---

Mantenido por **Activos Kairos**.
