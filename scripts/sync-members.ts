// Provisión de miembros del portal desde Notion (Avans + empresa cliente).
// Dry-run por defecto:   npm run sync:members
// Aplicar cambios:       npm run sync:members -- --apply
import { syncPortalMembers } from "@/lib/sync/members";

async function main() {
  const apply = process.argv.includes("--apply");
  const result = await syncPortalMembers({ apply });
  console.log("[sync:members]", JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error("[sync:members] fatal", err);
  process.exit(1);
});
