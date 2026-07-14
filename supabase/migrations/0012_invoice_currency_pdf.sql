-- Facturas: divisa (símbolo desde la BBDD, como "Divisa Símbolo" de Notion) y
-- URL del PDF descargable (propiedad "Factura" de Notion). El importe se guarda
-- como número y el símbolo aparte para no depender de texto acoplado.
alter table public.invoices add column if not exists currency text not null default '€';
alter table public.invoices add column if not exists pdf_url text;
