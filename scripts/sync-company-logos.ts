// Sincroniza datos de empresa (logo, plan, sector) desde Notion → Supabase.
// Ejecuta: npm run sync:logos
import {
  seedClientCompanies,
  syncCompanies,
  syncPortalUserContacts,
} from "@/lib/sync/companies";

async function main() {
  const seed = await seedClientCompanies();
  console.log("[seed:companies]", JSON.stringify(seed));
  const result = await syncCompanies();
  console.log("[sync:companies]", JSON.stringify(result));
  const contacts = await syncPortalUserContacts();
  console.log("[sync:contacts]", JSON.stringify(contacts));
}

main().catch((err) => {
  console.error("[sync:companies] fatal", err);
  process.exit(1);
});
