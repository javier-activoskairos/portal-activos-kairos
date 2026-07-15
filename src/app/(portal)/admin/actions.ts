"use server";

import { revalidatePath } from "next/cache";
import { getPortalSession } from "@/lib/session";
import { syncIncidents } from "@/lib/sync/incidents";
import { syncAssets } from "@/lib/sync/assets";
import { syncMeetings } from "@/lib/sync/meetings";
import { syncInvoices } from "@/lib/sync/invoices";
import {
  seedClientCompanies,
  syncCompanies,
  syncMemberships,
} from "@/lib/sync/companies";

/** Fuentes que se pueden sincronizar por separado desde el panel interno. */
export type PartialSource =
  | "assets"
  | "incidents"
  | "meetings"
  | "companies"
  | "memberships"
  | "invoices";

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

/**
 * Sincronización parcial: solo la fuente elegida. Solo admins.
 * Devuelve un resumen legible para el panel.
 */
export async function runPartialSync(
  source: PartialSource,
): Promise<{ ok: boolean; detail: string }> {
  const session = await getPortalSession();
  if (!session || session.role !== "admin") {
    throw new Error("No autorizado");
  }

  try {
    let detail = "";
    switch (source) {
      case "assets": {
        const r = await syncAssets("manual");
        if (r.status === "error") throw new Error(r.error ?? "error");
        detail = `${r.rowsUpserted} activos · ${r.rowsRead} leídos`;
        break;
      }
      case "incidents": {
        const r = await syncIncidents("manual");
        if (r.status === "error") throw new Error(r.error ?? "error");
        detail = `${r.rowsUpserted} incidencias · ${r.rowsRead} leídas`;
        break;
      }
      case "meetings": {
        const r = await syncMeetings();
        detail = `${r.upserted} reuniones`;
        break;
      }
      case "companies": {
        const seed = await seedClientCompanies();
        const r = await syncCompanies();
        detail = `${r.updated} empresas · ${seed.created} nuevas`;
        break;
      }
      case "memberships": {
        const r = await syncMemberships();
        detail = `${r.updated} suscripciones · ${r.memberships} membresías`;
        break;
      }
      case "invoices": {
        const r = await syncInvoices();
        detail = `${r.upserted} facturas · ${r.companies} empresas`;
        break;
      }
    }
    revalidatePath("/admin");
    return { ok: true, detail };
  } catch (e) {
    return { ok: false, detail: e instanceof Error ? e.message : String(e) };
  }
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
