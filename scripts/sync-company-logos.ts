// Sincroniza datos de empresa (logo, plan, sector) desde Notion → Supabase.
// Ejecuta: npm run sync:logos
import { syncCompanies, syncPortalUserContacts } from "@/lib/sync/companies";

async function main() {
  const result = await syncCompanies();
  console.log("[sync:companies]", JSON.stringify(result));
  const contacts = await syncPortalUserContacts();
  console.log("[sync:contacts]", JSON.stringify(contacts));
}

main().catch((err) => {
  console.error("[sync:companies] fatal", err);
  process.exit(1);
});
