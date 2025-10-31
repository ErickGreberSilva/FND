"use client";

import React, { useEffect, useRef, useState } from "react";

/** --------------------------
 * Utilidades
 * -------------------------- */
const deg2rad = (d: number) => (d * Math.PI) / 180;
const rad2deg = (r: number) => (r * 180) / Math.PI;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/** Posição solar (aprox. NOAA/Grena – bom p/ visualização). 
 * Retorna azimute (0°=N, horário) e altitude (°).
 * Obs: usa Date em hora local; tz embutido no Date do navegador. */
function solarPosition(dateLocal: Date, latDeg: number, lonDeg: number) {
  // Converter hora local -> UTC ms
  const msUTC = dateLocal.getTime();

  // Dias Julianos
  const JD = msUTC / 86400000 + 2440587.5;
  const n = JD - 2451545.0;

  // Elementos solares
  const L = (280.46 + 0.9856474 * n) % 360; // lon média
  const g = (357.528 + 0.9856003 * n) % 360; // anomalia média
  const lam = L + 1.915 * Math.sin(deg2rad(g)) + 0.02 * Math.sin(deg2rad(2 * g));
  const eps = 23.439 - 0.0000004 * n;

  const lamr = deg2rad(lam);
  const epsr = deg2rad(eps);

  // RA e Dec
  const alpha = Math.atan2(Math.cos(epsr) * Math.sin(lamr), Math.cos(lamr)); // rad
  const delta = Math.asin(Math.sin(epsr) * Math.sin(lamr)); // rad

  // Ângulo horário H
  // GMST ~
  const GMST = (280.46061837 + 360.98564736629 * n) % 360;
  const LMST = deg2rad((GMST + lonDeg) % 360);
  const H = LMST - alpha;

  // Alt/Az
  const lat = deg2rad(latDeg);
  const sinAlt = Math.sin(lat) * Math.sin(delta) + Math.cos(lat) * Math.cos(delta) * Math.cos(H);
  const alt = Math.asin(clamp(sinAlt, -1, 1));
  const cosAz = (Math.sin(delta) - Math.sin(lat) * sinAlt) / (Math.cos(lat) * Math.cos(alt));
  let az = Math.acos(clamp(cosAz, -1, 1));
  if (Math.sin(H) > 0) az = 2 * Math.PI - az;

  return { azimuthDeg: rad2deg(az), altitudeDeg: rad2deg(alt) };
}

/** Projeção polar “cúpula”: r = k * (90° - altitude), θ = azimute (0°=N, horário). */
function projectPolar(
  azimuthDeg: number,
  altitudeDeg: number,
  cx: number,
  cy: number,
  R: number
) {
  const altClamped = clamp(altitudeDeg, -5, 90); // evita estouros
  const r = ((90 - altClamped) / 90) * R;
  const th = deg2rad(azimuthDeg);
  const x = cx + r * Math.sin(th);
  const y = cy - r * Math.cos(th);
  return { x, y };
}

/** Gera horas locais inteiras (0..23) para um Date base. */
function hoursOfDay(base: Date) {
  const out: Date[] = [];
  const d0 = new Date(base);
  d0.setHours(0, 0, 0, 0);
  for (let h = 0; h < 24; h++) {
    const d = new Date(d0);
    d.setHours(h, 0, 0, 0);
    out.push(d);
  }
  return out;
}

/** --------------------------
 * Componente
 * -------------------------- */
export default function Sunpath2DCuritiba() {
  // Curitiba
  const LAT = -25.4284;
  const LON = -49.2733;

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [now, setNow] = useState<Date>(new Date());

  // Redesenha a cada “tick” de minuto para atualizar o ponto atual (opcional)
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Ajuste tamanho
    const W = canvas.clientWidth;
    const H = canvas.clientHeight;
    canvas.width = W;
    canvas.height = H;

    // Centro e raio útil
    const CX = W / 2;
    const CY = H / 2;
    const R = Math.min(W, H) * 0.45;

    // Fundo branco (como no app 2D)
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, W, H);

    // Título simples
    ctx.fillStyle = "#333";
    ctx.font = "13px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText("Sun-Path (Curitiba, BR)", CX, 8);

    // Círculo da cúpula (horizonte)
    ctx.beginPath();
    ctx.arc(CX, CY, R, 0, Math.PI * 2);
    ctx.strokeStyle = "#ccc";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Grade: círculos de altitude (cada 10°) e raios de azimute (cada 15°)
    ctx.strokeStyle = "#e5e5e5";
    ctx.lineWidth = 1;
    for (let alt = 10; alt <= 80; alt += 10) {
      const r = ((90 - alt) / 90) * R;
      ctx.beginPath();
      ctx.arc(CX, CY, r, 0, Math.PI * 2);
      ctx.stroke();

      // label de altitude
      ctx.fillStyle = "#666";
      ctx.font = "10px system-ui, sans-serif";
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(`${alt}°`, CX + r + 4, CY);
    }

    ctx.strokeStyle = "#eee";
    for (let az = 0; az < 360; az += 15) {
      const th = deg2rad(az);
      const x1 = CX + R * Math.sin(th);
      const y1 = CY - R * Math.cos(th);
      ctx.beginPath();
      ctx.moveTo(CX, CY);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    }

    // Marcas N/E/S/W
    const card = [
      { lab: "N", az: 0 },
      { lab: "E", az: 90 },
      { lab: "S", az: 180 },
      { lab: "W", az: 270 },
    ];
    ctx.fillStyle = "#111";
    ctx.font = "bold 12px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (const c of card) {
      const p = projectPolar(c.az, 0, CX, CY, R + 14);
      ctx.fillText(c.lab, p.x, p.y);
    }

    // Linhas de hora (curvas ao longo do ano, hora fixa)
    // Para cada hora local, plota pontos ao longo dos meses (dia 21) de 5 em 5 min? — simplificar: 30 min
    ctx.strokeStyle = "rgba(0,0,0,0.15)";
    ctx.lineWidth = 1;
    for (let h = 0; h < 24; h++) {
      const pts: { x: number; y: number }[] = [];
      for (let mIdx = 0; mIdx < 12; mIdx++) {
        const d = new Date(now);
        d.setMonth(mIdx, 21);
        d.setHours(h, 0, 0, 0);
        // Pega 3 amostras por hora para suavizar
        for (const mm of [0, 20, 40]) {
          d.setMinutes(mm);
          const { azimuthDeg, altitudeDeg } = solarPosition(d, LAT, LON);
          if (altitudeDeg > 0) {
            pts.push(projectPolar(azimuthDeg, altitudeDeg, CX, CY, R));
          }
        }
      }
      if (pts.length > 1) {
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.stroke();
      }
    }

    // Caminhos do Sol para o dia 21 de cada mês (curvas “diárias”)
    // De 4h a 20h de 10 em 10 minutos (mais suave).
    const monthColors = [
      "#c0392b", // Jan
      "#d35400",
      "#f39c12",
      "#27ae60",
      "#16a085",
      "#2980b9",
      "#8e44ad",
      "#2c3e50",
      "#7f8c8d",
      "#34495e",
      "#9b59b6",
      "#e67e22", // Dez
    ];
    for (let mIdx = 0; mIdx < 12; mIdx++) {
      const d = new Date(now);
      d.setMonth(mIdx, 21);
      d.setHours(4, 0, 0, 0);

      const pathPts: { x: number; y: number }[] = [];
      for (let t = 4 * 60; t <= 20 * 60; t += 10) {
        d.setHours(0, 0, 0, 0);
        d.setMinutes(t);
        const { azimuthDeg, altitudeDeg } = solarPosition(d, LAT, LON);
        if (altitudeDeg > 0) {
          pathPts.push(projectPolar(azimuthDeg, altitudeDeg, CX, CY, R));
        }
      }
      if (pathPts.length > 1) {
        ctx.strokeStyle = monthColors[mIdx % monthColors.length];
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(pathPts[0].x, pathPts[0].y);
        for (let i = 1; i < pathPts.length; i++) ctx.lineTo(pathPts[i].x, pathPts[i].y);
        ctx.stroke();
      }
    }

    // Posição atual do Sol (marcador)
    const { azimuthDeg, altitudeDeg } = solarPosition(now, LAT, LON);
    if (altitudeDeg > 0) {
      const p = projectPolar(azimuthDeg, altitudeDeg, CX, CY, R);
      ctx.beginPath();
      ctx.arc(p.x, p.y, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = "#ff754a";
      ctx.fill();
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = "white";
      ctx.stroke();
    }

    // Anotações
    ctx.fillStyle = "#333";
    ctx.font = "11px system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    const nowStr = now.toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
    ctx.fillText(`Agora: ${nowStr}`, 14, H - 16);
  }, [now]);

  return (
    <div className="w-full">
      <div className="relative w-full h-[560px] rounded-md border overflow-hidden bg-white">
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>
      <p className="mt-2 text-xs opacity-80">
        Diagrama solar 2D – Curitiba (lat {LAT.toFixed(4)}°, lon {LON.toFixed(4)}°). Linhas de hora (cinza), caminhos do dia 21 de cada mês (coloridos) e posição atual (círculo laranja).
      </p>
    </div>
  );
}
