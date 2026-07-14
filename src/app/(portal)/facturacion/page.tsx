import Link from "next/link";
import { redirect } from "next/navigation";
import { getPortalDb } from "@/lib/session";
import { IconBilling, IconDownload, IconSettings } from "@/components/icons";

export const metadata = { title: "Facturación · Portal Activos Kairos" };
export const dynamic = "force-dynamic";

interface Billing {
  amount: string | null;
  cycle: string | null;
  next_charge_at: string | null;
  pay_brand: string | null;
  pay_last4: string | null;
  pay_expiry: string | null;
}

interface Invoice {
  id: string;
  number: string | null;
  concept: string;
  amount: string;
  currency: string | null;
  status: string;
  issued_at: string | null;
}

const INVOICE_STATUS: Record<string, { label: string; cls: string; dot: string }> = {
  pagada: {
    label: "Pagada",
    cls: "bg-success text-success-foreground",
    dot: "bg-success-foreground",
  },
  enviada: {
    label: "Enviada",
    cls: "bg-[color-mix(in_oklch,var(--info-foreground),transparent_85%)] text-[var(--info-foreground)]",
    dot: "bg-[var(--info-foreground)]",
  },
  pendiente: {
    label: "Pendiente",
    cls: "bg-warning text-warning-foreground",
    dot: "bg-warning-foreground",
  },
  rechazada: {
    label: "Rechazada",
    cls: "bg-[color-mix(in_oklch,var(--danger-foreground),transparent_85%)] text-danger-foreground",
    dot: "bg-danger-foreground",
  },
};

function fmtDate(d: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function FacturacionPage() {
  const ctx = await getPortalDb();
  // Solo el rol "Facturación" (can_manage_company) accede a esta vista.
  if (!ctx || !ctx.session.canManageCompany) redirect("/inicio");
  const { session, db, companyId } = ctx;

  const [{ data: billingRow }, { data: invoicesData }] = await Promise.all([
    db
      .from("company_billing")
      .select("amount, cycle, next_charge_at, pay_brand, pay_last4, pay_expiry")
      .eq("company_id", companyId)
      .maybeSingle(),
    db
      .from("invoices")
      .select("id, number, concept, amount, currency, status, issued_at")
      .eq("company_id", companyId)
      .order("issued_at", { ascending: false }),
  ]);

  const billing = billingRow as Billing | null;
  const invoices = (invoicesData ?? []) as Invoice[];
  const hasMethod = !!billing?.pay_last4;

  return (
    <div className="portal-reveal space-y-4">
      <div>
        <p className="text-brand-accent text-[12.5px] font-semibold tracking-[0.14em] uppercase">
          Facturación
        </p>
        <h1 className="text-foreground mt-2.5 text-[28px] leading-tight font-extrabold tracking-tight">
          Tu suscripción, clara y al día.
        </h1>
        <p className="text-muted-foreground mt-1.5 max-w-[60ch] text-[15px] leading-relaxed">
          Consulta tu plan, tu próximo cargo y descarga cualquier factura cuando
          la necesites.
        </p>
      </div>

      {/* Suscripción + método de pago */}
      <div
        className="border-border bg-card relative overflow-hidden rounded-[22px] border p-6 shadow-[var(--shadow-sm)]"
        style={{
          backgroundImage:
            "radial-gradient(75% 130% at 100% 0%, color-mix(in oklch, var(--brand), transparent 88%), transparent 58%)",
        }}
      >
        <div className="relative flex flex-wrap items-center gap-6">
          <div className="min-w-0 flex-1">
            <div className="text-brand-accent text-[11.5px] font-bold tracking-[0.14em] uppercase">
              Tu suscripción
            </div>
            <div className="mt-2.5 mb-2 flex flex-wrap items-baseline gap-2.5">
              <span className="text-foreground text-[30px] leading-none font-extrabold tracking-tight">
                {billing?.amount ?? "—"}
              </span>
              {billing?.cycle && (
                <span className="text-muted-foreground text-sm">
                  {billing.cycle}
                </span>
              )}
            </div>
            <div className="text-muted-foreground text-[15px] leading-relaxed">
              Plan{" "}
              <span className="text-foreground font-bold">
                {session.plan ?? "—"}
              </span>
              {billing?.next_charge_at && (
                <> · próximo cargo el {fmtDate(billing.next_charge_at)}.</>
              )}
            </div>
          </div>
          {hasMethod && (
            <div className="border-border flex shrink-0 flex-col justify-center gap-2.5 self-stretch md:min-w-[220px] md:border-l md:pl-6">
              <div className="text-muted-foreground text-[11.5px] font-bold tracking-[0.14em] uppercase">
                Método de pago
              </div>
              <div className="flex items-center gap-3">
                <span className="bg-accent text-brand-accent flex size-[38px] shrink-0 items-center justify-center rounded-xl">
                  <IconBilling width={19} height={19} />
                </span>
                <div className="min-w-0">
                  <div className="text-foreground text-[15px] font-bold tracking-tight">
                    {billing?.pay_brand} ···· {billing?.pay_last4}
                  </div>
                  <div className="text-muted-foreground text-[12.5px]">
                    Caduca {billing?.pay_expiry}
                  </div>
                </div>
              </div>
              <Link
                href="/configuracion"
                className="border-border bg-card text-foreground hover:bg-muted inline-flex items-center gap-2 self-start rounded-[11px] border px-3.5 py-2 text-[13px] font-semibold transition-colors"
              >
                <IconSettings width={15} height={15} /> Configuración de empresa
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Historial de facturas */}
      <div className="flex items-center gap-2.5 pt-2">
        <h2 className="text-foreground text-[17px] font-bold tracking-tight">
          Historial de facturas
        </h2>
        <span className="border-border text-muted-foreground rounded-full border px-2.5 py-0.5 font-mono text-xs font-semibold">
          {invoices.length}
        </span>
      </div>

      {invoices.length === 0 ? (
        <p className="border-border bg-card text-muted-foreground rounded-[20px] border px-5 py-8 text-center text-sm shadow-[var(--shadow-sm)]">
          Aún no hay facturas.
        </p>
      ) : (
        <div className="border-border bg-card overflow-x-auto rounded-[18px] border shadow-[var(--shadow-sm)]">
          <table className="w-full min-w-[680px] border-collapse">
            <thead>
              <tr>
                {["Estado", "Fecha", "Factura", "Importe"].map((h) => (
                  <th
                    key={h}
                    className="text-muted-foreground px-[18px] py-3.5 text-left text-[11px] font-semibold tracking-[0.06em] uppercase"
                  >
                    {h}
                  </th>
                ))}
                <th className="text-muted-foreground px-[18px] py-3.5 text-right text-[11px] font-semibold tracking-[0.06em] uppercase">
                  PDF
                </th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id} className="border-border/60 border-t">
                  <td className="px-[18px] py-4 align-middle">
                    {(() => {
                      const s =
                        INVOICE_STATUS[inv.status] ?? INVOICE_STATUS.pendiente;
                      return (
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12.5px] font-medium ${s.cls}`}
                        >
                          <span className={`size-[7px] rounded-full ${s.dot}`} />
                          {s.label}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="text-muted-foreground px-[18px] py-4 align-middle text-sm whitespace-nowrap">
                    {fmtDate(inv.issued_at)}
                  </td>
                  <td className="px-[18px] py-4 align-middle">
                    <div className="text-foreground text-sm font-semibold">
                      {inv.concept}
                    </div>
                    {inv.number && (
                      <div className="text-muted-foreground mt-0.5 font-mono text-[11.5px]">
                        {inv.number}
                      </div>
                    )}
                  </td>
                  <td className="text-foreground px-[18px] py-4 align-middle font-mono text-sm font-semibold whitespace-nowrap">
                    {inv.amount}
                    {inv.currency ? ` ${inv.currency}` : ""}
                  </td>
                  <td className="px-[18px] py-4 text-right align-middle">
                    <a
                      href={`/api/facturas/${inv.id}/pdf`}
                      download
                      className="border-border bg-card text-foreground hover:bg-muted inline-flex h-8 items-center gap-1.5 rounded-[10px] border px-3 text-[12.5px] font-medium transition-colors"
                    >
                      <IconDownload />
                      PDF
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-muted-foreground pt-1 text-[13px]">
        ¿Necesitas una factura anterior o cambiar tus datos fiscales? Escríbenos
        y lo resolvemos el mismo día.
      </p>
    </div>
  );
}
