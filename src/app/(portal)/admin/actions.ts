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
