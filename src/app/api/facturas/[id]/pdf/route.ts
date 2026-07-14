import { NextResponse } from "next/server";
import { getPortalDb } from "@/lib/session";
import { buildInvoicePdf } from "@/lib/invoice-pdf";

export const dynamic = "force-dynamic";

function fmtDate(d: string | null): string {
  if (!d) return "—";
  const date = new Date(d);
  return date.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ctx = await getPortalDb();
  // Solo el rol Facturación puede descargar facturas.
  if (!ctx || !ctx.session.canManageCompany) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const { session, db, companyId } = ctx;

  const { data: invoice } = await db
    .from("invoices")
    .select("number, concept, amount, currency, issued_at, pdf_url")
    .eq("id", id)
    .eq("company_id", companyId)
    .maybeSingle();
  if (!invoice) {
    return NextResponse.json({ error: "Factura no encontrada" }, { status: 404 });
  }

  // El identificador visible de la factura (p. ej. F2026-0030) suele venir en
  // "concept"; "number" puede estar vacío.
  const safeName = (invoice.number || invoice.concept || "factura")
    .replace(/[^\w.-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  // Si la factura tiene un PDF real re-hospedado en Supabase, se redirige a él
  // con ?download=<nombre> — Supabase fuerza la descarga con el nombre correcto
  // (evita "pdf.txt"/"factura.pdf" y no depende de streaming del servidor).
  if (invoice.pdf_url) {
    const u = new URL(invoice.pdf_url);
    u.searchParams.set("download", `${safeName}.pdf`);
    return NextResponse.redirect(u.toString());
  }

  const pdf = buildInvoicePdf({
    number: invoice.number,
    concept: invoice.concept,
    amountLabel: `${invoice.amount} ${invoice.currency ?? ""}`.trim(),
    dateLabel: fmtDate(invoice.issued_at),
    companyName: session.companyName,
  });

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${invoice.number}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
