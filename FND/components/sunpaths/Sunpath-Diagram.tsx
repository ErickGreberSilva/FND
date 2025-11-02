"use client";

import { useMemo, useRef, useState } from "react";
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
  return (
    <div className={wrapperClass}>
      <div style={{ padding: 24, fontFamily: "Inter, system-ui, sans-serif" }}>
        <h1>☀️ Diagrama de estudo de Insolação</h1>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 16 }}>
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

          {/* Painel de controle **********************************************************/}
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

            <div className="mt-4 bg-gray-50 p-3 rounded-md border text-sm">
              <div>☀️ <b>Altitude:</b> {altitude?.toFixed(2)}°</div>
              <div>🧭 <b>Azimute:</b> {azimuth?.toFixed(2)}°</div>
              <div>🎯 <b>Declinação:</b> {declination?.toFixed(2)}°</div>
              <div>🌅 <b>Nascer:</b> {sunrise?.toLocaleTimeString("pt-BR")}</div>
              <div>🌇 <b>Pôr do Sol:</b> {sunset?.toLocaleTimeString("pt-BR")}</div>
              <div>📏 <b>Duração do dia:</b> {dayLength?.toFixed(2)} h</div>
              <div>{isDaylight ? "☀️ Dia" : "🌙 Noite"}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
