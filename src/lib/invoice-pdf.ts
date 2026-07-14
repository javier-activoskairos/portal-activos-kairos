/**
 * Genera un PDF mínimo (una página, Helvetica con WinAnsiEncoding) con los
 * datos de la factura. El texto se codifica en Windows-1252, así que tildes,
 * ñ y el símbolo € se representan correctamente. Sin dependencias externas.
 */
export interface InvoicePdfData {
  number: string;
  concept: string;
  amountLabel: string; // importe + símbolo, p. ej. "890 €"
  dateLabel: string;
  companyName: string;
}

// Caracteres de Windows-1252 fuera del rango latin1 (0x80–0x9F).
const WIN1252_EXTRA: Record<string, number> = {
  "€": 0x80,
  "‚": 0x82,
  "ƒ": 0x83,
  "„": 0x84,
  "…": 0x85,
  "†": 0x86,
  "‡": 0x87,
  "ˆ": 0x88,
  "‰": 0x89,
  "Š": 0x8a,
  "‹": 0x8b,
  "Œ": 0x8c,
  "Ž": 0x8e,
  "‘": 0x91,
  "’": 0x92,
  "“": 0x93,
  "”": 0x94,
  "•": 0x95,
  "–": 0x96,
  "—": 0x97,
  "™": 0x99,
  "š": 0x9a,
  "›": 0x9b,
  "œ": 0x9c,
  "ž": 0x9e,
  "Ÿ": 0x9f,
};

/** Cadena PDF `(...)` codificada en Windows-1252, escapando ( ) \\. */
function pdfString(text: string): Buffer {
  const bytes: number[] = [0x28]; // (
  for (const ch of text) {
    if (ch === "(") bytes.push(0x5c, 0x28);
    else if (ch === ")") bytes.push(0x5c, 0x29);
    else if (ch === "\\") bytes.push(0x5c, 0x5c);
    else {
      const code = ch.codePointAt(0) ?? 0x3f;
      if (code <= 0xff) bytes.push(code);
      else if (WIN1252_EXTRA[ch] !== undefined) bytes.push(WIN1252_EXTRA[ch]);
      else bytes.push(0x3f); // '?'
    }
  }
  bytes.push(0x29); // )
  return Buffer.from(bytes);
}

const A = (s: string) => Buffer.from(s, "latin1");

export function buildInvoicePdf(inv: InvoicePdfData): Buffer {
  const lines: { text: string; size: number; gap: number }[] = [
    { text: inv.companyName, size: 20, gap: 30 },
    { text: "FACTURA", size: 10, gap: 26 },
    { text: inv.number, size: 16, gap: 34 },
    { text: "Fecha: " + inv.dateLabel, size: 12, gap: 20 },
    { text: "Concepto: " + inv.concept, size: 12, gap: 20 },
    { text: "Importe: " + inv.amountLabel, size: 14, gap: 26 },
    { text: "Estado: Pagada", size: 12, gap: 40 },
    {
      text: "Documento generado por el portal de Activos Kairos.",
      size: 9,
      gap: 0,
    },
  ];

  const parts: Buffer[] = [A("BT 60 780 Td\n")];
  for (const l of lines) {
    parts.push(A(`/F1 ${l.size} Tf `));
    parts.push(pdfString(l.text));
    parts.push(A(` Tj 0 -${l.gap} Td\n`));
  }
  parts.push(A("ET"));
  const stream = Buffer.concat(parts);

  const objBodies: (string | Buffer)[] = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    Buffer.concat([A(`<< /Length ${stream.length} >>\nstream\n`), stream, A("\nendstream")]),
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
  ];

  const header = A("%PDF-1.4\n");
  const chunks: Buffer[] = [header];
  const offsets: number[] = [];
  let pos = header.length;
  objBodies.forEach((b, idx) => {
    const n = idx + 1;
    offsets[n] = pos;
    const pre = A(`${n} 0 obj\n`);
    const body = typeof b === "string" ? A(b) : b;
    const post = A("\nendobj\n");
    chunks.push(pre, body, post);
    pos += pre.length + body.length + post.length;
  });

  const xrefStart = pos;
  let xref = `xref\n0 ${objBodies.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objBodies.length; i++) {
    xref += String(offsets[i]).padStart(10, "0") + " 00000 n \n";
  }
  xref += `trailer\n<< /Size ${objBodies.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  chunks.push(A(xref));
  return Buffer.concat(chunks);
}
