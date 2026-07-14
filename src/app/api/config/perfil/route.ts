import { NextResponse } from "next/server";
import { getPortalSession } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { updateNotionContact } from "@/lib/notion-write";

export const dynamic = "force-dynamic";

const clean = (v: unknown) => {
  const s = typeof v === "string" ? v.trim() : "";
  return s.length ? s : null;
};

/**
 * Guarda el perfil del usuario (todos los usuarios). Escribe en portal_users
 * (Portal) y sincroniza de vuelta a su Contacto de Notion (doble sync).
 */
export async function PUT(request: Request) {
  const session = await getPortalSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  if (session.viewingAs) {
    return NextResponse.json(
      { error: "No puedes editar datos en modo previsualización" },
      { status: 403 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Formato inválido" }, { status: 400 });
  }

  const firstName = clean(body.firstName);
  const lastName = clean(body.lastName);
  const phone = clean(body.phone);
  const roleTitle = clean(body.roleTitle);
  const personalEmail = clean(body.personalEmail);
  const birthday = clean(body.birthday); // YYYY-MM-DD | null

  if (personalEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(personalEmail)) {
    return NextResponse.json(
      { error: "El email personal no es válido" },
      { status: 400 },
    );
  }
  if (birthday && !/^\d{4}-\d{2}-\d{2}$/.test(birthday)) {
    return NextResponse.json({ error: "Fecha no válida" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("portal_users")
    .update({
      first_name: firstName,
      last_name: lastName,
      phone,
      role_title: roleTitle,
      personal_email: personalEmail,
      birthday,
    })
    .eq("auth_user_id", session.userId);
  if (error) {
    return NextResponse.json(
      { error: "No se pudo guardar el perfil" },
      { status: 500 },
    );
  }

  let notionSynced = true;
  if (session.contactNotionId) {
    try {
      await updateNotionContact(session.contactNotionId, {
        firstName,
        lastName,
        phone,
        roleTitle,
        personalEmail,
        birthday,
      });
    } catch (e) {
      notionSynced = false;
      console.error("[config:perfil] Notion write-back", e);
    }
  }

  return NextResponse.json({ ok: true, notionSynced });
}
