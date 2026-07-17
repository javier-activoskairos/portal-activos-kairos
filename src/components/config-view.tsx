"use client";

import { useRef, useState } from "react";
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
  "w-full rounded-xl border border-input bg-background px-4 py-3 text-[15px] text-foreground placeholder:text-muted-foreground/70 transition-colors focus:border-brand focus:outline-none disabled:cursor-not-allowed disabled:opacity-60";
const labelCls = "text-foreground mb-1.5 block text-[13px] font-semibold";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className={labelCls}>
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

  const locked = readOnly;
  const companyEditable = canManageCompany && !readOnly;

  const setPf = (k: keyof Profile, v: string) => setP((s) => ({ ...s, [k]: v }));
  const setCf = (k: keyof Company, v: string) => setC((s) => ({ ...s, [k]: v }));

  async function savePerfil() {
    setSavingP(true);
    setStP(null);
    try {
      const res = await fetch("/api/config/perfil", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(p),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Error");
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
    setSavingC(true);
    setStC(null);
    try {
      const res = await fetch("/api/config/empresa", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(c),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Error");
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
    setUploading(true);
    setStP(null);
    try {
      const fd = new FormData();
      fd.append("imagen", file);
      const res = await fetch("/api/config/avatar", { method: "POST", body: fd });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || "Error");
      setAvatar(j.url);
    } catch (err) {
      setStP({ kind: "err", msg: (err as Error).message });
    } finally {
      setUploading(false);
    }
  }

  async function removeAvatar() {
    setUploading(true);
    try {
      const res = await fetch("/api/config/avatar", { method: "DELETE" });
      if (!res.ok) throw new Error("Error");
      setAvatar(null);
    } catch {
      setStP({ kind: "err", msg: "No se pudo quitar la imagen" });
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
                className="border-border bg-card text-foreground hover:bg-muted inline-flex items-center gap-1.5 rounded-[11px] border px-3.5 py-2 text-[13px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60"
              >
                <IconPlus width={15} height={15} />
                {uploading ? "Subiendo…" : "Subir imagen"}
              </button>
              {avatar && !locked && (
                <button
                  type="button"
                  disabled={uploading}
                  onClick={removeAvatar}
                  className="text-muted-foreground hover:text-foreground text-[13px] font-medium transition-colors disabled:opacity-60"
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
          <Field label="Nombre">
            <input
              className={inputCls}
              value={p.firstName}
              disabled={locked}
              onChange={(e) => setPf("firstName", e.target.value)}
              placeholder="Javier"
            />
          </Field>
          <Field label="Apellidos">
            <input
              className={inputCls}
              value={p.lastName}
              disabled={locked}
              onChange={(e) => setPf("lastName", e.target.value)}
              placeholder="Salido"
            />
          </Field>
          <Field label="Teléfono" hint="formato internacional">
            <input
              className={inputCls}
              value={p.phone}
              disabled={locked}
              onChange={(e) => setPf("phone", e.target.value)}
              placeholder="+34 600 000 000"
            />
          </Field>
          <Field label="Cargo">
            <input
              className={inputCls}
              value={p.roleTitle}
              disabled={locked}
              onChange={(e) => setPf("roleTitle", e.target.value)}
              placeholder="p. ej. Director de operaciones"
            />
          </Field>
          <Field label="Email">
            <div className="relative">
              <input
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
          <Field label="Email personal">
            <input
              className={inputCls}
              type="email"
              value={p.personalEmail}
              disabled={locked}
              onChange={(e) => setPf("personalEmail", e.target.value)}
              placeholder="nombre@gmail.com"
            />
          </Field>
          <Field label="Nacimiento">
            <input
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
            <span
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
            className="bg-brand text-brand-foreground inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-[14px] font-semibold shadow-[0_6px_18px_color-mix(in_oklch,var(--brand),transparent_70%)] transition-transform hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
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
          <Field label="Nombre fiscal">
            <input
              className={inputCls}
              value={c.fiscalName}
              disabled={!companyEditable}
              onChange={(e) => setCf("fiscalName", e.target.value)}
              placeholder="Activos Kairos"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="CIF / EIN">
              <input
                className={inputCls}
                value={c.taxId}
                disabled={!companyEditable}
                onChange={(e) => setCf("taxId", e.target.value)}
                placeholder="B12345678"
              />
            </Field>
            <Field label="Código postal">
              <input
                className={inputCls}
                value={c.postalCode}
                disabled={!companyEditable}
                onChange={(e) => setCf("postalCode", e.target.value)}
                placeholder="28001"
              />
            </Field>
          </div>
          <Field label="Dirección">
            <input
              className={inputCls}
              value={c.address}
              disabled={!companyEditable}
              onChange={(e) => setCf("address", e.target.value)}
              placeholder="Calle, número, piso"
            />
          </Field>
          <Field label="Ubicación (Localidad, Provincia / Estado)">
            <input
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
              className="bg-brand text-brand-foreground inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-[14px] font-semibold shadow-[0_6px_18px_color-mix(in_oklch,var(--brand),transparent_70%)] transition-transform hover:-translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
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
