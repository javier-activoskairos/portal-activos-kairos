"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getPortalSession, VIEW_AS_COOKIE } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Activa la vista "Ver como cliente". Solo admins. Valida que la empresa exista
 * antes de fijar la cookie, y redirige al inicio del portal del cliente.
 */
export async function viewAsClient(companyId: string) {
  const session = await getPortalSession();
  if (!session || session.role !== "admin") throw new Error("No autorizado");

  const admin = createAdminClient();
  const { data: company } = await admin
    .from("companies")
    .select("id")
    .eq("id", companyId)
    .maybeSingle();
  if (!company) throw new Error("Empresa no encontrada");

  const cookieStore = await cookies();
  cookieStore.set(VIEW_AS_COOKIE, companyId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  redirect("/inicio");
}

/** Sale de la vista "Ver como cliente" y vuelve al panel de sincronización. */
export async function exitViewAs() {
  const cookieStore = await cookies();
  cookieStore.delete(VIEW_AS_COOKIE);
  redirect("/admin");
}
