"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useLoteBusca } from "@/context/LoteBuscaContext";
import { Button } from "@/components/ui/button";

type EsriPolygonGeometry = { rings: number[][][] };
type EsriFeature = { attributes: Record<string, any>; geometry?: EsriPolygonGeometry };
type EsriQueryResponse = { features?: EsriFeature[] };

// ================================================================
// utilitários de projeção métrica (Web Mercator)
// ================================================================
const R = 6378137;
const lon2x = (lon: number) => (lon * Math.PI * R) / 180;
const lat2y = (lat: number) => R * Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));

function lonLatToMeters([lon, lat]: [number, number]): [number, number] {
  return [lon2x(lon), lat2y(lat)];
}

function distanceMeters(p1: [number, number], p2: [number, number]) {
  const [x1, y1] = lonLatToMeters(p1);
  const [x2, y2] = lonLatToMeters(p2);
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

// ================================================================
// conversão para SVG path + cotas (AGORA 100% EM METROS)
// ================================================================
function toSvgPathFromRings(
  ringsLonLat: number[][][],
  options: { width?: number; height?: number; padding?: number; svgSize?: number } = {}
) {
  if (!ringsLonLat || ringsLonLat.length === 0)
    return { d: "", width: 0, height: 0, viewBox: "0 0 0 0", dimLines: [], meterToSvg: 1 };

  const width = options?.width ?? 512;
  const height = options?.height ?? 512;
  const padding = options?.padding ?? 16;
  const svgSize = options?.svgSize ?? Math.max(width, height);

  // 1) Converte todos os pontos para METROS (Web Mercator)
  const ringsM: [number, number][][] = ringsLonLat.map((ring) =>
    ring.map(([lon, lat]) => lonLatToMeters([lon, lat]))
  );

  // 2) BBox em METROS
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;

  for (const ring of ringsM) {
    for (const [x, y] of ring) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  const spanX = Math.max(maxX - minX, 1e-9);
  const spanY = Math.max(maxY - minY, 1e-9);
  const innerW = Math.max(width - padding * 2, 1);
  const innerH = Math.max(height - padding * 2, 1);

  // escala UNIFORME → pixels por metro
  const meterToSvg = Math.min(innerW / spanX, innerH / spanY);

  const scaledW = spanX * meterToSvg;
  const scaledH = spanY * meterToSvg;
  const offsetX = (width - scaledW) / 2;
  const offsetY = (height - scaledH) / 2;

  const toSvgFromMeters = (x: number, y: number) => {
    const sx = offsetX + (x - minX) * meterToSvg;
    const sy = offsetY + (maxY - y) * meterToSvg; // Y invertido
    return [sx, sy] as const;
  };

  // 3) Monta o path e as “dimLines” (arestas clicáveis + cotas)
  let d = "";
  const dimLines: {
    x1: number; y1: number; x2: number; y2: number;
    label: string; lx: number; ly: number; angle: number;
  }[] = [];

  // Usamos os anéis originais em lon/lat para distância, mas projetamos arestas em METROS → SVG
  for (let r = 0; r < ringsLonLat.length; r++) {
    const ringLL = ringsLonLat[r];
    const ringM = ringsM[r];
    if (!ringLL.length) continue;

    // Path SVG a partir do ring em METROS
    {
      const [x0, y0] = ringM[0];
      const [sx0, sy0] = toSvgFromMeters(x0, y0);
      d += `M ${sx0.toFixed(2)} ${sy0.toFixed(2)} `;
      for (let i = 1; i < ringM.length; i++) {
        const [xi, yi] = ringM[i];
        const [sxi, syi] = toSvgFromMeters(xi, yi);
        d += `L ${sxi.toFixed(2)} ${syi.toFixed(2)} `;
      }
      d += "Z ";
    }

    // Cotas + arestas clicáveis
    for (let i = 1; i < ringLL.length; i++) {
      const p1LL = ringLL[i - 1] as [number, number];
      const p2LL = ringLL[i] as [number, number];

      const p1M = ringM[i - 1];
      const p2M = ringM[i];

      const dist = distanceMeters(p1LL, p2LL);

      const [sx1, sy1] = toSvgFromMeters(p1M[0], p1M[1]);
      const [sx2, sy2] = toSvgFromMeters(p2M[0], p2M[1]);

      const midX = (sx1 + sx2) / 2;
      const midY = (sy1 + sy2) / 2;

      const dx = sx2 - sx1;
      const dy = sy2 - sy1;
      let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
      if (angle > 180) angle -= 360;
      if (angle < -180) angle += 360;
      if (angle > 90 || angle < -90) angle += 180;

      const offsetBase = svgSize / 80;
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const ox = (-dy / len) * offsetBase;
      const oy = (dx / len) * offsetBase;

      dimLines.push({
        x1: sx1, y1: sy1, x2: sx2, y2: sy2,
        label: `${dist.toFixed(2)} m`,
        lx: midX + ox, ly: midY + oy, angle,
      });
    }
  }

  const viewBox = `0 0 ${width} ${height}`;
  return { d: d.trim(), width, height, viewBox, dimLines, meterToSvg };
}

// ================================================================
// deslocamento paralelo de linha (usa metros reais → pixels via meterToSvg)
// ================================================================
function offsetLineSegmentByMeters(
  dim: { x1: number; y1: number; x2: number; y2: number },
  offsetMeters: number,
  direction: 1 | -1,
  meterToSvg: number
) {
  // vetor da aresta em SVG
  const dx = dim.x2 - dim.x1;
  const dy = dim.y2 - dim.y1;
  const len = Math.hypot(dx, dy) || 1;

  // normal unitária em SVG (perpendicular à aresta)
  const nx = -dy / len;
  const ny = dx / len;

  // converter metros → pixels usando a escala uniforme
  const offsetPx = offsetMeters * meterToSvg;

  const ox = nx * offsetPx * direction;
  const oy = ny * offsetPx * direction;

  return {
    x1: dim.x1 + ox,
    y1: dim.y1 + oy,
    x2: dim.x2 + ox,
    y2: dim.y2 + oy,
  };
}

// ================================================================
// componente principal
// ================================================================
export default function LoteSVGComCotas({
  svgSize = 1200,
}: {
  svgSize?: number;
}) {
  const { ifiscal } = useLoteBusca();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [svgData, setSvgData] = useState<any>(null);
  const [attrs, setAttrs] = useState<Record<string, any> | null>(null);
  const [mostrarCotas, setMostrarCotas] = useState(true);

  // linhas duplicadas e direção
  const [duplicatedLines, setDuplicatedLines] = useState<any[]>([]);
  const [direction, setDirection] = useState<1 | -1>(1);

  useEffect(() => {
    const run = async () => {
      setError(null);
      setSvgData(null);
      setAttrs(null);
      setDuplicatedLines([]); // limpa linhas duplicadas ao trocar IF

      if (!ifiscal) return;

      setLoading(true);
      try {
        const where = `gtm_ind_fiscal='${ifiscal}'`;
        const url = `https://geocuritiba.ippuc.org.br/server/rest/services/GeoCuritiba/Publico_GeoCuritiba_MapaCadastral/MapServer/15/query?where=${encodeURIComponent(
          where
        )}&outFields=gtm_ind_fiscal,gtm_num_predial,gtm_nm_logradouro,gtm_nm_bairro&returnGeometry=true&outSR=4326&f=json`;

        const res = await fetch(url);
        const data: EsriQueryResponse = await res.json();

        if (!data.features?.length) {
          setError("Lote não encontrado na camada 15.");
          return;
        }

        const feature = data.features[0];
        const geometry = feature.geometry;
        if (!geometry?.rings?.length) {
          setError("Geometria não disponível para este lote.");
          return;
        }

        // 🚀 Agora projetando em METROS (mantém escala real)
        const { d, viewBox, width, height, dimLines, meterToSvg } = toSvgPathFromRings(
          geometry.rings,
          { width: svgSize, height: svgSize, padding: 16, svgSize }
        );

        setSvgData({ d, viewBox, width, height, dimLines, meterToSvg });
        setAttrs(feature.attributes ?? null);
      } catch (e) {
        console.error(e);
        setError("Erro ao converter o lote para SVG.");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [ifiscal, svgSize]);

  // ================================================================
  // Função: duplicar linha clicada (agora 5 m reais!)
  // ================================================================
  function handleLineClick(dim: any) {
    if (!svgData?.meterToSvg) return;
    const offsetMeters = 5;
    const duplicated = offsetLineSegmentByMeters(dim, offsetMeters, direction, svgData.meterToSvg);
    setDuplicatedLines((prev) => [...prev, duplicated]);
  }

  // ================================================================
  // Renderização
  // ================================================================
  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {ifiscal ? (
            <>
              Indicação Fiscal:{" "}
              <span className="font-medium text-foreground">{ifiscal}</span>
            </>
          ) : (
            "Informe uma Indicação Fiscal para gerar o SVG."
          )}
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => setDirection((d) => (d === 1 ? -1 : 1))}
            variant="outline"
          >
            Direção: {direction === 1 ? "→ fora" : "← dentro"}
          </Button>

          <Button
            onClick={() => setDuplicatedLines([])}
            variant="outline"
            disabled={!duplicatedLines.length}
          >
            Limpar Linhas
          </Button>

          <Button
            onClick={() => setMostrarCotas((prev) => !prev)}
            disabled={!svgData}
            variant="outline"
          >
            {mostrarCotas ? "Ocultar Cotas" : "Exibir Cotas"}
          </Button>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-4 flex justify-center h-[1000px]">
        {loading && <div className="text-sm text-muted-foreground">Gerando SVG…</div>}
        {error && <div className="text-sm text-destructive">{error}</div>}

        {!loading && !error && svgData && (
          <div className="flex flex-col items-center gap-2">
            <svg
              viewBox={svgData.viewBox}
              width={svgData.width}
              height={svgData.height}
              className="w-full max-w-[900px] aspect-square"
              aria-label="Lote em SVG"
            >
              {/* lote original */}
              <g fill="none" stroke="black" strokeWidth={2} fillRule="evenodd">
                <path d={svgData.d} />
              </g>

              {/* cotas */}
              {mostrarCotas && (
                <g stroke="gray" strokeWidth={1}>
                  {svgData.dimLines.map((dim: any, i: number) => (
                    <g key={i}>
                      <line
                        x1={dim.x1}
                        y1={dim.y1}
                        x2={dim.x2}
                        y2={dim.y2}
                        stroke="gray"
                        strokeDasharray="4 2"
                        opacity="0.6"
                      />
                      <text
                        x={dim.lx}
                        y={dim.ly}
                        fontSize={Math.max(svgData.width / 60, 10)}
                        textAnchor="middle"
                        fill="white"
                        className="select-none"
                        transform={`rotate(${dim.angle}, ${dim.lx}, ${dim.ly})`}
                      >
                        {dim.label}
                      </text>
                    </g>
                  ))}
                </g>
              )}

              {/* Linhas duplicadas (offset em 5m reais) */}
              <g>
                {duplicatedLines.map((line, i) => (
                  <line
                    key={`dup-${i}`}
                    x1={line.x1}
                    y1={line.y1}
                    x2={line.x2}
                    y2={line.y2}
                    stroke="red"
                    strokeDasharray="3 2"
                    strokeWidth={0.5}
                  />
                ))}
              </g>

              {/* Arestas clicáveis (hit-area) */}
              <g>
                {svgData.dimLines.map((dim: any, i: number) => (
                  <line
                    key={`click-${i}`}
                    x1={dim.x1}
                    y1={dim.y1}
                    x2={dim.x2}
                    y2={dim.y2}
                    stroke="transparent"
                    strokeWidth={16}
                    style={{ cursor: "pointer" }}
                    onClick={() => handleLineClick(dim)}
                  />
                ))}
              </g>
            </svg>

            {attrs && (
              <div className="text-xs text-muted-foreground text-center">
                {attrs.gtm_nm_logradouro
                  ? `${attrs.gtm_nm_logradouro} ${
                      attrs.gtm_num_predial ? `, ${attrs.gtm_num_predial}` : ""
                    } — ${attrs.gtm_nm_bairro ?? ""}`
                  : "Lote"}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
