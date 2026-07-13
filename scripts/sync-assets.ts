// Cron Render: reconciliación nocturna de Activos + reuniones de acompañamiento.
// Ejecuta: npm run sync:assets
import { syncAssets } from "@/lib/sync/assets";
import { syncMeetings } from "@/lib/sync/meetings";

async function main() {
  const result = await syncAssets("cron");
  console.log("[sync:assets]", JSON.stringify(result));
  try {
    const meetings = await syncMeetings();
    console.log("[sync:meetings]", JSON.stringify(meetings));
  } catch (e) {
    console.error("[sync:meetings] error (no bloquea el sync de activos)", e);
  }
  if (result.status === "error") process.exit(1);
}

main().catch((err) => {
  console.error("[sync:assets] fatal", err);
  process.exit(1);
});
