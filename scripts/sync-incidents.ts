// Cron Render: sincroniza Incidencias (cada 10 min).
// Ejecuta: npm run sync:incidents
import { syncIncidents } from "@/lib/sync/incidents";

async function main() {
  const result = await syncIncidents("cron");
  console.log("[sync:incidents]", JSON.stringify(result));
  if (result.status === "error") process.exit(1);
}

main().catch((err) => {
  console.error("[sync:incidents] fatal", err);
  process.exit(1);
});
