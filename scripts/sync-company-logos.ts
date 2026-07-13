// Sincroniza datos de empresa (logo, plan, sector) desde Notion → Supabase.
// Ejecuta: npm run sync:logos
import { syncCompanies } from "@/lib/sync/companies";

async function main() {
  const result = await syncCompanies();
  console.log("[sync:companies]", JSON.stringify(result));
}

main().catch((err) => {
  console.error("[sync:companies] fatal", err);
  process.exit(1);
});
