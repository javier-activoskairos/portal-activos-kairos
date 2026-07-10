// Cron Render: reconciliación nocturna de Activos.
// Ejecuta: npm run sync:assets
import { syncAssets } from "@/lib/sync/assets";

async function main() {
  const result = await syncAssets("cron");
  console.log("[sync:assets]", JSON.stringify(result));
  if (result.status === "error") process.exit(1);
}

main().catch((err) => {
  console.error("[sync:assets] fatal", err);
  process.exit(1);
});
