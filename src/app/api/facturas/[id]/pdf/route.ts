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

  const safeName = (invoice.number || "factura").replace(/[^\w.-]+/g, "-");

  // Si la factura tiene un PDF real (Notion re-hospedado), se descarga a través
  // de nuestro origen para forzar el nombre y el tipo correctos (evita "pdf.txt"
  // que ocurría al redirigir a Supabase, cross-origin).
  if (invoice.pdf_url) {
    try {
      const upstream = await fetch(invoice.pdf_url);
      if (!upstream.ok) throw new Error(`fetch pdf ${upstream.status}`);
      const buf = Buffer.from(await upstream.arrayBuffer());
      return new NextResponse(new Uint8Array(buf), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${safeName}.pdf"`,
          "Cache-Control": "no-store",
        },
      });
    } catch {
      // Fallback: si no se puede leer, redirige al PDF hospedado.
      return NextResponse.redirect(invoice.pdf_url);
    }
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
