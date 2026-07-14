// Sincroniza facturas emitidas ([AKF] - Facturas) → invoices, por empresa
// externa del portal (excluye Activos Kairos). Ejecuta: npm run sync:invoices
import { syncInvoices } from "@/lib/sync/invoices";

async function main() {
  const result = await syncInvoices();
  console.log("[sync:invoices]", JSON.stringify(result));
}

main().catch((err) => {
  console.error("[sync:invoices] fatal", err);
  process.exit(1);
});
