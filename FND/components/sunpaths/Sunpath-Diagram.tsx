"use client";

import { JSX, useMemo, useRef, useState } from "react";
import useSunCalc from "@/hooks/useSunCalc";

type ProjectionType = "spherical" | "stereographic" | "equidistant";


const DEFAULT_LAT = -25.4284;
const DEFAULT_LON = -49.2733;
const RAD = Math.PI / 180;
const DEG = 180 / Math.PI;
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const mod = (a: number, n: number) => ((a % n) + n) % n;

// ------------------ Astronomia ------------------
function solarBasics(n: number) {
  const B = (2 * Math.PI * (n - 1)) / 365;
  const E =
    229.18 *
    (0.000075 +
      0.001868 * Math.cos(B) -
      0.032077 * Math.sin(B) -
      0.014615 * Math.cos(2 * B) -
      0.040849 * Math.sin(2 * B));
  const dec =
    0.006918 -
    0.399912 * Math.cos(B) +
    0.070257 * Math.sin(B) -
    0.006758 * Math.cos(2 * B) +
    0.000907 * Math.sin(2 * B) -
    0.002697 * Math.cos(3 * B) +
    0.00148 * Math.sin(3 * B);
  return { E, dec };
}

function localSolarTime(clockH: number, lon: number, tzMin: number, E: number) {
  const Lst = 15 * (tzMin / 60);
  const TC = E + 4 * (lon - Lst);
  return clockH + TC / 60;
}

function hourAngle(LST: number) {
  return 15 * (LST - 12);
}

function solarAltAz(lat: number, dec: number, Hdeg: number) {
  const φ = lat * RAD;
  const H = Hdeg * RAD;
  const sinφ = Math.sin(φ);
  const cosφ = Math.cos(φ);
  const sinδ = Math.sin(dec);
  const cosδ = Math.cos(dec);
  const sin_h = sinφ * sinδ + cosφ * cosδ * Math.cos(H);
  const alt = Math.asin(clamp(sin_h, -1, 1));
  const A = Math.atan2(Math.sin(H), Math.cos(H) * sinφ - Math.tan(dec) * cosφ);
  const az = mod(A * DEG + 180, 360);
  return { altDeg: alt * DEG, azDeg: az };
}

// ------------------ Projeções ------------------
function rSpherical(a: number) {
  const z = 90 - a;
  return clamp(Math.sin(z * RAD), 0, 1);
}
function rStereographic(a: number) {
  const z = 90 - a;
  return clamp(Math.tan((z * RAD) / 2), 0, 1);
}
function rEquidistant(a: number) {
  const z = 90 - a;
  return clamp(z / 90, 0, 1);
}
function rByProjection(a: number, p: ProjectionType) {
  if (p === "spherical") return rSpherical(a);
  if (p === "stereographic") return rStereographic(a);
  return rEquidistant(a);
}
function project(alt: number, az: number, p: ProjectionType) {
  const r = rByProjection(alt, p);
  const azr = az * RAD;
  return { x: r * Math.sin(azr), y: -r * Math.cos(azr) };
}
function projectBlend(alt: number, az: number, from: ProjectionType, to: ProjectionType, t: number) {
  const r = lerp(rByProjection(alt, from), rByProjection(alt, to), t);
  const azr = az * RAD;
  return { x: r * Math.sin(azr), y: -r * Math.cos(azr) };
}

// ------------------ Curvas ------------------
function buildAnalemma(hour: number, lat: number, lon: number, tz: number) {
  const pts: { alt: number; az: number }[] = [];
  for (let n = 1; n <= 365; n++) {
    const { E, dec } = solarBasics(n);
    const LST = localSolarTime(hour, lon, tz, E);
    const H = hourAngle(LST);
    const { altDeg, azDeg } = solarAltAz(lat, dec, H);
    if (altDeg > -5) pts.push({ alt: altDeg, az: azDeg });
  }
  return pts;
}

function buildDailyPath(day: number, lat: number, lon: number, tz: number) {
  const { E, dec } = solarBasics(day);
  const pts: { alt: number; az: number; hour: number }[] = [];
  for (let h = 7; h <= 18; h++) {
    const LST = localSolarTime(h, lon, tz, E);
    const H = hourAngle(LST);
    const { altDeg, azDeg } = solarAltAz(lat, dec, H);
    if (altDeg > -5) pts.push({ alt: altDeg, az: azDeg, hour: h });
  }
  return pts;
}

// ------------------ UI ------------------
export default function Diagram2D() {
  const [lat, setLat] = useState(DEFAULT_LAT);
  const [lon, setLon] = useState(DEFAULT_LON);
  const [tz, setTz] = useState(-180);
  const [projection, setProjection] = useState<ProjectionType>("spherical");
  const [blendFrom, setBlendFrom] = useState<ProjectionType>("spherical");
  const [blendT, setBlendT] = useState(1);
  const [day, setDay] = useState(300);
  const [hour, setHour] = useState(12);
  const date = useMemo(() => {
    const d = new Date(2025, 0, 1);
    d.setDate(day);
    d.setHours(Math.floor(hour));
    d.setMinutes((hour % 1) * 60);
    return d;
  }, [day, hour]);

  const { altitude, azimuth, declination, sunrise, sunset, dayLength, isDaylight } =
    useSunCalc(date, -25.4284, -49.2733) || {};

  const raf = useRef<number | null>(null);
  const animateTo = (next: ProjectionType) => {
    if (next === projection) return;
    if (raf.current) cancelAnimationFrame(raf.current);
    setBlendFrom(projection);
    setProjection(next);
    const start = performance.now();
    const dur = 600;
    const tick = (n: number) => {
      const t = clamp((n - start) / dur, 0, 1);
      setBlendT(t);
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  };

  const hours = Array.from({ length: 13 }, (_, i) => i + 6);
  const analemmas = useMemo(() => hours.map((h) => buildAnalemma(h, lat, lon, tz)), [lat, lon, tz]);
  const dailyPath = useMemo(() => buildDailyPath(day, lat, lon, tz), [day, lat, lon, tz]);

  const instant = useMemo(() => {
    const { E, dec } = solarBasics(day);
    const LST = localSolarTime(hour, lon, tz, E);
    const H = hourAngle(LST);
    return solarAltAz(lat, dec, H);
  }, [day, hour, lat, lon, tz]);

  const size = 680;
  const pad = 48;
  const R = (size - 2 * pad) / 2;
  const cx = size / 2;
  const cy = size / 2;

  const toXY = (a: number, z: number) => {
    const p = projectBlend(a, z, blendFrom, projection, blendT);
    return [cx + p.x * R, cy + p.y * R];
  };
  const pathD = (arr: { alt: number; az: number }[]) => "M" + arr.map((p) => toXY(p.alt, p.az).join(",")).join("L");

  const sun = toXY(instant.altDeg, instant.azDeg);
  const horizonPoint = toXY(0, instant.azDeg);
  const sunRadius = Math.sqrt((sun[0] - cx) ** 2 + (sun[1] - cy) ** 2);

  const altLabels = Array.from({ length: 8 }, (_, i) => 80 - i * 10);
  const azimuthRadials = Array.from({ length: 36 }, (_, i) => i * 10);
  const azimuthLabels = Array.from({ length: 24 }, (_, i) => -165 + i * 15);
  const wrapperClass =
    "relative w-full  rounded-md border overflow-hidden ";
  // --- Helpers para polígono de sombra (casco convexo, monotone chain) ---
  function cross(o: number[], a: number[], b: number[]) {
    return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  }
  function convexHull(points: number[][]) {
    if (points.length <= 3) return points.slice();
    const pts = points
      .slice()
      .sort((p, q) => (p[0] === q[0] ? p[1] - q[1] : p[0] - q[0]));
    const lower: number[][] = [];
    for (const p of pts) {
      while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
        lower.pop();
      }
      lower.push(p);
    }
    const upper: number[][] = [];
    for (let i = pts.length - 1; i >= 0; i--) {
      const p = pts[i];
      while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
        upper.pop();
      }
      upper.push(p);
    }
    upper.pop();
    lower.pop();
    return lower.concat(upper);
  }
  // dimensões da edificação (m)
  const [buildingWidth, setBuildingWidth] = useState(10);   // metros
  const [buildingLength, setBuildingLength] = useState(10); // metros
  const [buildingHeight, setBuildingHeight] = useState(20); // metros
  return (
    <div className={wrapperClass}>
      <div style={{ padding: 24, fontFamily: "Inter, system-ui, sans-serif" }}>
        <h1>☀️ Diagrama de estudo de Insolação</h1>

        <div style={{ display: "grid", gridTemplateColumns: "680px 380px", gap: 16 }}>
          {/* SVG  ******************************************************************************************/}
          <div>
            <svg width={size} height={size}>
              {/* Horizonte ******************************************************************************************/}

              <circle cx={cx} cy={cy} r={R} className="fill-none stroke-accent-foreground stroke-[1.5]" />

              {/* Círculos concêntricos *****************************************************************************/}
              {altLabels.map((a) => {
                const r = rByProjection(a, projection) * R;
                return <circle key={a} cx={cx} cy={cy} r={r}
                  className=" stroke-muted " fill="none" />;
              })}

              {/* Linhas radiais (ajustadas: de 80° até horizonte) */}
              {azimuthRadials.map((az) => {
                const rInner = rByProjection(80, projection) * R; // círculo interno (80°)
                const pInner = projectBlend(80, az, projection, projection, 1);
                const pOuter = projectBlend(0, az, projection, projection, 1);
                return (
                  <line
                    key={az}
                    x1={cx + pInner.x * R}
                    y1={cy + pInner.y * R}
                    x2={cx + pOuter.x * R}
                    y2={cy + pOuter.y * R}
                    className=" stroke-[#aaa] opacity-20"
                  />
                );
              })}

              {/* Eixo vertical */}
              <line x1={cx} y1={cy - R} x2={cx} y2={cy + R} className="stroke-accent-foreground stroke-solid stroke-[0.2]" />

              <line x1={cx + R} y1={cy} x2={cx - R} y2={cy} className="stroke-accent-foreground stroke-solid stroke-[0.2]" />

              {/* Analemmas */}
              {analemmas.map((arr, i) => (
                <path
                  key={i}
                  d={pathD(arr)}
                  className="fill-none stroke-sun stroke-1"
                  strokeDasharray="2 3" />
              ))}

              {/*Linhas sazonais fixas —---------------------------------- Sun Paths para datas de referência */}
              {[1, 21, 52, 80, 111, 172].map((dayRef) => {
                const seasonalPath = buildDailyPath(dayRef, lat, lon, tz);
                const path = "M" + seasonalPath.map((p) => toXY(p.alt, p.az).join(",")).join("L");

                const { color, dash, width } =
                  dayRef === 80
                    ? { color: "oklch(0.84 0.12 66)", dash: "2 3", width: 1 } // Equinócios
                    : dayRef === 172
                      ? { color: "oklch(0.84 0.12 66)", dash: "0", width: 1.2 } // Solstício (21 Jun)
                      : dayRef === 1
                        ? { color: "oklch(0.84 0.12 66)", dash: "0", width: 1.2 } // Contínuas (01 Jan e 31 Dez)
                        : { color: "oklch(0.84 0.12 66)", dash: "2 3", width: 1 }; // Demais tracejadas


                return (
                  <path
                    key={`seasonal-${dayRef}`}
                    d={path}
                    fill="none"
                    stroke={color}
                    strokeDasharray={dash}
                    strokeWidth={width}
                    opacity={0.85}
                  />
                );
              })}


              {/**********************************************************************************/}
              {/* Círculo pontilhado até o Sol ***************************************************/}
              {/**********************************************************************************/}

              <circle cx={cx} cy={cy} r={sunRadius} className="fill-none stroke-red-500" strokeDasharray="2 3" />

              {/**********************************************************************************/}
              {/* Linha centro → horizonte *******************************************************/}
              {/**********************************************************************************/}
              <line
                x1={cx}
                y1={cy}
                x2={horizonPoint[0]}
                y2={horizonPoint[1]}
                className="stroke-red-500"
                strokeWidth={1}
                strokeDasharray="2 3"
              />
              {/* Sol */}
              <circle cx={sun[0]} cy={sun[1]} r={5} className="fill-red-500 stroke-yellow-300" />
              {/**********************************************************************************/}
              {/* Marcações externas de 5°********************************************************/}
              {/**********************************************************************************/}
              {Array.from({ length: 360 }, (_, i) => i * 1).map((az) => {
                const p1 = projectBlend(0, az, projection, projection, 1);
                const p2 = projectBlend(0, az, projection, projection, 1);
                // define dois pontos (um no horizonte, outro 10px mais fora)
                const x1 = cx + p1.x * R;
                const y1 = cy + p1.y * R;
                const x2 = cx + p2.x * (R + 10);
                const y2 = cy + p2.y * (R + 10);
                return (
                  <line
                    key={`tick-${az}`}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    className="stroke-accent-foreground"
                    strokeWidth={az % 5 === 0 ? 1.5 : 0.8}
                    opacity={az % 5 === 0 ? 0.9 : 0.5}
                  />
                );
              })}

              {/* Daily Path */}
              <path d={pathD(dailyPath)} className="fill-none stroke-red-500" strokeWidth={2.5} />
              {dailyPath.map((p, i) => {
                const [x, y] = toXY(p.alt, p.az);
                return (
                  <g key={i} transform={`translate(${x},${y})`}>
                    <circle r={4} className="fill-background stroke-[2.5] stroke-red-500" />
                    <text dy={-6} fontSize={12} textAnchor="middle" className="text-accent-red-500 fill-red-500 font-sans ">
                      {p.hour.toString().padStart(2, "0")}
                    </text>
                  </g>
                );
              })}

              {/* Rótulos de azimute */}
              {azimuthLabels.map((ang) => {
                const az = mod(ang, 360);
                const pt = projectBlend(0, az, projection, projection, 1);
                const x = cx + pt.x * (R + 35);
                const y = cy + pt.y * (R + 35);
                const label =
                  ang === 0
                    ? "N"
                    : ang === 90
                      ? "L"
                      : ang === -90 || ang === 270
                        ? "O"
                        : ang === 180 || ang === -180
                          ? "S"
                          : `${ang > 0 ? ang : ang}°`;
                const bold = ["N", "S", "L", "O"].includes(label);
                return (
                  <text
                    key={ang}
                    x={x}
                    y={y + 8}
                    fontSize={bold ? 16 : 11}
                    fontWeight={bold ? "bold" : "normal"}
                    textAnchor="middle"
                    className="text-foreground fill-accent-foreground"

                  >
                    {label}
                  </text>
                );
              })}

              {/* Labels de altitude */}
              {altLabels.map((a) => {
                const y = cy - rByProjection(a, projection) * R;
                return (
                  <text key={a} x={cx - 20} y={y + 4} fontSize={10} className="fill-accent-foreground ">
                    {a}°
                  </text>
                );
              })}
            </svg>

          </div>
          {/* ****************************************************** *******************************************************/}
          {/* Vista superior do edifício com projeção real da sombra *******************************************************/}
          {/* ****************************************************** *******************************************************/}

          <div className="flex flex-col items-center justify-center  w-[480] p-3">

            <svg width={480} height={380} className=" mb-3">
              {(() => {
                const alt = altitude ?? 0;
                const az = azimuth ?? 0;

                const cx = 190;
                const cy = 240;
                const scale = 3; // fator de escala (px/m)

                const W = buildingWidth * scale;
                const L = buildingLength * scale;
                const H = buildingHeight; // metros reais

                const halfW = W / 2;
                const halfL = L / 2;

                // base da edificação no solo (orientada N-S)
                const base: number[][] = [
                  [cx - halfW, cy - halfL],
                  [cx + halfW, cy - halfL],
                  [cx + halfW, cy + halfL],
                  [cx - halfW, cy + halfL],
                ];

                // edifício
                const buildingRect = (
                  <rect
                    x={cx - halfW}
                    y={cy - halfL}
                    width={W}
                    height={L}
                    className="fill-border"
                  />
                );

                if (alt <= 0) {
                  return (
                    <>
                      {buildingRect}
                      <text
                        x={cx}
                        y={cy + 70}
                        textAnchor="middle"
                        className="fill-gray-600 text-sm select-none"
                      >
                        🌙 Sol abaixo do horizonte
                      </text>
                    </>
                  );
                }

                // Direção solar (radianos)
                const altRad = (alt * Math.PI) / 180;
                const azRad = (az * Math.PI) / 180;

                // deslocamento no plano (projeção da sombra)
                const cot = 1 / Math.tan(altRad);
                const k = H * cot * scale;
                const dx = -k * Math.sin(azRad);
                const dy = k * Math.cos(azRad);

                // base projetada (sombra máxima)
                const shifted = base.map(([x, y]) => [x + dx, y + dy]);

                // casco convexo da união
                const hull = convexHull([...base, ...shifted]);
                const points = hull.map((p) => p.join(",")).join(" ");

                // direção do sol
                const sunLen = 110;
                const sunX = cx + Math.sin(azRad) * sunLen;
                const sunY = cy - Math.cos(azRad) * sunLen;

                return (
                  <>
                    {/* sombra projetada */}
                    <polygon points={points} className="fill-gray-800 opacity-50 stroke-1 stroke-gray-900" />

                    {/* prédio */}
                    {buildingRect}

                    {/* direção solar */}
                    {/* <line
                      x1={cx}
                      y1={cy}
                      x2={sunX}
                      y2={sunY}
                      className="stroke-red-500 stroke-[0.5]"
                    /> */}
                    <circle cx={sunX} cy={sunY} r={8} className="fill-yellow-400 stroke-orange-500 " strokeDasharray="2 3" />
                  </>
                );
              })()}
            </svg>
            {/* VISTA ISOMÉTRICA ORTOGRÁFICA — PONTO DE VISTA SUDOESTE (SW) */}
            <div className="flex flex-col items-center justify-center bg-transparent border rounded-md p-3">
              <svg width={500} height={500} className="bg-transparent">
                {(() => {
                  // ---- ENTRADAS (dos seus estados / hook SunCalc) ----
                  const alt = (altitude ?? 0);     // graus
                  const az = (azimuth ?? 0);     // graus (0=N, horário)
                  const Wm = buildingWidth;        // m
                  const Lm = buildingLength;       // m
                  const Hm = buildingHeight;       // m

                  // ---- Layout da cena (alinha com sua planta: px por metro) ----
                  const scale = 3;                 // px/m
                  const cx = 230;                  // centro X do desenho
                  const cy = 270;                  // nível do solo em Y

                  // ---- Projeção isométrica ortográfica — VIEWPOINT SW ----
                  const RAD = Math.PI / 180;
                  const theta = 225 * RAD;         // 225° = -135° → Sudoeste
                  const alpha = 35.264 * RAD;      // isometria
                  const c = Math.cos(theta), s = Math.sin(theta);
                  const ca = Math.cos(alpha), sa = Math.sin(alpha);

                  // Projeção (SVG: Y cresce para baixo → usar "- z * sa")
                  function isoProjectMeters(x: number, y: number, z: number) {
                    const u = (x * c - y * s);
                    const v = (x * s + y * c) * ca - z * sa;
                    return [cx + u * scale, cy + v * scale] as const;
                  }

                  // ---- Geometria do edifício (centrado no (0,0)) ----
                  const hx = Wm / 2, hy = Lm / 2;
                  // Base no sentido anti-horário: SW, SE, NE, NW
                  const base3D: [number, number, number][] = [
                    [-hx, -hy, 0], // SW
                    [+hx, -hy, 0], // SE
                    [+hx, +hy, 0], // NE
                    [-hx, +hy, 0], // NW
                  ];
                  const top3D = base3D.map(([x, y]) => [x, y, Hm] as [number, number, number]);

                  // ---- Sol (mesmo vetor da planta) ----
                  const altRad = alt * RAD;
                  const azRad = az * RAD;
                  const sx = -Math.sin(azRad) * Math.cos(altRad);  // invertido
                  const sy = Math.cos(azRad) * Math.cos(altRad);
                  const sz = Math.sin(altRad);

                  // ---- Sombra: projetar o topo no z=0 (solo) e fazer casco convexo com a base ----
                  let shadowHull: [number, number, number][] | null = null;
                  if (sz > 0) {
                    const t = Hm / sz; // mesmo t para todos vértices do topo (altura constante)
                    const projTop = top3D.map(([x, y, z]) => [x - sx * t, y - sy * t, 0] as [number, number, number]);
                    const all = [...base3D, ...projTop];
                    const hull2D = convexHull2D(all.map(([x, y]) => [x, y]));
                    shadowHull = hull2D.map(([x, y]) => [x, y, 0] as [number, number, number]);
                  }

                  // ---- Helpers ----
                  function pts(arr: [number, number, number][]) {
                    return arr.map(([x, y, z]) => isoProjectMeters(x, y, z).join(",")).join(" ");
                  }
                  function convexHull2D(pts: [number, number][]) {
                    if (pts.length <= 3) return pts.slice();
                    const A = pts.slice().sort((p, q) => p[0] === q[0] ? p[1] - q[1] : p[0] - q[0]);
                    const cross = (o: [number, number], a: [number, number], b: [number, number]) =>
                      (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
                    const lower: [number, number][] = [];
                    for (const p of A) {
                      while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
                      lower.push(p);
                    }
                    const upper: [number, number][] = [];
                    for (let i = A.length - 1; i >= 0; i--) {
                      const p = A[i];
                      while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
                      upper.push(p);
                    }
                    upper.pop(); lower.pop();
                    return lower.concat(upper);
                  }

                  // ---- Grade do solo (isométrica) ----
                  const grid: JSX.Element[] = [];
                  const gridStep = 10, gridExtent = 120;
                  for (let gx = -gridExtent; gx <= gridExtent; gx += gridStep) {
                    const a = isoProjectMeters(gx, -gridExtent, 0);
                    const b = isoProjectMeters(gx, +gridExtent, 0);
                    grid.push(<line key={`gx-${gx}`} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} className="stroke-gray-300" strokeWidth={0.5} />);
                  }
                  for (let gy = -gridExtent; gy <= gridExtent; gy += gridStep) {
                    const a = isoProjectMeters(-gridExtent, gy, 0);
                    const b = isoProjectMeters(+gridExtent, gy, 0);
                    grid.push(<line key={`gy-${gy}`} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} className="stroke-gray-300" strokeWidth={0.5} />);
                  }

                  // ---- Círculo no chão (N S L O) centralizado no edifício ----
                  const compassEls = (() => {
                    const baseR = 40;           // raio original
                    const groundR = baseR * 1.8; // +50% de aumento
                    const tickLen = 3;          // mantém ticks no mesmo tamanho
                    const steps = 160;          // resolução do contorno

                    // Contorno circular (no plano do chão)
                    const circlePts = Array.from({ length: steps }, (_, i) => {
                      const t = (i / steps) * Math.PI * 2;
                      const x = groundR * Math.cos(t);
                      const y = groundR * Math.sin(t);
                      const [u, v] = isoProjectMeters(x, y, 0);
                      return `${u},${v}`;
                    }).join("L");

                    // Ticks de 15°
                    const ticks: JSX.Element[] = [];
                    for (let deg = 0; deg < 360; deg += 15) {
                      const t = (deg * Math.PI) / 180;
                      const x1 = groundR * Math.cos(t);
                      const y1 = groundR * Math.sin(t);
                      const x2 = (groundR + tickLen) * Math.cos(t);
                      const y2 = (groundR + tickLen) * Math.sin(t);
                      const [u1, v1] = isoProjectMeters(x1, y1, 0);
                      const [u2, v2] = isoProjectMeters(x2, y2, 0);
                      ticks.push(
                        <line
                          key={`tick-${deg}`}
                          x1={u1}
                          y1={v1}
                          x2={u2}
                          y2={v2}
                          className={deg % 45 === 0 ? "stroke-gray-500" : "stroke-gray-300"}
                          strokeWidth={deg % 45 === 0 ? 1.1 : 0.6}
                        />
                      );
                    }

                    // Rótulos cardeais (N, S, L, O) - posição atualizada
                    const [uN, vN] = isoProjectMeters(0, +groundR + 8, 0);
                    const [uS, vS] = isoProjectMeters(0, -groundR - 6, 0);
                    const [uL, vL] = isoProjectMeters(-groundR - 8, 0, 0);
                    const [uO, vO] = isoProjectMeters(+groundR + 8, 0, 0);

                    // Vetor solar projetado no solo (referência)
                    const azRad = (azimuth ?? 0) * Math.PI / 180;
                    const altRad = (altitude ?? 0) * Math.PI / 180;
                    const sxg = -Math.sin(azRad) * Math.cos(altRad);
                    const syg = Math.cos(azRad) * Math.cos(altRad);
                    const [uc, vc] = isoProjectMeters(0, 0, 0);
                    const [ux, vy] = isoProjectMeters(sxg * groundR, syg * groundR, 0);

                    return (
                      <>
                        <path
                          d={`M${circlePts}Z`}
                          className="fill-none stroke-gray-400"
                          strokeWidth={1.2}
                        />
                        <g>{ticks}</g>

                        {/* Rótulos cardeais */}
                        <text x={uN} y={vN} textAnchor="middle" className="fill-gray-800 font-bold">
                          N
                        </text>
                        <text x={uS} y={vS} textAnchor="middle" className="fill-gray-800 font-bold">
                          S
                        </text>
                        <text x={uL} y={vL} textAnchor="middle" className="fill-gray-800 font-bold">
                          L
                        </text>
                        <text x={uO} y={vO} textAnchor="middle" className="fill-gray-800 font-bold">
                          O
                        </text>

                        {/* vetor solar no chão */}
                        {(altitude ?? 0) > 0 && (
                          <>
                            <line
                              x1={uc}
                              y1={vc}
                              x2={ux}
                              y2={vy}
                              className="stroke-red-500 stroke-[1.2]"
                              strokeDasharray="2 3"
                            />
                            <circle cx={ux} cy={vy} r={3} className="fill-red-500" />
                          </>
                        )}
                      </>
                    );
                  })();

                  return (
                    <>
                      {/* grade */}
                      <g opacity={0.35}>{grid}</g>

                      {/* círculo N S L O (no chão, centralizado no edifício) */}
                      {compassEls}

                      {/* --- ARCO SOLAR (mesmo sol, projetado sobre a esfera do compass) --- */}
                      {(() => {
                        const RAD = Math.PI / 180;
                        const φ = lat * RAD;
                        const { E, dec } = solarBasics(day);
                        const δ = dec;
                        const groundR = 40 * 1.8;

                        // Ângulo horário no nascer/pôr
                        const H0 = Math.acos(Math.max(-1, Math.min(1, -Math.tan(φ) * Math.tan(δ))));

                        // Função: posição solar (alt, az) por H
                        function solarPosition(H: number) {
                          const sin_h = Math.sin(φ) * Math.sin(δ) + Math.cos(φ) * Math.cos(δ) * Math.cos(H);
                          const alt = Math.asin(Math.max(-1, Math.min(1, sin_h)));
                          const az = Math.atan2(
                            -Math.sin(H),
                            Math.tan(δ) * Math.cos(φ) - Math.sin(φ) * Math.cos(H)
                          );
                          return { alt, az };
                        }

                        // Arco real sobre a esfera (nada no chão, tudo na "cúpula")
                        const arcPts: [number, number, number][] = [];
                        for (let H = -H0; H <= H0; H += Math.PI / 60) {
                          const { alt, az } = solarPosition(H);
                          if (alt >= 0) {
                            const x = -groundR * Math.sin(az) * Math.cos(alt);
                            const y = groundR * Math.cos(az) * Math.cos(alt);
                            const z = groundR * Math.sin(alt);
                            arcPts.push([x, y, z]);
                          }
                        }

                        const arcPath = arcPts
                          .map(([x, y, z], i) => {
                            const [u, v] = isoProjectMeters(x, y, z);
                            return `${i === 0 ? "M" : "L"}${u},${v}`;
                          })
                          .join(" ");

                        // Usa o mesmo Sol já existente (não recalcula)
                        const altNow = (altitude ?? 0) * RAD;
                        const azNow = (azimuth ?? 0) * RAD;
                        const xS = -groundR * Math.sin(azNow) * Math.cos(altNow);
                        const yS = groundR * Math.cos(azNow) * Math.cos(altNow);
                        const zS = groundR * Math.sin(altNow);
                        const [ux, uy] = isoProjectMeters(xS, yS, zS);

                        return (
                          <>
                            {/* arco na esfera */}
                            <path d={arcPath} className="fill-none stroke-yellow-400" strokeWidth={1.8} strokeDasharray="2 3" />
                            {/* o mesmo Sol atual, sobre o arco */}
                            {(altitude ?? 0) > 0 && (
                              <circle cx={ux} cy={uy} r={5} className="fill-yellow-400 stroke-yellow-600" />
                            )}
                          </>
                        );
                      })()}

                      {/* sombra */}
                      {shadowHull && (
                        <polygon points={pts(shadowHull)} className="fill-gray-500 opacity-40" />
                      )}
   {/* arestas verticais */}
                      {base3D.map(([x, y, z], i) => {
                        const [u1, v1] = isoProjectMeters(x, y, z);
                        const [u2, v2] = isoProjectMeters(x, y, Hm);
                        return <line key={`edge-${i}`} x1={u1} y1={v1} x2={u2} y2={v2} className="stroke-gray-900 stroke-[0.6]" />;
                      })}

                      {/* faces visíveis para viewpoint SW: SUL e OESTE */}
                      {/* Sul (SW-SE-SEtop-SWtop) */}
                      <polygon points={pts([base3D[0], base3D[1], top3D[1], top3D[0]])} className="fill-gray-700" />
                      {/* Oeste (NW-SW-SWtop-NWtop) */}
                      <polygon points={pts([base3D[3], base3D[0], top3D[0], top3D[3]])} className="fill-gray-600" />
                      {/* Topo */}
                      <polygon points={pts(top3D)} className="fill-gray-200" />

                   

                      {/* vetor solar 3D (apenas referência) */}
                      {sz > 0 && (() => {
                        const len = 40; // m
                        const [ux, uy] = isoProjectMeters(0, 0, Hm * 0.6);
                        const [vx, vy] = isoProjectMeters(sx * len, sy * len, Hm * 0.6 + sz * len);
                        return (
                          <>
                          </>
                        );
                      })()}
                    </>
                  );
                })()}
              </svg>
              <span className="text-sm text-gray-700 mt-1">Vista Isométrica — Ponto de vista Sudoeste (SW)</span>
            </div>



          </div>

          {/* ****************************************************** *******************************************************/}
          {/* Painel de controle  ******************************************************************************************/}
          {/* ****************************************************** *******************************************************/}

          <div className="absolute top-3 right-3 bg-sidebar-accent backdrop-primary-md p-3 rounded-md shadow-md z-5 space-y-3">
            <div >
              <legend>Controle</legend>

              {/* Slider | dias do ano */}
              <div className=" font-sm ">
                Data:&nbsp;
                <b className="font-sm" >
                  {new Date(2025, 0, 1 + day - 1).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "short",
                  })}
                </b>
                <input
                  type="range"
                  min={1}
                  max={365}
                  value={day}
                  onChange={(e) => setDay(+e.target.value)}
                  style={{ width: "100%" }}
                />
              </div>

              {/* Slider de hora do dia */}
              <div className="font-sm">
                Hora do dia:&nbsp;
                <b>
                  {String(Math.floor(hour)).padStart(2, "0")}:
                  {String(Math.round((hour % 1) * 60))
                    .padStart(2, "0")
                    .replace("60", "00")}
                </b>
                <input
                  type="range"
                  min={0}
                  max={24}
                  step={1 / 6} // 10 minutos
                  value={hour}
                  onChange={(e) => setHour(+e.target.value)}
                  style={{ width: "100%" }}
                />
              </div>
            </div>


            <div>
              <legend>Localização</legend>
              <div className="flex flex-wrap items-center gap-2" >
                <></>
                <label className="p-px text-sm" > Latitude : </label>
                <input
                  className="border rounded px-2 py-1 text-sm bg-card w-25"
                  type="number"
                  value={lat}
                  onChange={(e) => setLat(parseFloat(e.target.value))} />


                <label className="p-px text-sm"> Long </label>
                <input
                  className="border rounded px-2 py-1 text-sm bg-card w-25"
                  type="number"
                  value={lon}
                  onChange={(e) => setLon(parseFloat(e.target.value))}

                />

              </div>

            </div>


            <legend>Projeção</legend>
            <div className="flex items-center gap-2">
              <button
                onClick={() => animateTo("spherical")}
                className="px-3 py-1 rounded text-sm font-medium bg-primary text-white">
                Esférica
              </button>
              <button onClick={() => animateTo("stereographic")}
                className="px-3 py-1 rounded text-sm font-medium bg-primary text-white">
                Estereografica
              </button>
              <button onClick={() => animateTo("equidistant")}
                className="px-3 py-1 rounded text-sm font-medium bg-primary text-white">
                Equidistante
              </button>
            </div>

            <div className="mt-4 p-3 rounded-md border text-sm">
              <div className="flex">
                <b>Altitude:</b> {altitude?.toFixed(2)}°
                <b>Azimute:</b> {azimuth?.toFixed(2)}°
              </div>
              <div className="flex">
                <b>Nascer:</b> {sunrise?.toLocaleTimeString("pt-BR")}
                <b>Pôr do Sol:</b> {sunset?.toLocaleTimeString("pt-BR")}
              </div>
              <div><b>Declinação:</b> {declination?.toFixed(2)}°</div>
              <div>

              </div>
              <div><b>Duração do dia:</b> {dayLength?.toFixed(2)} h</div>
              <div>{isDaylight ? "☀️ Dia" : "Noite"}</div>
              {/* Inputs para dimensões do edifício */}
              <div className="flex flex-col gap-2 w-full text-sm text-gray-800">
                <div className="flex items-center justify-between">
                  <label className="font-medium">Largura (m):</label>
                  <input
                    type="number"
                    value={buildingWidth}
                    onChange={(e) => setBuildingWidth(parseFloat(e.target.value) || 0)}
                    className="w-20 border rounded px-2 py-1 bg-white text-right"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label className="font-medium">Comprimento (m):</label>
                  <input
                    type="number"
                    value={buildingLength}
                    onChange={(e) => setBuildingLength(parseFloat(e.target.value) || 0)}
                    className="w-20 border rounded px-2 py-1 bg-white text-right"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label className="font-medium">Altura (m):</label>
                  <input
                    type="number"
                    value={buildingHeight}
                    onChange={(e) => setBuildingHeight(parseFloat(e.target.value) || 0)}
                    className="w-20 border rounded px-2 py-1 bg-white text-right"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
