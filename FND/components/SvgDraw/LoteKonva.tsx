"use client";

import React, { JSX, useEffect, useRef, useState } from "react";
import { Stage, Layer, Line, Text, Circle } from "react-konva";
import { useLoteBusca } from "@/context/LoteBuscaContext";
import { Button } from "@/components/ui/button";

const R = 6378137;
const lon2x = (lon: number): number => (lon * Math.PI * R) / 180;
const lat2y = (lat: number): number =>
  R * Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));

function lonLatToMeters([lon, lat]: [number, number]): [number, number] {
  return [lon2x(lon), lat2y(lat)];
}

function distance(p1: [number, number], p2: [number, number]): number {
  const dx = p2[0] - p1[0];
  const dy = p2[1] - p1[1];
  return Math.sqrt(dx * dx + dy * dy);
}

function polygonAreaSigned(coords: [number, number][]) {
  let area = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    const [x1, y1] = coords[i];
    const [x2, y2] = coords[i + 1];
    area += x1 * y2 - x2 * y1;
  }
  return area / 2; // pode ser negativo (CW) ou positivo (CCW)
}
function polygonAreaAbs(coords: [number, number][]) {
  return Math.abs(polygonAreaSigned(coords));
}

function polygonCentroid(coords: [number, number][]) {
  let x = 0,
    y = 0;
  for (const [px, py] of coords) {
    x += px;
    y += py;
  }
  return [x / coords.length, y / coords.length] as [number, number];
}

export default function LoteKonva(): JSX.Element {
  const { ifiscal } = useLoteBusca();
  const [loading, setLoading] = useState(false);
  const [polygonPoints, setPolygonPoints] = useState<number[]>([]);
  const [polygonCoords, setPolygonCoords] = useState<[number, number][]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dimLines, setDimLines] = useState<any[]>([]);
  const [offsetLines, setOffsetLines] = useState<number[][]>([]);
  const [area, setArea] = useState<number>(0);
  const [areaText, setAreaText] = useState<{ x: number; y: number; rotation: number }>({
    x: 0,
    y: 0,
    rotation: 0,
  });

  // estados auxiliares para conversões
  const [centerXY, setCenterXY] = useState<{ cx: number; cy: number }>({ cx: 0, cy: 0 });
  const [scaleFit, setScaleFit] = useState<number>(1);

  const stageRef = useRef<any>(null);
  const [scale, setScale] = useState<number>(1);
  const [position, setPosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  const canvasWidth = 1500;
  const canvasHeight = 900;

  // ==============================================================
  // BUSCA DO LOTE
  // ==============================================================
  useEffect(() => {
    const fetchLote = async () => {
      if (!ifiscal) return;
      setLoading(true);
      setError(null);
      setOffsetLines([]);

      try {
        const where = `gtm_ind_fiscal='${ifiscal}'`;
        const url = `https://geocuritiba.ippuc.org.br/server/rest/services/GeoCuritiba/Publico_GeoCuritiba_MapaCadastral/MapServer/15/query?where=${encodeURIComponent(
          where
        )}&outFields=gtm_ind_fiscal&returnGeometry=true&outSR=4326&f=json`;

        const res = await fetch(url);
        const data = await res.json();
        if (!data.features?.length) {
          setError("Lote não encontrado.");
          return;
        }

        const rings: [number, number][] = data.features[0].geometry.rings[0];
        const coordsM = rings.map(([lon, lat]) => lonLatToMeters([lon, lat]));

        const xs = coordsM.map(([x]) => x);
        const ys = coordsM.map(([_, y]) => y);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const minY = Math.min(...ys);
        const maxY = Math.max(...ys);

        const widthM = maxX - minX;
        const heightM = maxY - minY;

        const margin = 0.1;
        const availableWidth = canvasWidth * (1 - margin * 2);
        const availableHeight = canvasHeight * (1 - margin * 2);
        const scaleFitCalc = Math.min(availableWidth / widthM, availableHeight / heightM);
        setScaleFit(scaleFitCalc);

        const cx = (minX + maxX) / 2;
        const cy = (minY + maxY) / 2;
        setCenterXY({ cx, cy });

        setPolygonCoords(coordsM);

        // pontos no sistema base do Stage (sem considerar pan/zoom do usuário)
        const relativePoints = coordsM.flatMap(([x, y]) => [
          (x - cx) * scaleFitCalc + canvasWidth / 2,
          -(y - cy) * scaleFitCalc + canvasHeight / 2,
        ]);
        setPolygonPoints(relativePoints);

        // ============================= COTAS =============================
        const newDimLines = [];
        for (let i = 0; i < coordsM.length - 1; i++) {
          const p1 = coordsM[i];
          const p2 = coordsM[i + 1];
          const dist = distance(p1, p2);

          const [sx1, sy1] = [
            (p1[0] - cx) * scaleFitCalc + canvasWidth / 2,
            -(p1[1] - cy) * scaleFitCalc + canvasHeight / 2,
          ];
          const [sx2, sy2] = [
            (p2[0] - cx) * scaleFitCalc + canvasWidth / 2,
            -(p2[1] - cy) * scaleFitCalc + canvasHeight / 2,
          ];

          const dx = sx2 - sx1;
          const dy = sy2 - sy1;
          const len = Math.sqrt(dx * dx + dy * dy);
          const nx = dy / len; // normal "para fora" visual
          const ny = -dx / len;

          const offsetOut = 25;
          const c1x = sx1 + nx * offsetOut;
          const c1y = sy1 + ny * offsetOut;
          const c2x = sx2 + nx * offsetOut;
          const c2y = sy2 + ny * offsetOut;

          const midX = (c1x + c2x) / 2;
          const midY = (c1y + c2y) / 2;
          let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
          if (angle > 90 || angle < -90) angle += 180;

          const textOffset = 12;
          const textX = midX + nx * textOffset;
          const textY = midY + ny * textOffset;

          newDimLines.push({
            line: [c1x, c1y, c2x, c2y],
            ticks: [
              [sx1, sy1, c1x, c1y],
              [sx2, sy2, c2x, c2y],
            ],
            label: `${dist.toFixed(2)} m`,
            text: [textX, textY, angle],
          });
        }
        setDimLines(newDimLines);

        // ============================= ÁREA =============================
        const areaM2 = polygonAreaAbs(coordsM);
        setArea(areaM2);

        const [ccx, ccy] = polygonCentroid(coordsM);
        const [cxS, cyS] = [
          (ccx - cx) * scaleFitCalc + canvasWidth / 2,
          -(ccy - cy) * scaleFitCalc + canvasHeight / 2,
        ];

        // alinhar texto da área à maior dimensão
        let bestAngle = 0;
        let maxLen = 0;
        for (let i = 0; i < coordsM.length - 1; i++) {
          const [x1, y1] = coordsM[i];
          const [x2, y2] = coordsM[i + 1];
          const l = distance([x1, y1], [x2, y2]);
          if (l > maxLen) {
            maxLen = l;
            const dx = x2 - x1;
            const dy = y2 - y1;
            bestAngle = (Math.atan2(dy, dx) * 180) / Math.PI;
            if (bestAngle > 90 || bestAngle < -90) bestAngle += 180;
          }
        }
        setAreaText({ x: cxS, y: cyS, rotation: bestAngle });
      } catch (e) {
        console.error(e);
        setError("Erro ao carregar lote.");
      } finally {
        setLoading(false);
      }
    };
    fetchLote();
  }, [ifiscal]);

  // ==============================================================
  // ZOOM (mantido)
  // ==============================================================
  const handleWheel = (e: any) => {
    e.evt.preventDefault();
    const stage = stageRef.current?.getStage?.();
    if (!stage) return;
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };
    const scaleBy = 1.05;
    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const newScale = direction > 0 ? oldScale * scaleBy : oldScale / scaleBy;
    stage.scale({ x: newScale, y: newScale });
    setScale(newScale);
    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };
    setPosition(newPos);
  };

  // ==============================================================
  // OFFSET 5 m para dentro (corrigido)
  // ==============================================================
  const handleClick = (e: any) => {
    const stage = stageRef.current?.getStage?.();
    if (!stage || polygonCoords.length < 2) return;

    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    // Converter clique para coordenadas do Stage base (antes de pan/zoom)
    const stageScale = stage.scaleX();
    const stagePos = stage.position();
    const localX = (pointer.x - stagePos.x) / stageScale;
    const localY = (pointer.y - stagePos.y) / stageScale;

    // Converter para "mundo" (metros)
    const { cx, cy } = centerXY;
    const sx = localX;
    const sy = localY;
    const realClickX = (sx - canvasWidth / 2) / scaleFit + cx;
    const realClickY = -((sy - canvasHeight / 2) / scaleFit) + cy;

    // Encontrar a aresta mais próxima no espaço do "mundo"
    let nearestDist = Infinity;
    let selectedEdge: [number, number, number, number] | null = null;
    for (let i = 0; i < polygonCoords.length - 1; i++) {
      const [x1, y1] = polygonCoords[i];
      const [x2, y2] = polygonCoords[i + 1];
      const A = realClickX - x1;
      const B = realClickY - y1;
      const C = x2 - x1;
      const D = y2 - y1;
      const denom = C * C + D * D || 1e-9;
      const t = Math.max(0, Math.min(1, (A * C + B * D) / denom));
      const px = x1 + t * C;
      const py = y1 + t * D;
      const d = Math.sqrt((realClickX - px) ** 2 + (realClickY - py) ** 2);
      if (d < nearestDist) {
        nearestDist = d;
        selectedEdge = [x1, y1, x2, y2];
      }
    }
    if (!selectedEdge) return;

    // Normal correta para o lado interno (depende da orientação)
    const signed = polygonAreaSigned(polygonCoords);
    const isCCW = signed > 0;
    const [x1, y1, x2, y2] = selectedEdge;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx * dx + dy * dy) || 1e-9;

    // normal esquerda (-dy, dx) aponta para DENTRO se polígono é CCW
    // para CW, o interior é à direita (dy, -dx)
    let nx = isCCW ? -dy / len : dy / len;
    let ny = isCCW ? dx / len : -dx / len;

    // offset em METROS
    const offsetM = 5;
    const ox1 = x1 + nx * offsetM;
    const oy1 = y1 + ny * offsetM;
    const ox2 = x2 + nx * offsetM;
    const oy2 = y2 + ny * offsetM;

    // Projetar para o sistema do Stage base
    const toStageBase = (wx: number, wy: number): [number, number] => [
      (wx - cx) * scaleFit + canvasWidth / 2,
      -(wy - cy) * scaleFit + canvasHeight / 2,
    ];
    const [sx1b, sy1b] = toStageBase(ox1, oy1);
    const [sx2b, sy2b] = toStageBase(ox2, oy2);

    // Armazenar em coordenadas base (o Stage aplica pan/zoom automaticamente)
    setOffsetLines((prev) => [...prev, [sx1b, sy1b, sx2b, sy2b]]);
  };

  // ==============================================================
  // RENDER
  // ==============================================================

  // Escala gráfica (0–5–10m) em overlay HTML — dinâmica com zoom
  const barLengthPx = 10 * scaleFit * scale; // 10m * (px/m) * zoom

  return (
    <div className="w-full space-y-3 relative">
      <div className="flex items-center justify-between">
        <div>
          {ifiscal ? (
            <span className="text-sm text-muted-foreground">
              Indicação Fiscal:{" "}
              <span className="font-semibold text-foreground">{ifiscal}</span>
            </span>
          ) : (
            "Informe uma indicação fiscal."
          )}
        </div>
        <Button
          onClick={() => {
            setScale(1);
            setPosition({ x: 0, y: 0 });
            stageRef.current?.scale({ x: 1, y: 1 });
            setOffsetLines([]);
          }}
          variant="outline"
        >
          Resetar Zoom
        </Button>
      </div>

      <div
        className="w-full relative"
        style={{
          height: `${900}px`,
          border: "1px solid #ccc",
          borderRadius: "6px",
          overflow: "hidden",
        }}
      >
        {/* Indicador de Norte (overlay fixo) */}
        <div
          style={{
            position: "absolute",
            top: 20,
            right: 30,
            textAlign: "center",
            color: "#000",
            fontWeight: 700,
            zIndex: 2,
          }}
          aria-hidden
        >
          N
          <div
            style={{
              width: 0,
              height: 0,
              borderLeft: "6px solid transparent",
              borderRight: "6px solid transparent",
              borderBottom: "12px solid black",
              margin: "4px auto 0",
            }}
          />
        </div>

        {/* Escala gráfica (overlay fixo e dinâmico) */}
        <div
          style={{
            position: "absolute",
            bottom: 20,
            left: 30,
            background: "rgba(255,255,255,0.85)",
            padding: "6px 10px",
            borderRadius: 6,
            fontSize: 12,
            fontWeight: 600,
            zIndex: 2,
          }}
          aria-hidden
        >
          <div style={{ position: "relative", height: 12, width: barLengthPx }}>
            {/* barra 0-5 */}
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                height: 12,
                width: barLengthPx / 2,
                background: "#000",
              }}
            />
            {/* barra 5-10 */}
            <div
              style={{
                position: "absolute",
                left: barLengthPx / 2,
                top: 0,
                height: 12,
                width: barLengthPx / 2,
                background: "#999",
              }}
            />
            {/* marcas */}
            <div style={{ position: "absolute", left: 0, bottom: -18 }}>0</div>
            <div
              style={{
                position: "absolute",
                left: barLengthPx / 2 - 8,
                bottom: -18,
              }}
            >
              5 m
            </div>
            <div style={{ position: "absolute", right: -2, bottom: -18 }}>10 m</div>
          </div>
        </div>

        {loading && <div className="text-center mt-6 text-muted-foreground">Carregando lote…</div>}
        {error && <div className="text-center mt-6 text-destructive">{error}</div>}

        {!loading && !error && polygonPoints.length > 0 && (
          <Stage
            ref={stageRef}
            width={canvasWidth}
            height={canvasHeight}
            scaleX={scale}
            scaleY={scale}
            x={position.x}
            y={position.y}
            draggable
            onWheel={handleWheel}
            onClick={handleClick}
          >
            <Layer>
              {/* Polígono */}
              <Line points={polygonPoints} closed stroke="black" strokeWidth={2} fill="#f3f3f3" />

              {/* Linhas de offset (duplicadas) */}
              {offsetLines.map((pts, i) => (
                <Line key={i} points={pts} stroke="red" strokeWidth={0.5} dash={[5, 5]} />
              ))}

              {/* Cotas com círculos nas extremidades (marrom) */}
              {dimLines.map((d, i) => (
                <React.Fragment key={i}>
                  <Line points={d.line} stroke="#7a4a0b" strokeWidth={1} />
                  {d.ticks.map((t: number[], j: number) => (
                    <React.Fragment key={j}>
                      <Line points={t} stroke="#7a4a0b" strokeWidth={1} />
                      <Circle x={t[2]} y={t[3]} radius={4} fill="#7a4a0b" />
                    </React.Fragment>
                  ))}
                  <Text
                    x={d.text[0]}
                    y={d.text[1]}
                    text={d.label}
                    fontSize={14}
                    fill="#7a4a0b"
                    rotation={d.text[2]}
                    align="center"
                    offsetX={30}
                  />
                </React.Fragment>
              ))}

              {/* Texto da área — centralizado e alinhado à maior dimensão */}
              <Text
                x={areaText.x}
                y={areaText.y}
                text={`Área = ${area.toFixed(2)} m²`}
                fontSize={18}
                fill="#000"
                rotation={areaText.rotation}
                align="center"
                offsetX={60}
              />
            </Layer>
          </Stage>
        )}
      </div>
    </div>
  );
}
