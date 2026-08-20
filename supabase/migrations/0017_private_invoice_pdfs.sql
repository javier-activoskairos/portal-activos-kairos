-- Los PDF de factura contienen datos fiscales del cliente y estaban en un
-- bucket público: la URL directa de Storage los servía SIN autenticación, lo
-- que dejaba sin efecto el control de acceso de /api/facturas/[id]/pdf.
--
-- A partir de aquí el bucket es privado y la réplica guarda la CLAVE del objeto
-- (pdf_path), no una URL. El único camino de descarga es el route handler, que
-- ya valida sesión + empresa + rol Facturación y hace el download server-side
-- con service_role.
update storage.buckets set public = false where id = 'invoice-pdfs';

alter table public.invoices add column if not exists pdf_path text;

-- Backfill: la clave es el último segmento de la URL pública, sin query string.
update public.invoices
set pdf_path = split_part(
      regexp_replace(pdf_url, '^.*/object/public/invoice-pdfs/', ''),
      '?', 1
    )
where pdf_url is not null
  and pdf_path is null
  and pdf_url like '%/object/public/invoice-pdfs/%';

comment on column public.invoices.pdf_path is
  'Clave del objeto en el bucket privado invoice-pdfs. Nunca se expone al cliente.';
comment on column public.invoices.pdf_url is
  'OBSOLETA: URL pública heredada. Ya no se lee ni se escribe; eliminable tras verificar el backfill de pdf_path.';

-- Nota deliberada sobre los otros dos buckets:
--   avatars e incident-uploads siguen públicos porque sus URLs se escriben en
--   Notion como ficheros externos y allí deben seguir resolviendo de forma
--   duradera (una URL firmada caducaría y rompería la ficha del CRM). El riesgo
--   está acotado: ambas rutas llevan un UUID no enumerable y no contienen datos
--   fiscales. Si se quisieran cerrar, habría que subir el binario a Notion en
--   vez de enlazarlo.
