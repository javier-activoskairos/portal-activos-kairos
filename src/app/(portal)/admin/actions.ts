"use server";

import { revalidatePath } from "next/cache";
import { getPortalSession } from "@/lib/session";
import { syncIncidents } from "@/lib/sync/incidents";
import { syncAssets } from "@/lib/sync/assets";

// Dispara una sincronización manual. Solo admins.
export async function runManualSync(source: "incidents" | "assets") {
  const session = await getPortalSession();
  if (!session || session.role !== "admin") {
    throw new Error("No autorizado");
  }
  const result =
    source === "incidents"
      ? await syncIncidents("manual")
      : await syncAssets("manual");
  revalidatePath("/admin");
  return result;
}

// Sincroniza ambas fuentes (incidencias + activos). Solo admins.
export async function runAllSync() {
  const session = await getPortalSession();
  if (!session || session.role !== "admin") {
    throw new Error("No autorizado");
  }
  const incidents = await syncIncidents("manual");
  const assets = await syncAssets("manual");
  revalidatePath("/admin");
  return {
    ok: incidents.status !== "error" && assets.status !== "error",
    rowsUpserted:
      (incidents.rowsUpserted ?? 0) + (assets.rowsUpserted ?? 0),
    rowsRead: (incidents.rowsRead ?? 0) + (assets.rowsRead ?? 0),
    error: incidents.error || assets.error || null,
  };
}
