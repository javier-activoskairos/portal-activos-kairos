import { NextResponse } from "next/server";
import { getPortalDb } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildInvoicePdf } from "@/lib/invoice-pdf";
import { safeFileName } from "@/lib/uploads";
import { DISPLAY_TIME_ZONE } from "@/lib/status";

export const dynamic = "force-dynamic";

function fmtDate(d: string | null): string {
  if (!d) return "—";
  const date = new Date(d);
  return date.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: DISPLAY_TIME_ZONE,
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

  const { data: invoice, error } = await db
    .from("invoices")
    .select("number, concept, amount, currency, issued_at, pdf_path")
    .eq("id", id)
    .eq("company_id", companyId)
    .maybeSingle();
  // Un fallo de BD no es un 404: distinguirlos evita que el cliente crea que su
  // factura ha desaparecido y deje de reintentar.
  if (error) {
    console.error(`[facturas:pdf] ${id}`, error.message);
    return NextResponse.json(
      { error: "No hemos podido recuperar la factura. Inténtalo de nuevo." },
      { status: 500 },
    );
  }
  if (!invoice) {
    return NextResponse.json(
      { error: "Factura no encontrada" },
      { status: 404 },
    );
  }

  // El identificador visible de la factura (p. ej. F2026-0030) suele venir en
  // "concept"; "number" puede estar vacío.
  const safeName = safeFileName(invoice.number || invoice.concept, "factura");

  // El bucket invoice-pdfs es privado: se descarga con service_role y se sirve
  // desde NUESTRO origen. Así el control de acceso de arriba es el único camino
  // (y de paso no hay redirect cross-origin, que Brave bloquea en descargas).
  if (invoice.pdf_path) {
    const admin = createAdminClient();
    const { data: blob, error: dlErr } = await admin.storage
      .from("invoice-pdfs")
      .download(invoice.pdf_path);
    if (!dlErr && blob) {
      const buf = Buffer.from(await blob.arrayBuffer());
      return new NextResponse(new Uint8Array(buf), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${safeName}.pdf"`,
          "Content-Length": String(buf.length),
          "Cache-Control": "no-store",
        },
      });
    }
    // Si el objeto no está disponible se cae al PDF generado de abajo.
    console.error(
      `[facturas:pdf] descarga ${invoice.pdf_path}`,
      dlErr?.message,
    );
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
      "Content-Disposition": `attachment; filename="${safeName}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
