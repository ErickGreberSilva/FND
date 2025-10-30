"use client";

import React, { useEffect, useRef, useState } from "react";

/** =========================
 *  Utilidades geométricas
 *  ========================= */
type Vec2 = { x: number; y: number };

const deg2rad = (d: number) => (d * Math.PI) / 180;
const rad2deg = (r: number) => (r * 180) / Math.PI;

/** Casco convexo (monotone chain) */
function convexHull(points: Vec2[]): Vec2[] {
  if (points.length <= 3) return points.slice();
  const pts = points.slice().sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x));
  const cross = (o: Vec2, a: Vec2, b: Vec2) =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower: Vec2[] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0)
      lower.pop();
    lower.push(p);
  }
  const upper: Vec2[] = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0)
      upper.pop();
    upper.push(p);
  }
  upper.pop();
  lower.pop();
  return lower.concat(upper);
}

/** =========================
 *  Sol: posição solar (simplificada e estável)
 *  ========================= */
function solarPosition(date: Date, latDeg: number, lonDeg: number) {
  const rad = Math.PI / 180;
  const dUTC = date.getTime() / 86400000 + 2440587.5;
  const n = dUTC - 2451545.0;

  const L = (280.46 + 0.9856474 * n) % 360;
  const g = (357.528 + 0.9856003 * n) % 360;
  const lam = L + 1.915 * Math.sin(g * rad) + 0.02 * Math.sin(2 * g * rad);
  const eps = 23.439 - 0.0000004 * n;

  const lamr = lam * rad, epsr = eps * rad;
  const alpha = Math.atan2(Math.cos(epsr) * Math.sin(lamr), Math.cos(lamr));
  const delta = Math.asin(Math.sin(epsr) * Math.sin(lamr));

  const GMST = (280.46061837 + 360.98564736629 * n) % 360;
  const LMST = ((GMST + lonDeg) % 360) * rad;
  const H = LMST - alpha;

  const lat = latDeg * rad;
  const sinAlt = Math.sin(lat) * Math.sin(delta) + Math.cos(lat) * Math.cos(delta) * Math.cos(H);
  const alt = Math.asin(sinAlt);

  const cosAz = (Math.sin(delta) - Math.sin(lat) * sinAlt) / (Math.cos(lat) * Math.cos(alt));
  let az = Math.acos(Math.min(1, Math.max(-1, cosAz)));
  if (Math.sin(H) > 0) az = 2 * Math.PI - az;

  return { azimuthDeg: rad2deg(az), altitudeDeg: rad2deg(alt) };
}

/** =========================
 *  Componente Canvas — Curitiba
 *  ========================= */
export default function SunpathCuritiba() {
  // Curitiba
  const LAT = -25.4284;
  const LON = -49.2733;

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Estado base (mantido do seu modelo)
  const [date, setDate] = useState<Date>(() => new Date(new Date().getFullYear(), 0, 1, 12, 0, 0));
  const [playing, setPlaying] = useState(false);
  const [rotationDeg, setRotationDeg] = useState(0); // rotação do plano/compasso (edifício continua alinhado)
  const [scale, setScale] = useState(6); // px por metro

  // Novos estados: dimensões + controle de hora por slider (5 em 5 min)
  const [width, setWidth] = useState(20);    // Largura (m)
  const [depth, setDepth] = useState(14);    // Comprimento (m)
  const [height, setHeight] = useState(12);  // Altura (m)
  const [timeMinutes, setTimeMinutes] = useState(12 * 60); // minutos desde 00:00

  // Info HUD inferior (azimute/altitude)
  const [azAlt, setAzAlt] = useState({ azimuthDeg: 0, altitudeDeg: 0 });

  /** ========= Animação anual (mantido) ========= */
  useEffect(() => {
    let raf = 0;
    let t = 0;
    const startYear = new Date(date);
    startYear.setMonth(0, 1);
    startYear.setHours(12, 0, 0, 0);

    const endYear = new Date(date);
    endYear.setMonth(11, 31);
    endYear.setHours(12, 0, 0, 0);

    const totalMs = endYear.getTime() - startYear.getTime();

    const step = () => {
      if (!playing) return;
      t += 0.002;
      if (t > 1) t = 0;
      const current = new Date(startYear.getTime() + t * totalMs);

      // Mantemos o horário atual do slider ao animar a data
      current.setHours(Math.floor(timeMinutes / 60), timeMinutes % 60, 0, 0);

      setDate(current);
      raf = requestAnimationFrame(step);
    };

    if (playing) raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  /** ========= Desenho ========= */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.clientWidth;
    const H = canvas.clientHeight;
    canvas.width = W;
    canvas.height = H;

    // Centro da tela
    const CX = W / 2;
    const CY = H / 2;

    // Limpa e fundo
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#dfdfdf";
    ctx.fillRect(0, 0, W, H);

    // Grade leve (como no original)
    const grid = 10 * scale;
    ctx.strokeStyle = "rgba(0,0,0,0.2)";
    ctx.lineWidth = 1;
    for (let x = CX % grid; x < W; x += grid) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = CY % grid; y < H; y += grid) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    // Data/hora atual aplicando o slider (5 em 5 min)
    const current = new Date(date);
    current.setHours(Math.floor(timeMinutes / 60), timeMinutes % 60, 0, 0);

    const { azimuthDeg, altitudeDeg } = solarPosition(current, LAT, LON);
    setAzAlt({ azimuthDeg, altitudeDeg });

    // Bússola (gira com o "plano")
    const compassR = 150;
    const rot = deg2rad(rotationDeg);
    ctx.beginPath();
    ctx.arc(CX, CY, compassR, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(255, 117, 74 ,0.6)";
    ctx.lineWidth = 5;
    ctx.stroke();

    const marks = [
      { label: "N", angDeg: 0 },
      { label: "E", angDeg: 90 },
      { label: "S", angDeg: 180 },
      { label: "W", angDeg: 270 },
    ];
    ctx.fillStyle = "#000";
    ctx.font = "bold 12px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    marks.forEach((m) => {
      const a = deg2rad(m.angDeg) + rot; // gira com o plano
      const x = CX + Math.sin(a) * (compassR + 14);
      const y = CY - Math.cos(a) * (compassR + 14);
      ctx.fillText(m.label, x, y);

      // tracinho
      const x1 = CX + Math.sin(a) * compassR;
      const y1 = CY - Math.cos(a) * compassR;
      const x2 = CX + Math.sin(a) * (compassR - 8);
      const y2 = CY - Math.cos(a) * (compassR - 8);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.strokeStyle = "rgba(255,255,255,0.4)";
      ctx.stroke();
    });

    // Edifício (retângulo alinhado ao eixo, como no seu modelo)
    const halfW = width / 2;
    const halfD = depth / 2;
    const base: Vec2[] = [
      { x: -halfW, y: -halfD },
      { x:  halfW, y: -halfD },
      { x:  halfW, y:  halfD },
      { x: -halfW, y:  halfD },
    ];

    // Vetor solar horizontal no plano do solo (N=0° → y+, sentido horário)
    const az = deg2rad(azimuthDeg);
    const alt = deg2rad(altitudeDeg);
    const sx = Math.sin(az); // leste +
    const sy = Math.cos(az); // norte +
    // Aplica rotação do plano/câmera (giramos tudo no chão)
    const rx = sx * Math.cos(rot) + sy * Math.sin(rot);
    const ry = -sx * Math.sin(rot) + sy * Math.cos(rot);

    const aboveHorizon = altitudeDeg > 0.5;

    // Sombra = casco convexo (base + base deslocada pelo topo projetado)
    let shadowPoly: Vec2[] = [];
    if (aboveHorizon) {
      const tanAlt = Math.tan(alt);
      const Lp = height / tanAlt; // comprimento da projeção
      const offset = { x: -rx * Lp, y: -ry * Lp }; // oposta ao sol
      const topProjected = base.map((b) => ({ x: b.x + offset.x, y: b.y + offset.y }));
      shadowPoly = convexHull(base.concat(topProjected));
    }

    // Mundo → tela
    const toScreen = (p: Vec2): Vec2 => ({
      x: CX + p.x * scale,
      y: CY - p.y * scale, // y para cima no plano
    });

    // Desenha sombra
    if (aboveHorizon && shadowPoly.length >= 3) {
      const sp = shadowPoly.map(toScreen);
      ctx.beginPath();
      ctx.moveTo(sp[0].x, sp[0].y);
      for (let i = 1; i < sp.length; i++) ctx.lineTo(sp[i].x, sp[i].y);
      ctx.closePath();
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,0.5)";
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // Desenha base do prédio (cheio, não wireframe) — mesmas cores do seu modelo
    const bp = base.map(toScreen);
    ctx.beginPath();
    ctx.moveTo(bp[0].x, bp[0].y);
    for (let i = 1; i < bp.length; i++) ctx.lineTo(bp[i].x, bp[i].y);
    ctx.closePath();
    ctx.fillStyle = "#ffce76";
    ctx.fill();
    ctx.strokeStyle = "#0a516d";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Indicador do sol no aro da bússola
    const sunR = compassR + 32;
    const sxp = CX + Math.sin(az + rot) * sunR;
    const syp = CY - Math.cos(az + rot) * sunR;
    ctx.beginPath();
    ctx.arc(sxp, syp, 6, 0, Math.PI * 2);
    ctx.fillStyle = aboveHorizon ? "#ff754a" : "rgba(255,255,255,0.3)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.7)";
    ctx.stroke();

    // HUD superior (mantido)
    ctx.fillStyle = "#fff";
    ctx.font = "12px system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    const localISO = new Date(current.getTime() - current.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16)
      .replace("T", " ");
    ctx.fillText(`${localISO}`, 12, 12);
    ctx.fillText(`Az: ${azimuthDeg.toFixed(1)}°  Alt: ${altitudeDeg.toFixed(1)}°`, 12, 30);
  }, [date, timeMinutes, rotationDeg, width, depth, height, scale]);

  /** ========= Handlers ========= */

  // Slider de horário — 0..1440, step 5
  const handleTimeSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    const minutes = parseInt(e.target.value, 10);
    setTimeMinutes(minutes);
  };

  // DateTime local — mantém minutos do slider
  const handleDateTimeLocal = (e: React.ChangeEvent<HTMLInputElement>) => {
    const d = new Date(e.target.value);
    if (isNaN(d.getTime())) return;
    // aplica hora/min do slider
    d.setHours(Math.floor(timeMinutes / 60), timeMinutes % 60, 0, 0);
    setDate(d);
  };

  // Botões de datas (mantidos): setam data e fixam horário às 12:00
  const setDateAtLocalNoon = (monthIndex: number, day: number) => {
    const base = new Date(date);
    base.setMonth(monthIndex, day);
    base.setHours(12, 0, 0, 0);
    setDate(base);
    setTimeMinutes(12 * 60); // meio-dia no slider
  };

  // Valor do input datetime-local (ISO local)
  const dateTimeLocalValue = (() => {
    const d = new Date(date);
    d.setHours(Math.floor(timeMinutes / 60), timeMinutes % 60, 0, 0);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  })();

  const hourStr = String(Math.floor(timeMinutes / 60)).padStart(2, "0");
  const minStr = String(timeMinutes % 60).padStart(2, "0");

  return (
    <div className="w-full">
      <div className="relative w-full h-[520px] rounded-md border overflow-hidden bg-black">
        <canvas ref={canvasRef} className="w-full h-full block" />

        {/* Painel de controle — CLASSES MANTIDAS */}
        <div className="absolute top-3 left-3 bg-sidebar-accent backdrop-primary-md p-3 rounded-md shadow-md z-[5] space-y-3">

          {/* Linha de botões (mantidos) */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPlaying((p) => !p)}
              className="px-3 py-1 rounded text-sm font-medium bg-primary text-white"
            >
              {playing ? "Pausar" : "Play"}
            </button>
            <button
              onClick={() => setDateAtLocalNoon(5, 21)} // Junho ~ Solstício de Inverno (hemisfério sul)
              className="px-3 py-1 rounded text-sm bg-card hover:bg-primary text-foreground hover:text-white"
              title="Solstício de Junho (aprox.)"
            >
              Solst. Inverno
            </button>
            <button
              onClick={() => setDateAtLocalNoon(11, 21)} // Dezembro ~ Solstício de Verão
              className="px-3 py-1 rounded text-sm bg-card hover:bg-primary text-foreground hover:text-white"
              title="Solstício de Dezembro (aprox.)"
            >
              Solst. Verão
            </button>
            <button
              onClick={() => setDateAtLocalNoon(8, 23)} // Setembro ~ Equinócio
              className="px-3 py-1 rounded text-sm bg-card hover:bg-primary text-foreground hover:text-white"
              title="Equinócio (aprox.)"
            >
              Equinócio
            </button>
          </div>

          {/* Rotação — slider (mantido) + input numérico (ADICIONADO) */}
          <div className="flex items-center gap-2">
            <label className="text-sm">Rotação</label>
            <input
              type="range"
              min={-180}
              max={180}
              value={rotationDeg}
              onChange={(e) => setRotationDeg(parseInt(e.target.value, 10))}
            />
            {/* Entrada numérica adicional sem alterar a estética geral */}
            <input
              type="number"
              className="border rounded px-2 py-1 text-sm bg-card w-15"
              value={rotationDeg}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (!Number.isNaN(v)) setRotationDeg(Math.max(-180, Math.min(180, v)));
              }}
            />
          </div>

          {/* Escala (mantido) */}
          <div className="flex items-center gap-2">
            <label className="text-sm">Escala</label>
            <input
              type="range"
              min={2}
              max={12}
              value={scale}
              onChange={(e) => setScale(parseInt(e.target.value, 10))}
            />
            <span className="text-sm w-10 text-right">{scale}x</span>
          </div>

          {/* Data/hora (mantido) + Slider de horário 5 em 5 minutos (ADICIONADO) */}
          <div className="flex items-center gap-2">
            <input
              type="datetime-local"
              value={dateTimeLocalValue}
              onChange={handleDateTimeLocal}
              className="border rounded px-2 py-1 text-sm bg-card"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm">Hora</label>
            <input
              type="range"
              min={0}
              max={1440}
              step={5}
              value={timeMinutes}
              onChange={handleTimeSlider}
              className="w-48"
            />
            <span className="text-sm w-14 text-right">
              {hourStr}:{minStr}
            </span>
          </div>

          {/* Dimensões do edifício (ADICIONADO) */}
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-sm">L(m)</label>
            <input
              type="number"
              className="border rounded px-2 py-1 text-sm bg-card w-15"
              value={width}
              onChange={(e) => setWidth(Math.max(0, Number(e.target.value)))}
            />
            <label className="text-sm">C(m)</label>
            <input
              type="number"
              className="border rounded px-2 py-1 text-sm bg-card w-15"
              value={depth}
              onChange={(e) => setDepth(Math.max(0, Number(e.target.value)))}
            />
            <label className="text-sm">H(m)</label>
            <input
              type="number"
              className="border rounded px-2 py-1 text-sm bg-card w-15"
              value={height}
              onChange={(e) => setHeight(Math.max(0, Number(e.target.value)))}
            />
          </div>
        </div>

        {/* Informações (azimute/altitude) — canto inferior esquerdo (ADICIONADO) */}
        <div className="absolute bottom-3 left-3 bg-black/50 text-white px-3 py-2 rounded-md text-xs">
          🌞 Az: {azAlt.azimuthDeg.toFixed(1)}° | ⛰️ Alt: {azAlt.altitudeDeg.toFixed(1)}°
        </div>
      </div>

      <p className="mt-2 text-xs opacity-80">
        Curitiba: lat {-25.4284.toFixed(4)}°, lon {-49.2733.toFixed(4)}°. Visual 2D esquemático — rápido como o do site.
      </p>
    </div>
  );
}
