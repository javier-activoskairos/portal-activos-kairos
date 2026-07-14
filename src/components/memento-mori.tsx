"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

/* CSS del diseño (MementoMori.html), scopeado bajo .mm-root para no afectar al
   resto del portal (variables propias, tema oscuro fijo). */
const CSS = `
.mm-root {
  --bg:#141312; --bg-2:#1B1A18; --card:#211F1C; --card-2:#262320;
  --border:#322E2A; --border-2:#3D3833;
  --orange:#F96302; --orange-soft:#F8A848;
  --ink:#F5EDE6; --body:#E0D6CB; --muted:#A89C90; --faint:#7C7065;
  --danger:#F2704F; --amber:#F0B44A; --success:#4FBE87; --info:#6FA8E8;
  --font:'Satoshi',system-ui,-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;
  --mono:'JetBrains Mono',ui-monospace,'SFMono-Regular',Menlo,monospace;
  min-height:100vh; padding-top:57px;
  font-family:var(--font); background:var(--bg); color:var(--body);
  -webkit-font-smoothing:antialiased; line-height:1.5;
}
.mm-root *{ box-sizing:border-box; }
.mm-root ::selection{ background:rgba(249,99,2,.3); color:#fff; }
.mm-root .shell{ max-width:1060px; margin:0 auto; padding:0 22px; }
.mm-root .topbar{ position:fixed; top:0; left:0; right:0; z-index:50; display:flex; align-items:center; gap:12px; padding:12px 22px; background:rgba(20,19,18,.72); backdrop-filter:blur(10px); -webkit-backdrop-filter:blur(10px); border-bottom:1px solid var(--border); }
.mm-root .topbar .back{ display:inline-flex; align-items:center; gap:8px; text-decoration:none; font-size:13.5px; font-weight:600; color:var(--ink); padding:8px 14px; border-radius:11px; border:1px solid var(--border-2); transition:background .16s; }
.mm-root .topbar .back:hover{ background:var(--card); }
.mm-root .topbar .brand{ display:inline-flex; align-items:center; gap:8px; margin-left:auto; font-size:11px; font-weight:700; letter-spacing:.16em; text-transform:uppercase; color:var(--faint); font-family:var(--mono); }
.mm-root .hero{ position:relative; overflow:hidden; padding:92px 0 76px; border-bottom:1px solid var(--border); }
.mm-root .hero-waves{ position:absolute; inset:0; z-index:0; opacity:.9; pointer-events:none; }
.mm-root .hero-waves svg{ width:100%; height:100%; display:block; }
.mm-root .hero .shell{ position:relative; z-index:1; }
.mm-root .eyebrow{ display:inline-flex; align-items:center; gap:9px; font-size:12px; font-weight:700; letter-spacing:.16em; text-transform:uppercase; color:var(--orange-soft); margin-bottom:22px; }
.mm-root .eyebrow .pulse{ width:8px; height:8px; border-radius:999px; background:var(--danger); box-shadow:0 0 0 0 rgba(242,112,79,.5); animation:mmpulse 2.4s infinite; }
@keyframes mmpulse{ 0%{ box-shadow:0 0 0 0 rgba(242,112,79,.45);} 70%{ box-shadow:0 0 0 12px rgba(242,112,79,0);} 100%{ box-shadow:0 0 0 0 rgba(242,112,79,0);} }
.mm-root h1.title{ font-size:clamp(2.5rem,1.4rem + 4.6vw,4.4rem); font-weight:800; letter-spacing:-.035em; line-height:1.02; color:var(--ink); margin:0 0 22px; max-width:16ch; }
.mm-root h1.title em{ font-style:normal; color:var(--orange); }
.mm-root .lede{ font-size:clamp(1.05rem,.95rem + .5vw,1.3rem); color:var(--muted); max-width:54ch; margin:0 0 14px; }
.mm-root .memento{ font-family:var(--mono); font-size:13.5px; color:var(--faint); font-style:italic; border-left:2px solid var(--border-2); padding-left:14px; margin:26px 0 34px; max-width:48ch; }
.mm-root .hero-counter{ display:flex; align-items:baseline; gap:14px; flex-wrap:wrap; margin-bottom:34px; }
.mm-root .hero-counter .big{ font-size:clamp(2.6rem,1.6rem + 4vw,4.2rem); font-weight:800; letter-spacing:-.03em; color:var(--danger); font-variant-numeric:tabular-nums; line-height:1; }
.mm-root .hero-counter .cap{ font-size:14px; color:var(--muted); max-width:22ch; }
.mm-root .btn{ display:inline-flex; align-items:center; gap:10px; cursor:pointer; font-family:inherit; font-size:15px; font-weight:600; color:#fff; background:var(--orange); border:none; padding:15px 26px; border-radius:14px; box-shadow:0 8px 26px rgba(249,99,2,.34); transition:transform .16s,background .16s; text-decoration:none; }
.mm-root .btn:hover{ background:#E15700; transform:translateY(-2px); }
.mm-root .microcopy{ font-size:13px; color:var(--faint); margin-top:16px; }
.mm-root section.block{ padding:66px 0; border-bottom:1px solid var(--border); }
.mm-root .sec-eyebrow{ font-size:12px; font-weight:700; letter-spacing:.16em; text-transform:uppercase; color:var(--orange-soft); margin:0 0 12px; }
.mm-root h2.sec{ font-size:clamp(1.7rem,1.2rem + 1.8vw,2.5rem); font-weight:800; letter-spacing:-.028em; color:var(--ink); margin:0 0 10px; }
.mm-root .sec-sub{ font-size:15.5px; color:var(--muted); max-width:58ch; margin:0 0 34px; }
.mm-root .modes{ display:flex; gap:10px; flex-wrap:wrap; margin-bottom:28px; }
.mm-root .mode{ cursor:pointer; font-family:inherit; font-size:13.5px; font-weight:600; color:var(--body); background:var(--card); border:1px solid var(--border-2); padding:9px 16px; border-radius:999px; transition:all .16s; }
.mm-root .mode:hover{ border-color:var(--orange); color:var(--ink); }
.mm-root .mode.on{ background:rgba(249,99,2,.14); border-color:var(--orange); color:var(--orange-soft); }
.mm-root .cfg-grid{ display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:16px; }
.mm-root .fld{ background:var(--card); border:1px solid var(--border); border-radius:18px; padding:20px 22px; }
.mm-root .fld-top{ display:flex; align-items:baseline; justify-content:space-between; gap:10px; margin-bottom:14px; }
.mm-root .fld-label{ font-size:14px; font-weight:600; color:var(--ink); }
.mm-root .fld-val{ font-family:var(--mono); font-size:16px; font-weight:700; color:var(--orange-soft); font-variant-numeric:tabular-nums; }
.mm-root .fld-note{ font-size:12px; color:var(--faint); margin-top:12px; }
.mm-root input[type=number]{ width:100%; height:46px; padding:0 14px; font-family:var(--font); font-size:18px; font-weight:700; color:var(--ink); background:var(--bg-2); border:1px solid var(--border-2); border-radius:12px; outline:none; transition:border-color .16s; }
.mm-root input[type=number]:focus{ border-color:var(--orange); }
.mm-root input[type=range]{ -webkit-appearance:none; appearance:none; width:100%; height:6px; border-radius:999px; background:var(--border-2); outline:none; margin:6px 0; }
.mm-root input[type=range]::-webkit-slider-thumb{ -webkit-appearance:none; appearance:none; width:22px; height:22px; border-radius:999px; background:var(--orange); cursor:pointer; border:3px solid #fff2; box-shadow:0 2px 8px rgba(0,0,0,.4); }
.mm-root input[type=range]::-moz-range-thumb{ width:20px; height:20px; border-radius:999px; background:var(--orange); cursor:pointer; border:3px solid #fff2; }
.mm-root .kpis{ display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:14px; }
.mm-root .kpi{ background:var(--card); border:1px solid var(--border); border-radius:20px; padding:22px 22px 24px; position:relative; overflow:hidden; }
.mm-root .kpi::after{ content:''; position:absolute; left:0; top:0; width:3px; height:100%; background:var(--accent,var(--orange)); }
.mm-root .kpi-cap{ font-size:12.5px; color:var(--muted); margin-bottom:14px; }
.mm-root .kpi-num{ font-size:clamp(1.7rem,1.2rem + 1.4vw,2.3rem); font-weight:800; letter-spacing:-.02em; color:var(--ink); font-variant-numeric:tabular-nums; line-height:1; }
.mm-root .kpi-sub{ font-size:12px; color:var(--faint); margin-top:8px; }
.mm-root .chart-card{ background:var(--card); border:1px solid var(--border); border-radius:22px; padding:26px 28px; margin-bottom:16px; }
.mm-root .chart-title{ font-size:17px; font-weight:700; letter-spacing:-.015em; color:var(--ink); margin:0 0 4px; }
.mm-root .chart-note{ font-size:13px; color:var(--faint); margin:0 0 22px; }
.mm-root .chart-quote{ font-size:13.5px; font-style:italic; color:var(--muted); margin:20px 0 0; padding-top:16px; border-top:1px solid var(--border); }
.mm-root .week-bar{ display:flex; height:42px; border-radius:10px; overflow:hidden; border:1px solid var(--border-2); }
.mm-root .week-seg{ height:100%; transition:width .5s cubic-bezier(.2,.7,.2,1); min-width:0; }
.mm-root .week-legend{ display:flex; flex-wrap:wrap; gap:16px 22px; margin-top:18px; }
.mm-root .wl{ display:flex; align-items:center; gap:8px; font-size:13px; color:var(--body); }
.mm-root .wl .sw{ width:12px; height:12px; border-radius:4px; flex:0 0 auto; }
.mm-root .wl b{ font-family:var(--mono); font-weight:600; color:var(--muted); }
.mm-root .vbars{ display:flex; align-items:flex-end; gap:12px; height:200px; }
.mm-root .vcol{ flex:1; display:flex; flex-direction:column; align-items:center; height:100%; justify-content:flex-end; gap:10px; }
.mm-root .vbar{ width:100%; max-width:74px; border-radius:9px 9px 0 0; transition:height .5s cubic-bezier(.2,.7,.2,1); position:relative; }
.mm-root .vbar .cap{ position:absolute; top:-22px; left:0; right:0; text-align:center; font-family:var(--mono); font-size:12px; font-weight:700; color:var(--ink); white-space:nowrap; }
.mm-root .vlab{ font-size:12px; color:var(--muted); text-align:center; max-width:92px; }
.mm-root .hem{ display:flex; align-items:flex-end; gap:6px; height:170px; }
.mm-root .hcol{ flex:1; background:linear-gradient(180deg,var(--danger),#8E3826); border-radius:4px 4px 0 0; transition:height .5s; min-height:3px; }
.mm-root .hem-x{ display:flex; gap:6px; margin-top:8px; }
.mm-root .hem-x span{ flex:1; text-align:center; font-size:10.5px; color:var(--faint); }
/* semana — leyenda clicable + eje de horas absolutas */
.mm-root .wl.mm-click{ cursor:pointer; user-select:none; transition:opacity .16s; }
.mm-root .wl.mm-click:hover{ opacity:.85; }
.mm-root .wl.off{ opacity:.42; }
.mm-root .wl.off .sw{ background:transparent!important; box-shadow:inset 0 0 0 2px var(--border-2); }
.mm-root .wl.off b{ text-decoration:line-through; }
.mm-root .week-axis{ position:relative; height:22px; margin-top:9px; }
.mm-root .week-tick{ position:absolute; top:0; transform:translateX(-50%); display:flex; flex-direction:column; align-items:center; font-family:var(--mono); font-size:10.5px; color:var(--faint); }
.mm-root .week-tick i{ width:1px; height:7px; background:var(--border-2); margin-bottom:3px; }
.mm-root .week-total{ font-family:var(--mono); font-size:12.5px; color:var(--muted); margin-top:12px; }
.mm-root .week-total b{ color:var(--ink); font-weight:700; }
/* hemorragia — eje Y con valores + tooltip en hover */
.mm-root .hem-wrap{ display:flex; gap:12px; }
.mm-root .hem-yaxis{ display:flex; flex-direction:column; justify-content:space-between; height:170px; font-family:var(--mono); font-size:10px; color:var(--faint); text-align:right; white-space:nowrap; }
.mm-root .hem-main{ flex:1; min-width:0; }
.mm-root .hem-plot{ position:relative; height:170px; }
.mm-root .hem-gridline{ position:absolute; left:0; right:0; height:1px; background:var(--border); }
.mm-root .hem-plot .hem{ position:relative; z-index:1; height:100%; margin:0; }
.mm-root .hcol{ position:relative; cursor:default; }
.mm-root .hcol:hover{ filter:brightness(1.14); }
.mm-root .hcol .hem-tip{ position:absolute; bottom:100%; left:50%; transform:translateX(-50%); margin-bottom:7px; background:var(--bg-2); border:1px solid var(--border-2); color:var(--ink); font-family:var(--mono); font-size:11px; font-weight:700; padding:4px 8px; border-radius:7px; white-space:nowrap; opacity:0; pointer-events:none; transition:opacity .14s; box-shadow:0 4px 14px rgba(0,0,0,.4); z-index:3; }
.mm-root .hcol:hover .hem-tip{ opacity:1; }
.mm-root .diag{ background:linear-gradient(150deg,var(--card-2),var(--card)); border:1px solid var(--border-2); border-radius:22px; padding:30px 32px; }
.mm-root .diag p{ font-size:16.5px; line-height:1.65; color:var(--body); margin:0 0 16px; }
.mm-root .diag p:last-of-type{ margin-bottom:0; }
.mm-root .diag b{ color:var(--ink); font-weight:700; }
.mm-root .diag .hl{ color:var(--orange-soft); font-weight:700; }
.mm-root .level{ display:inline-flex; align-items:center; gap:10px; font-size:14px; font-weight:700; padding:8px 16px; border-radius:999px; margin-bottom:22px; }
.mm-root .level .dot{ width:9px; height:9px; border-radius:999px; }
.mm-root .emo{ display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:14px; margin-top:24px; }
.mm-root .emo-card{ background:var(--bg-2); border:1px solid var(--border); border-radius:16px; padding:18px 20px; }
.mm-root .emo-num{ font-size:26px; font-weight:800; color:var(--orange); letter-spacing:-.02em; font-variant-numeric:tabular-nums; }
.mm-root .emo-lab{ font-size:12.5px; color:var(--muted); margin-top:6px; line-height:1.45; }
.mm-root .close{ text-align:center; padding:80px 0 90px; }
.mm-root .close h2{ font-size:clamp(1.8rem,1.2rem + 2.2vw,2.9rem); font-weight:800; letter-spacing:-.03em; color:var(--ink); margin:0 auto 14px; max-width:20ch; }
.mm-root .close h2 em{ font-style:normal; color:var(--orange); }
.mm-root .close p{ font-size:16px; color:var(--muted); max-width:46ch; margin:0 auto 30px; }
@media (max-width:760px){
  .mm-root .cfg-grid{ grid-template-columns:1fr; }
  .mm-root .kpis{ grid-template-columns:repeat(2,1fr); }
  .mm-root .emo{ grid-template-columns:1fr; }
  .mm-root .hero{ padding:64px 0 54px; }
}
`;

const DIAS_MES = 21,
  DIAS_ANIO = 220,
  H_JORNADA = 8,
  SEMANA_H = 40,
  RED_BUSQUEDA = 0.35,
  RED_MANUAL = 0.4;
const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const MODES: Record<string, { busqueda: number; manual: number }> = {
  conservador: { busqueda: 0.5, manual: 0.5 },
  realista: { busqueda: 1, manual: 1 },
  critico: { busqueda: 1.75, manual: 1.75 },
};

const eur = (n: number) =>
  new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(Math.round(n));
const num = (n: number, d = 0) =>
  new Intl.NumberFormat("es-ES", { maximumFractionDigits: d }).format(n);
// Etiqueta compacta para el eje Y (50.000 → "50 k €")
const eurAxis = (n: number) =>
  n >= 1000 ? `${num(n / 1000)} k €` : eur(n);
// Techo "redondo" para el eje (151.200 → 200.000)
function niceMax(v: number): number {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  const m = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return m * p;
}

function compute(v: {
  personas: number;
  costeHora: number;
  busqueda: number;
  manual: number;
  profundo: number;
}) {
  const horasBusquedaMes = v.personas * v.busqueda * DIAS_MES;
  const horasManualMes = v.personas * v.manual * DIAS_MES;
  const horasPerdidasMes = horasBusquedaMes + horasManualMes;
  const costeMensual = horasPerdidasMes * v.costeHora;
  const costeAnual = costeMensual * 12;
  const busquedaRec = horasBusquedaMes * RED_BUSQUEDA;
  const manualRec = horasManualMes * RED_MANUAL;
  const recuperablesMes = busquedaRec + manualRec;
  const ahorroAnual = recuperablesMes * v.costeHora * 12;
  const diasPerdidosAnio = (horasPerdidasMes * 12) / H_JORNADA;
  const diasRecuperablesMes = recuperablesMes / H_JORNADA;
  const horasPerdidasAnio = horasPerdidasMes * 12;
  const personasEquivalentes = horasPerdidasAnio / (H_JORNADA * DIAS_ANIO);
  return {
    ...v,
    horasBusquedaMes,
    horasManualMes,
    horasPerdidasMes,
    costeMensual,
    costeAnual,
    busquedaRec,
    manualRec,
    recuperablesMes,
    ahorroAnual,
    diasPerdidosAnio,
    diasRecuperablesMes,
    horasPerdidasAnio,
    personasEquivalentes,
  };
}

export function MementoMoriCalculator() {
  const [personas, setPersonas] = useState(12);
  const [costeHora, setCosteHora] = useState(25);
  const [busqueda, setBusqueda] = useState(1);
  const [manual, setManual] = useState(1);
  const [profundo, setProfundo] = useState(40);
  const [hiddenSeg, setHiddenSeg] = useState<Set<string>>(new Set());
  const toggleSeg = (k: string) =>
    setHiddenSeg((prev) => {
      const n = new Set(prev);
      if (n.has(k)) n.delete(k);
      else n.add(k);
      return n;
    });

  const v = {
    personas: Math.max(1, personas || 1),
    costeHora: Math.max(1, costeHora || 1),
    busqueda,
    manual,
    profundo,
  };
  const r = useMemo(() => compute(v), [personas, costeHora, busqueda, manual, profundo]);

  const activeMode =
    Object.entries(MODES).find(
      ([, m]) => m.busqueda === busqueda && m.manual === manual,
    )?.[0] ?? null;
  const applyMode = (k: string) => {
    setBusqueda(MODES[k].busqueda);
    setManual(MODES[k].manual);
  };

  // Semana (40 h/persona)
  const busquedaW = Math.min(SEMANA_H, v.busqueda * 5);
  const manualW = Math.min(SEMANA_H - busquedaW, v.manual * 5);
  const deep = Math.min(
    SEMANA_H - busquedaW - manualW,
    (v.profundo / 100) * SEMANA_H,
  );
  const resto = Math.max(0, SEMANA_H - busquedaW - manualW - deep);
  const segs = [
    { k: "Trabajo profundo", h: deep, c: "var(--success)" },
    { k: "Búsqueda de información", h: busquedaW, c: "var(--orange)" },
    { k: "Tareas manuales", h: manualW, c: "var(--amber)" },
    { k: "Comunicación / coordinación", h: resto * 0.65, c: "var(--info)" },
    { k: "Otros", h: resto * 0.35, c: "var(--faint)" },
  ];
  // Segmentos visibles (leyenda clicable) → la barra se reescala y no deja hueco.
  const visibleSegs = segs.filter((s) => !hiddenSeg.has(s.k));
  const visTotal = visibleSegs.reduce((a, s) => a + s.h, 0) || 1;
  const weekStep =
    visTotal > 30 ? 10 : visTotal > 12 ? 5 : visTotal > 4 ? 2 : 1;
  const weekTicks: number[] = [];
  for (let t = 0; t <= visTotal + 0.0001; t += weekStep) weekTicks.push(t);

  // Hemorragia anual (acumulado)
  let acc = 0;
  const hemVals = MESES.map(() => (acc += r.costeMensual));
  const hemMax = acc || 1;
  const hemYMax = niceMax(hemMax);
  const hemTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => hemYMax * f);

  // Antes/después
  const baCols = [
    { lab: "Actual", h: r.horasPerdidasMes, c: "var(--danger)" },
    { lab: "Con fuente de verdad", h: r.horasPerdidasMes - r.busquedaRec, c: "var(--amber)" },
    { lab: "Con automatización", h: r.horasPerdidasMes - r.manualRec, c: "var(--orange)" },
    { lab: "Sistema inteligente", h: r.horasPerdidasMes - r.recuperablesMes, c: "var(--success)" },
  ];
  const baMax = r.horasPerdidasMes || 1;

  // Diagnóstico
  const friccion = v.busqueda + v.manual;
  const sinFuga = friccion <= 0;
  const diag = sinFuga
    ? { level: "Sin fuga", color: "var(--success)" }
    : friccion < 1
      ? { level: "Fuga leve", color: "var(--info)" }
      : friccion < 2
        ? { level: "Fuga moderada", color: "var(--amber)" }
        : friccion < 3
          ? { level: "Fuga alta", color: "var(--orange)" }
          : { level: "Fuga crítica", color: "var(--danger)" };

  const diagHtml = sinFuga
    ? `<p>Cero fricción declarada: tu equipo de <b>${num(r.personas)} personas</b> no pierde tiempo buscando información ni repitiendo tareas manuales. <span class="hl">No hay fuga operativa.</span></p>` +
      `<p>Eso significa que ya no dependes de la memoria humana ni del esfuerzo bruto: tienes <b>activos</b> que <b>potencian a las personas</b> que trabajan en la empresa, <b>elevan su valor y multiplican su potencial</b> en lugar de consumirlo en coordinación y repetición.</p>` +
      `<p>…aunque, siendo sinceros: <span class="hl">¿seguro que no estás en Tempo?</span> Porque esto —convertir el caos en activos que trabajan por ti— es exactamente lo que hacemos aquí. 😏</p>`
    : `<p>Con un equipo de <b>${num(r.personas)} personas</b>, perdiendo <b>${num(r.busqueda, 2)} h/día</b> buscando información y <b>${num(r.manual, 2)} h/día</b> en procesos manuales, tu empresa deja escapar unas <span class="hl">${num(r.horasPerdidasMes)} horas al mes</span>.</p>` +
      `<p>A ${eur(r.costeHora)}/h, son <span class="hl">${eur(r.costeMensual)} mensuales</span> de coste operativo invisible — <b>${eur(r.costeAnual)} al año</b> en tiempo que ya pagas pero que no se convierte en avance estratégico.</p>` +
      `<p>Si reduces un 35% la búsqueda y automatizas un 40% de las tareas manuales, podrías recuperar unas <span class="hl">${num(r.recuperablesMes)} horas al mes</span>: más de <b>${num(r.diasRecuperablesMes)} días completos de trabajo</b> cada mes.</p>`;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="mm-root">
        <nav className="topbar">
          <Link className="back" href="/inicio">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 12H5M11 18l-6-6 6-6" />
            </svg>
            Volver al portal
          </Link>
          <span className="brand">Bitácora de Rumbo</span>
        </nav>

        {/* HERO */}
        <header className="hero">
          <div className="hero-waves" aria-hidden>
            <svg viewBox="0 0 1200 420" preserveAspectRatio="none">
              <defs>
                <linearGradient id="mmhg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#F96302" stopOpacity="0.16" />
                  <stop offset="1" stopColor="#F96302" stopOpacity="0.015" />
                </linearGradient>
              </defs>
              <path
                fill="#F8A848"
                fillOpacity="0.05"
                d="M0,190 C200,120 360,250 600,200 C840,150 1000,260 1200,190 L1200,420 L0,420 Z"
              />
              <path
                fill="url(#mmhg)"
                d="M0,270 C220,210 380,320 620,270 C860,220 1010,330 1200,260 L1200,420 L0,420 Z"
              />
              <path
                fill="#F96302"
                fillOpacity="0.07"
                d="M0,340 C240,300 400,380 640,345 C880,310 1030,385 1200,340 L1200,420 L0,420 Z"
              />
            </svg>
          </div>
          <div className="shell">
            <div className="eyebrow">
              <span className="pulse" /> Memento mori empresarial
            </div>
            <h1 className="title">
              ¿Cuánto tiempo está <em>muriendo</em> tu empresa cada semana?
            </h1>
            <p className="lede">
              Calcula el coste invisible de buscar información, repetir procesos y
              trabajar sin una fuente de verdad.
            </p>
            <div className="memento">
              “Recuerda que tu empresa también pierde vida. No muere de golpe:
              muere cada día en búsquedas, duplicidades y tareas manuales.”
            </div>
            <div className="hero-counter">
              <span className="big">{num(r.horasPerdidasMes)}</span>
              <span className="cap">
                horas se escapan al mes con la configuración de partida.
              </span>
            </div>
            <a className="btn" href="#calc">
              Calcular mi fuga operativa
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 5v14M19 12l-7 7-7-7" />
              </svg>
            </a>
            <div className="microcopy">
              En menos de 2 minutos estimas cuánto tiempo operativo estás dejando
              escapar.
            </div>
          </div>
        </header>

        {/* CONFIGURADOR */}
        <section className="block" id="calc">
          <div className="shell">
            <p className="sec-eyebrow">Configurador</p>
            <h2 className="sec">Responde 5 preguntas.</h2>
            <p className="sec-sub">
              Verás, en tiempo real, cuántas horas, días y euros se escapan cada
              año por trabajar sin un sistema claro.
            </p>

            <div className="modes">
              {(["conservador", "realista", "critico"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  className={"mode" + (activeMode === m ? " on" : "")}
                  onClick={() => applyMode(m)}
                >
                  {m === "conservador" ? "Conservador" : m === "realista" ? "Realista" : "Crítico"}
                </button>
              ))}
            </div>

            <div className="cfg-grid">
              <div className="fld">
                <div className="fld-top">
                  <span className="fld-label">Personas en el equipo</span>
                </div>
                <input
                  type="number"
                  min={1}
                  max={9999}
                  value={personas}
                  onChange={(e) => setPersonas(Number(e.target.value))}
                />
              </div>
              <div className="fld">
                <div className="fld-top">
                  <span className="fld-label">Coste medio por hora / persona</span>
                </div>
                <input
                  type="number"
                  min={1}
                  max={9999}
                  value={costeHora}
                  onChange={(e) => setCosteHora(Number(e.target.value))}
                />
                <div className="fld-note">
                  €/hora. Si no lo sabes, 25 €/h es una estimación razonable.
                </div>
              </div>
              <div className="fld">
                <div className="fld-top">
                  <span className="fld-label">Horas/día buscando información</span>
                  <span className="fld-val">{num(busqueda, 2)} h</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={3}
                  step={0.25}
                  value={busqueda}
                  onChange={(e) => setBusqueda(Number(e.target.value))}
                />
                <div className="fld-note">
                  McKinsey estima que puede acercarse al 20% de la semana laboral.
                </div>
              </div>
              <div className="fld">
                <div className="fld-top">
                  <span className="fld-label">Horas/día en tareas manuales</span>
                  <span className="fld-val">{num(manual, 2)} h</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={3}
                  step={0.25}
                  value={manual}
                  onChange={(e) => setManual(Number(e.target.value))}
                />
                <div className="fld-note">
                  Notion: la automatización libera ~3,6 h/semana por persona.
                </div>
              </div>
              <div className="fld">
                <div className="fld-top">
                  <span className="fld-label">Trabajo profundo real</span>
                  <span className="fld-val">{profundo} %</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={80}
                  step={5}
                  value={profundo}
                  onChange={(e) => setProfundo(Number(e.target.value))}
                />
                <div className="fld-note">
                  Asana: el 60% del tiempo se va en “trabajo sobre el trabajo”.
                </div>
              </div>
              <div className="fld" style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <div className="fld-note" style={{ margin: "0 0 8px" }}>
                  Coste de UNA hora perdida por todo tu equipo
                </div>
                <div className="kpi-num" style={{ color: "var(--orange)" }}>
                  {eur(v.personas * v.costeHora)}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* KPIS */}
        <section className="block">
          <div className="shell">
            <p className="sec-eyebrow">Diagnóstico crudo</p>
            <h2 className="sec">Tu empresa pierde aproximadamente…</h2>
            <p className="sec-sub">
              Este coste no aparece como una factura. Aparece como retrasos,
              saturación, errores, reuniones innecesarias y decisiones más lentas.
            </p>
            <div className="kpis">
              <div className="kpi" style={{ ["--accent" as string]: "var(--danger)" }}>
                <div className="kpi-cap">Horas perdidas al mes</div>
                <div className="kpi-num">{num(r.horasPerdidasMes)}</div>
                <div className="kpi-sub">de todo el equipo</div>
              </div>
              <div className="kpi" style={{ ["--accent" as string]: "var(--amber)" }}>
                <div className="kpi-cap">Coste invisible mensual</div>
                <div className="kpi-num">{eur(r.costeMensual)}</div>
                <div className="kpi-sub">tiempo ya pagado</div>
              </div>
              <div className="kpi" style={{ ["--accent" as string]: "var(--orange)" }}>
                <div className="kpi-cap">Coste invisible anual</div>
                <div className="kpi-num">{eur(r.costeAnual)}</div>
                <div className="kpi-sub">× 12 meses</div>
              </div>
              <div className="kpi" style={{ ["--accent" as string]: "var(--info)" }}>
                <div className="kpi-cap">Días-equipo perdidos/año</div>
                <div className="kpi-num">{num(r.diasPerdidosAnio)}</div>
                <div className="kpi-sub">jornadas completas</div>
              </div>
            </div>
          </div>
        </section>

        {/* GRÁFICOS */}
        <section className="block">
          <div className="shell">
            <p className="sec-eyebrow">La anatomía de la fuga</p>
            <h2 className="sec">Dónde se va la vida operativa.</h2>
            <p className="sec-sub" style={{ marginBottom: 28 }}>
              No todo el tiempo trabajado genera avance. Parte de la semana solo
              mantiene el sistema respirando.
            </p>

            <div className="chart-card">
              <div className="chart-title">La semana que no ves</div>
              <div className="chart-note">
                Cómo se reparten, de media, las 40 horas semanales por persona.
              </div>
              <div className="week-bar">
                {visibleSegs.map((s) => (
                  <div
                    key={s.k}
                    className="week-seg"
                    style={{ width: `${(s.h / visTotal) * 100}%`, background: s.c }}
                  />
                ))}
              </div>
              <div className="week-axis" aria-hidden>
                {weekTicks.map((t) => (
                  <span
                    key={t}
                    className="week-tick"
                    style={{ left: `${(t / visTotal) * 100}%` }}
                  >
                    <i />
                    {num(t)}
                  </span>
                ))}
              </div>
              <div className="week-total">
                Total visible <b>{num(visTotal, 1)} h</b> de {SEMANA_H} h
                semanales.
              </div>
              <div className="week-legend">
                {segs.map((s) => {
                  const off = hiddenSeg.has(s.k);
                  return (
                    <span
                      key={s.k}
                      className={"wl mm-click" + (off ? " off" : "")}
                      role="button"
                      tabIndex={0}
                      onClick={() => toggleSeg(s.k)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          toggleSeg(s.k);
                        }
                      }}
                    >
                      <span className="sw" style={{ background: s.c }} />
                      {s.k} <b>{num(s.h, 1)} h</b>
                    </span>
                  );
                })}
              </div>
              <p className="chart-quote">
                “No todo el tiempo trabajado genera avance. Parte de la semana
                solo mantiene el sistema respirando.”
              </p>
            </div>

            <div className="chart-card">
              <div className="chart-title">La hemorragia anual</div>
              <div className="chart-note">
                Coste operativo invisible acumulado mes a mes.
              </div>
              <div className="hem-wrap">
                <div className="hem-yaxis">
                  {hemTicks
                    .slice()
                    .reverse()
                    .map((t) => (
                      <span key={t}>{eurAxis(t)}</span>
                    ))}
                </div>
                <div className="hem-main">
                  <div className="hem-plot">
                    {hemTicks.map((t) => (
                      <div
                        key={t}
                        className="hem-gridline"
                        style={{ bottom: `${(t / hemYMax) * 100}%` }}
                      />
                    ))}
                    <div className="hem">
                      {hemVals.map((x, i) => (
                        <div
                          key={i}
                          className="hcol"
                          style={{ height: `${(x / hemYMax) * 100}%` }}
                        >
                          <span className="hem-tip">
                            {MESES[i]} · {eur(x)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="hem-x">
                    {MESES.map((m) => (
                      <span key={m}>{m}</span>
                    ))}
                  </div>
                </div>
              </div>
              <p className="chart-quote">
                “La pérdida diaria parece pequeña. La pérdida anual cambia la
                empresa.” —{" "}
                <span style={{ color: "var(--danger)", fontStyle: "normal", fontWeight: 700 }}>
                  {eur(r.costeAnual)}
                </span>{" "}
                al año.
              </p>
            </div>

            <div className="chart-card">
              <div className="chart-title">Antes y después de ordenar el sistema</div>
              <div className="chart-note">
                Horas perdidas al mes que quedarían en cada escenario.
              </div>
              <div className="vbars">
                {baCols.map((c, i) => (
                  <div key={i} className="vcol">
                    <div
                      className="vbar"
                      style={{ height: `${Math.max(3, (c.h / baMax) * 100)}%`, background: c.c }}
                    >
                      <span className="cap">{num(c.h)} h</span>
                    </div>
                    <div className="vlab">{c.lab}</div>
                  </div>
                ))}
              </div>
              <p className="chart-quote">
                “Automatizar no sustituye criterio. Libera criterio.”
              </p>
            </div>
          </div>
        </section>

        {/* DIAGNÓSTICO */}
        <section className="block">
          <div className="shell">
            <p className="sec-eyebrow">Qué significa para tu empresa</p>
            <h2 className="sec">Tu diagnóstico.</h2>
            <div className="diag">
              <span
                className="level"
                style={{
                  background: `color-mix(in srgb, ${diag.color} 16%, transparent)`,
                  color: diag.color,
                }}
              >
                <span className="dot" style={{ background: diag.color }} />
                {diag.level}
              </span>
              <div dangerouslySetInnerHTML={{ __html: diagHtml }} />
              <div className="emo">
                <div className="emo-card">
                  <div className="emo-num">{num(r.personasEquivalentes, 1)}</div>
                  <div className="emo-lab">
                    personas a jornada completa dedicadas solo a buscar, repetir y
                    coordinar.
                  </div>
                </div>
                <div className="emo-card">
                  <div className="emo-num">{num(r.diasRecuperablesMes)}</div>
                  <div className="emo-lab">
                    días-equipo recuperables cada mes si ordenas información y
                    automatizas.
                  </div>
                </div>
                <div className="emo-card">
                  <div className="emo-num">{eur(r.ahorroAnual)}</div>
                  <div className="emo-lab">
                    recuperables al año en tiempo que hoy ya estás pagando.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CIERRE */}
        <section className="close">
          <div className="shell">
            <h2>
              Tu empresa no necesita más horas. Necesita que dejen de{" "}
              <em>morir</em> en el caos operativo.
            </h2>
            <p>
              La productividad no empieza trabajando más. Empieza diseñando dónde
              vive la información y cómo se mueve el trabajo.
            </p>
          </div>
        </section>
      </div>
    </>
  );
}
