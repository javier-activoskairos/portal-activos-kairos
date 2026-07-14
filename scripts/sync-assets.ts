// Cron Render: reconciliación nocturna de Activos + reuniones de acompañamiento.
// Multi-empresa: primero siembra las empresas cliente nuevas y refresca su
// metadata (plan/logo/sector), luego sincroniza activos y reuniones de todas.
// Ejecuta: npm run sync:assets
import { syncAssets } from "@/lib/sync/assets";
import { syncMeetings } from "@/lib/sync/meetings";
import {
  seedClientCompanies,
  syncCompanies,
  syncMemberships,
} from "@/lib/sync/companies";

async function main() {
  try {
    const seed = await seedClientCompanies();
    console.log("[seed:companies]", JSON.stringify(seed));
    const comp = await syncCompanies();
    console.log("[sync:companies]", JSON.stringify(comp));
    const mem = await syncMemberships();
    console.log("[sync:memberships]", JSON.stringify(mem));
  } catch (e) {
    console.error("[seed/companies] error (no bloquea el sync de activos)", e);
  }

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
