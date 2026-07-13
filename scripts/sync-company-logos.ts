// Descarga y re-hospeda los logos de empresa desde Notion → Supabase Storage.
// Ejecuta: npm run sync:logos
import { syncCompanyLogos } from "@/lib/sync/companies";

async function main() {
  const result = await syncCompanyLogos();
  console.log("[sync:logos]", JSON.stringify(result));
}

main().catch((err) => {
  console.error("[sync:logos] fatal", err);
  process.exit(1);
});
