/**
 * Escala "bonita" para el eje Y: elige un paso redondo (1·2·5·10…) de modo
 * que las marcas queden equiespaciadas en valor y coincidan con las barras.
 */
export function niceScale(dataMax: number): { max: number; ticks: number[] } {
  const m = Math.max(1, dataMax);
  const rawStep = m / 6;
  const pow = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const n = rawStep / pow;
  const unit = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  const step = Math.max(1, Math.round(unit * pow));
  const max = Math.ceil(m / step) * step;
  const ticks: number[] = [];
  for (let t = max; t > 0; t -= step) ticks.push(t);
  ticks.push(0);
  return { max, ticks };
}

/** Formatea horas con coma decimal, sin ceros sobrantes (1.5 → "1,5"). */
export function fmtHoras(h: number): string {
  const s = Number.isInteger(h)
    ? String(h)
    : h.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
  return s.replace(".", ",");
}
