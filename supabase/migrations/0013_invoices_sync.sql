-- Sync de facturas emitidas ([AKF] - Facturas) a empresas externas del portal.
-- El número no siempre existe en Notion → opcional.
alter table public.invoices alter column number drop not null;
alter table public.invoices add column if not exists notion_id text unique;

-- Bucket público para re-hospedar los PDF de factura (URL de Notion expira).
insert into storage.buckets (id, name, public)
values ('invoice-pdfs', 'invoice-pdfs', true)
on conflict (id) do update set public = true;
