"use client";

import { useEffect, useRef, useState } from "react";
import { IconBilling, IconLock, IconPlus, IconCheck } from "@/components/icons";

interface Profile {
  firstName: string;
  lastName: string;
  phone: string;
  roleTitle: string;
  personalEmail: string;
  birthday: string;
  avatarUrl: string | null;
}
interface Company {
  fiscalName: string;
  taxId: string;
  address: string;
  city: string;
  region: string;
  postalCode: string;
}

const inputCls =
  "w-full rounded-xl border border-input bg-background px-4 py-3 text-[15px] text-foreground placeholder:text-muted-foreground transition-colors focus:border-brand focus:outline-none disabled:cursor-not-allowed disabled:opacity-60";
const labelCls = "text-foreground mb-1.5 block text-[13px] font-semibold";

// `htmlFor` es obligatorio: sin él la etiqueta es solo texto decorativo y el
// lector de pantalla anuncia el campo sin nombre. También hace que al pulsar
// la etiqueta se enfoque el input.
function Field({
  htmlFor,
  label,
  hint,
  children,
}: {
  htmlFor: string;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className={labelCls} htmlFor={htmlFor}>
        {label}
        {hint && (
          <span className="text-muted-foreground font-normal"> · {hint}</span>
        )}
      </label>
      {children}
    </div>
  );
}

function initials(p: Profile, email: string) {
  const a = (p.firstName || "").trim()[0] ?? "";
  const b = (p.lastName || "").trim()[0] ?? "";
  const two = (a + b).toUpperCase();
  return two || (email.trim()[0] ?? "?").toUpperCase();
}

type Status = { kind: "ok" | "err"; msg: string } | null;

// Mensajes de fallo accionables: si el backend cae sin devolver JSON, el usuario
// veía literalmente "Error" y no sabía qué hacer.
const SAVE_ERROR =
  "No hemos podido guardar. Revisa tu conexión e inténtalo de nuevo.";
const AVATAR_REMOVE_ERROR = "No hemos podido quitar la imagen. Inténtalo de nuevo.";

// Un 500 con HTML haría reventar res.json() y el usuario acabaría leyendo un
// error de parseo. Devolvemos un objeto vacío y dejamos hablar al fallback.
async function readJson(res: Response): Promise<{ [k: string]: unknown }> {
  try {
    return (await res.json()) as { [k: string]: unknown };
  } catch {
    return {};
  }
}

export function ConfigView({
  email,
  canManageCompany,
  readOnly,
  profile,
  company,
}: {
  email: string;
  canManageCompany: boolean;
  readOnly: boolean;
  profile: Profile;
  company: Company;
}) {
  const [p, setP] = useState<Profile>(profile);
  const [c, setC] = useState<Company>(company);
  const [avatar, setAvatar] = useState<string | null>(profile.avatarUrl);
  const [savingP, setSavingP] = useState(false);
  const [savingC, setSavingC] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [stP, setStP] = useState<Status>(null);
  const [stC, setStC] = useState<Status>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  // Última versión confirmada por el servidor. Arranca en las props y se
  // actualiza tras cada guardado correcto; sin esto seguiríamos comparando
  // contra las props (que no cambian) y avisaríamos de cambios sin guardar en
  // un formulario recién guardado.
  const [savedP, setSavedP] = useState<Profile>(profile);
  const [savedC, setSavedC] = useState<Company>(company);

  const locked = readOnly;
  const companyEditable = canManageCompany && !readOnly;

  // Al volver a editar limpiamos el mensaje: si no, "Perfil guardado" sigue en
  // pantalla mientras el usuario teclea cambios que todavía no se han enviado.
  const setPf = (k: keyof Profile, v: string) => {
    setStP(null);
    setP((s) => ({ ...s, [k]: v }));
  };
  const setCf = (k: keyof Company, v: string) => {
    setStC(null);
    setC((s) => ({ ...s, [k]: v }));
  };

  // Hay cambios sin guardar si lo editado difiere de lo último confirmado por el
  // servidor. El avatar no cuenta: se sube en el momento, no espera al botón.
  const dirtyP = (Object.keys(p) as (keyof Profile)[]).some(
    (k) => p[k] !== savedP[k],
  );
  const dirtyC = (Object.keys(c) as (keyof Company)[]).some(
    (k) => c[k] !== savedC[k],
  );
  // La empresa solo se puede editar con permiso: si no, sus campos nunca
  // ensucian el formulario aunque el estado difiera.
  const dirty = dirtyP || (companyEditable && dirtyC);

  // Aviso del navegador para que un cierre de pestaña accidental no se lleve por
  // delante los cambios. Solo cubre beforeunload, no la navegación interna.
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      // Chrome exige returnValue para mostrar el diálogo nativo.
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  async function savePerfil() {
    // Cortamos reentradas: el botón ya está disabled, pero un doble Enter o un
    // clic muy rápido podría colarse antes del re-render.
    if (savingP) return;
    setSavingP(true);
    setStP(null);
    try {
      const res = await fetch("/api/config/perfil", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(p),
      });
      const j = await readJson(res);
      if (!res.ok)
        throw new Error(typeof j.error === "string" ? j.error : SAVE_ERROR);
      setSavedP(p);
      setStP({
        kind: "ok",
        msg: j.notionSynced
          ? "Perfil guardado y sincronizado."
          : "Perfil guardado (sincronización con Notion pendiente).",
      });
    } catch (e) {
      setStP({ kind: "err", msg: (e as Error).message });
    } finally {
      setSavingP(false);
    }
  }

  async function saveEmpresa() {
    if (savingC) return;
    setSavingC(true);
    setStC(null);
    try {
      const res = await fetch("/api/config/empresa", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(c),
      });
      const j = await readJson(res);
      if (!res.ok)
        throw new Error(typeof j.error === "string" ? j.error : SAVE_ERROR);
      setSavedC(c);
      setStC({
        kind: "ok",
        msg: j.notionSynced
          ? "Datos fiscales guardados y sincronizados."
          : "Datos guardados (sincronización con Notion pendiente).",
      });
    } catch (e) {
      setStC({ kind: "err", msg: (e as Error).message });
    } finally {
      setSavingC(false);
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (uploading) return;
    setUploading(true);
    setStP(null);
    try {
      const fd = new FormData();
      fd.append("imagen", file);
      const res = await fetch("/api/config/avatar", { method: "POST", body: fd });
      const j = await readJson(res);
      if (!res.ok)
        throw new Error(typeof j.error === "string" ? j.error : SAVE_ERROR);
      setAvatar(typeof j.url === "string" ? j.url : null);
      // Cambiar la miniatura no basta como confirmación: quien usa lector de
      // pantalla (o quien mira el botón, no el avatar) no percibe nada.
      setStP({ kind: "ok", msg: "Imagen actualizada." });
    } catch (err) {
      setStP({ kind: "err", msg: (err as Error).message });
    } finally {
      setUploading(false);
    }
  }

  async function removeAvatar() {
    if (uploading) return;
    setUploading(true);
    setStP(null);
    try {
      const res = await fetch("/api/config/avatar", { method: "DELETE" });
      if (!res.ok) throw new Error(AVATAR_REMOVE_ERROR);
      setAvatar(null);
      setStP({ kind: "ok", msg: "Imagen eliminada." });
    } catch {
      setStP({ kind: "err", msg: AVATAR_REMOVE_ERROR });
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="portal-reveal space-y-6">
      <div>
        <p className="text-brand-accent text-[12.5px] font-semibold tracking-[0.14em] uppercase">
          Configuración
        </p>
        <h1 className="text-foreground mt-2.5 text-[28px] leading-tight font-extrabold tracking-tight">
          Tus datos personales.
        </h1>
        <p className="text-muted-foreground mt-1.5 max-w-[60ch] text-[15px] leading-relaxed">
          Mantén tu perfil actualizado. Estos datos solo los ve el equipo de
          Kairos.
        </p>
      </div>

      {readOnly && (
        <div className="border-border bg-warning text-warning-foreground rounded-2xl border px-4 py-3 text-sm">
          Estás en modo previsualización (Ver como cliente). La edición está
          desactivada.
        </div>
      )}

      {/* ---------- PERFIL ---------- */}
      <section className="border-border bg-card rounded-[22px] border p-6 shadow-[var(--shadow-sm)] sm:p-7">
        <div className="flex flex-wrap items-center gap-5">
          <span
            className="bg-accent text-brand-accent flex size-[68px] shrink-0 items-center justify-center overflow-hidden rounded-full text-[22px] font-extrabold"
            aria-hidden
          >
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatar}
                alt=""
                className="size-full object-cover"
              />
            ) : (
              initials(p, email)
            )}
          </span>
          <div>
            <div className="text-foreground mb-2 text-[13px] font-semibold">
              Imagen de perfil
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={locked || uploading}
                onClick={() => fileRef.current?.click()}
                className="border-border bg-card text-foreground hover:bg-muted inline-flex h-10 items-center gap-1.5 rounded-[11px] border px-3.5 text-[13px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60"
              >
                <IconPlus width={15} height={15} />
                {uploading ? "Subiendo…" : "Subir imagen"}
              </button>
              {avatar && !locked && (
                <button
                  type="button"
                  disabled={uploading}
                  onClick={removeAvatar}
                  className="text-muted-foreground hover:text-foreground inline-flex h-10 items-center px-2 text-[13px] font-medium transition-colors disabled:opacity-60"
                >
                  Quitar
                </button>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              hidden
              onChange={onFile}
            />
          </div>
        </div>

        <div className="border-border my-6 border-t" />

        <div className="grid gap-4 sm:grid-cols-2">
          <Field htmlFor="perfil-nombre" label="Nombre">
            <input
              id="perfil-nombre"
              className={inputCls}
              value={p.firstName}
              disabled={locked}
              onChange={(e) => setPf("firstName", e.target.value)}
              placeholder="Nombre"
            />
          </Field>
          <Field htmlFor="perfil-apellidos" label="Apellidos">
            <input
              id="perfil-apellidos"
              className={inputCls}
              value={p.lastName}
              disabled={locked}
              onChange={(e) => setPf("lastName", e.target.value)}
              placeholder="Apellidos"
            />
          </Field>
          <Field
            htmlFor="perfil-telefono"
            label="Teléfono"
            hint="formato internacional"
          >
            <input
              id="perfil-telefono"
              className={inputCls}
              value={p.phone}
              disabled={locked}
              onChange={(e) => setPf("phone", e.target.value)}
              placeholder="+34 600 000 000"
            />
          </Field>
          <Field htmlFor="perfil-cargo" label="Cargo">
            <input
              id="perfil-cargo"
              className={inputCls}
              value={p.roleTitle}
              disabled={locked}
              onChange={(e) => setPf("roleTitle", e.target.value)}
              placeholder="p. ej. Director de operaciones"
            />
          </Field>
          <Field htmlFor="perfil-email" label="Email">
            <div className="relative">
              <input
                id="perfil-email"
                className={inputCls + " pr-10"}
                value={email}
                disabled
                readOnly
              />
              <span className="text-brand-accent pointer-events-none absolute top-1/2 right-3 -translate-y-1/2">
                <IconLock width={16} height={16} />
              </span>
            </div>
          </Field>
          <Field htmlFor="perfil-email-personal" label="Email personal">
            <input
              id="perfil-email-personal"
              className={inputCls}
              type="email"
              value={p.personalEmail}
              disabled={locked}
              onChange={(e) => setPf("personalEmail", e.target.value)}
              placeholder="nombre@gmail.com"
            />
          </Field>
          <Field htmlFor="perfil-nacimiento" label="Nacimiento">
            <input
              id="perfil-nacimiento"
              className={inputCls}
              type="date"
              value={p.birthday}
              disabled={locked}
              onChange={(e) => setPf("birthday", e.target.value)}
            />
          </Field>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
          {stP && (
            // role/aria-live para que el resultado del guardado se anuncie: antes
            // era un span mudo y quien no ve la pantalla no sabía si había ido bien.
            <span
              role="status"
              aria-live="polite"
              className={
                "inline-flex items-center gap-1.5 text-[13px] font-medium " +
                (stP.kind === "ok" ? "text-success-foreground" : "text-danger-foreground")
              }
            >
              {stP.kind === "ok" && <IconCheck width={15} height={15} />}
              {stP.msg}
            </span>
          )}
          <button
            type="button"
            disabled={locked || savingP}
            onClick={savePerfil}
            className="bg-brand text-brand-foreground inline-flex min-h-11 items-center gap-2 rounded-xl px-5 py-2.5 text-[14px] font-semibold shadow-[0_6px_18px_color-mix(in_oklch,var(--brand),transparent_70%)] transition-transform hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
          >
            {savingP ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </section>

      {/* ---------- EMPRESA (solo rol Facturación) ---------- */}
      {canManageCompany && (
      <section className="border-border bg-card rounded-[22px] border p-6 shadow-[var(--shadow-sm)] sm:p-7">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-foreground text-[17px] font-bold tracking-tight">
            Datos de la empresa
          </h2>
          <span className="bg-accent text-brand-accent inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold tracking-[0.08em] uppercase">
            <IconBilling width={13} height={13} /> Acceso Facturación
          </span>
        </div>
        <p className="text-muted-foreground mt-1.5 max-w-[64ch] text-[14px] leading-relaxed">
          Datos fiscales que aparecen en tus facturas. Solo editables por
          personas con acceso a Facturación.
        </p>

        <div className="mt-5 grid gap-4">
          <Field htmlFor="empresa-nombre-fiscal" label="Nombre fiscal">
            <input
              id="empresa-nombre-fiscal"
              className={inputCls}
              value={c.fiscalName}
              disabled={!companyEditable}
              onChange={(e) => setCf("fiscalName", e.target.value)}
              placeholder="Activos Kairos"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field htmlFor="empresa-cif" label="CIF / EIN">
              <input
                id="empresa-cif"
                className={inputCls}
                value={c.taxId}
                disabled={!companyEditable}
                onChange={(e) => setCf("taxId", e.target.value)}
                placeholder="B12345678"
              />
            </Field>
            <Field htmlFor="empresa-cp" label="Código postal">
              <input
                id="empresa-cp"
                className={inputCls}
                value={c.postalCode}
                disabled={!companyEditable}
                onChange={(e) => setCf("postalCode", e.target.value)}
                placeholder="28001"
              />
            </Field>
          </div>
          <Field htmlFor="empresa-direccion" label="Dirección">
            <input
              id="empresa-direccion"
              className={inputCls}
              value={c.address}
              disabled={!companyEditable}
              onChange={(e) => setCf("address", e.target.value)}
              placeholder="Calle, número, piso"
            />
          </Field>
          <Field
            htmlFor="empresa-ubicacion"
            label="Ubicación (Localidad, Provincia / Estado)"
          >
            <input
              id="empresa-ubicacion"
              className={inputCls}
              value={c.city}
              disabled={!companyEditable}
              onChange={(e) => setCf("city", e.target.value)}
              placeholder="Madrid, Comunidad de Madrid"
            />
          </Field>
        </div>

        {companyEditable && (
          <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
            {stC && (
              <span
                role="status"
                aria-live="polite"
                className={
                  "inline-flex items-center gap-1.5 text-[13px] font-medium " +
                  (stC.kind === "ok" ? "text-success-foreground" : "text-danger-foreground")
                }
              >
                {stC.kind === "ok" && <IconCheck width={15} height={15} />}
                {stC.msg}
              </span>
            )}
            <button
              type="button"
              disabled={savingC}
              onClick={saveEmpresa}
              className="bg-brand text-brand-foreground inline-flex min-h-11 items-center gap-2 rounded-xl px-5 py-2.5 text-[14px] font-semibold shadow-[0_6px_18px_color-mix(in_oklch,var(--brand),transparent_70%)] transition-transform hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
            >
              {savingC ? "Guardando…" : "Guardar datos fiscales"}
            </button>
          </div>
        )}
      </section>
      )}
    </div>
  );
}
