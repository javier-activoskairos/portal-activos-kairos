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

  // Si la factura tiene un PDF real (Notion), se sirve ese.
  if (invoice.pdf_url) {
    return NextResponse.redirect(invoice.pdf_url);
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
