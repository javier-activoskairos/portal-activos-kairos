/**
 * Genera un PDF mínimo (una página, Helvetica) con los datos de la factura.
 * Contenido ASCII (el símbolo € se sustituye por " EUR") para que los offsets
 * del xref coincidan en bytes. Sin dependencias externas.
 */
export interface InvoicePdfData {
  number: string;
  concept: string;
  amount: string;
  dateLabel: string;
  companyName: string;
  fiscalName?: string | null;
}

function escapePdf(s: string): string {
  return s
    .replace(/[—–]/g, "-") // em/en dash → guion
    .replace(/€/g, " EUR")
    .replace(/[^\x20-\x7e]/g, "") // solo ASCII imprimible
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

export function buildInvoicePdf(inv: InvoicePdfData): Buffer {
  const body: { text: string; size: number; gap: number }[] = [
    { text: inv.companyName, size: 20, gap: 30 },
    { text: "FACTURA", size: 10, gap: 26 },
    { text: inv.number, size: 16, gap: 34 },
    { text: "Fecha: " + inv.dateLabel, size: 12, gap: 20 },
    { text: "Concepto: " + inv.concept, size: 12, gap: 20 },
    { text: "Cliente: " + (inv.fiscalName || inv.companyName), size: 12, gap: 20 },
    { text: "Importe: " + inv.amount, size: 14, gap: 26 },
    { text: "Estado: Pagada", size: 12, gap: 40 },
    {
      text: "Documento de prueba generado por el portal de Activos Kairos.",
      size: 9,
      gap: 0,
    },
  ];

  let stream = "BT /F1 12 Tf 60 780 Td\n";
  body.forEach((l) => {
    stream += `/F1 ${l.size} Tf (${escapePdf(l.text)}) Tj 0 -${l.gap} Td\n`;
  });
  stream += "ET";

  const objs: string[] = [];
  objs[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objs[2] = "<< /Type /Pages /Kids [3 0 R] /Count 1 >>";
  objs[3] =
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>";
  objs[4] =
    "<< /Length " +
    Buffer.byteLength(stream, "latin1") +
    " >>\nstream\n" +
    stream +
    "\nendstream";
  objs[5] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  for (let i = 1; i < objs.length; i++) {
    offsets[i] = Buffer.byteLength(pdf, "latin1");
    pdf += `${i} 0 obj\n${objs[i]}\nendobj\n`;
  }
  const xrefStart = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objs.length}\n0000000000 65535 f \n`;
  for (let i = 1; i < objs.length; i++) {
    pdf += String(offsets[i]).padStart(10, "0") + " 00000 n \n";
  }
  pdf += `trailer\n<< /Size ${objs.length} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return Buffer.from(pdf, "latin1");
}
