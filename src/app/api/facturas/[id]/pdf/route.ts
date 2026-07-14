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

  // Si la factura tiene un PDF real re-hospedado en Supabase, lo servimos desde
  // NUESTRO origen (mismo dominio): así no hay redirect ni petición cross-origin
  // que navegadores como Brave bloquean. Fetch server-to-server con User-Agent
  // de navegador para no toparse con el bot-check de Cloudflare.
  if (invoice.pdf_url) {
    try {
      const upstream = await fetch(invoice.pdf_url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
          Accept: "application/pdf,*/*",
        },
        cache: "no-store",
      });
      if (!upstream.ok) throw new Error(`upstream ${upstream.status}`);
      const buf = Buffer.from(await upstream.arrayBuffer());
      return new NextResponse(new Uint8Array(buf), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${safeName}.pdf"`,
          "Content-Length": String(buf.length),
          "Cache-Control": "no-store",
        },
      });
    } catch {
      const u = new URL(invoice.pdf_url);
      u.searchParams.set("download", `${safeName}.pdf`);
      return NextResponse.redirect(u.toString());
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
