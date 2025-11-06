"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useLoteBusca } from "@/context/LoteBuscaContext";
import { Button } from "@/components/ui/button";

type EsriPolygonGeometry = { rings: number[][][] };
type EsriFeature = { attributes: Record<string, any>; geometry?: EsriPolygonGeometry };
type EsriQueryResponse = { features?: EsriFeature[] };
function gerarEscalaGrafica({
    width,
    height,
    scale,
    pos = "bottom-right",
}: {
    width: number;
    height: number;
    scale: number; // metros por unidade SVG
    pos?: "bottom-right" | "bottom-left";
}) {
    const totalMetros = 10; // 10 metros no total
    const divisaoMetros = 5; // cada divisão = 5 m
    const numDivisoes = totalMetros / divisaoMetros; // 2 divisões

    const barraPixels = totalMetros / scale;
    const divisaoPixels = barraPixels / numDivisoes;

    // posição no canto inferior
    const margin = 40;
    const yBase = height - margin;
    const xBase =
        pos === "bottom-left" ? margin : width - margin - barraPixels;

    const divisores = Array.from({ length: numDivisoes }, (_, i) => ({
        x: xBase + i * divisaoPixels,
        width: divisaoPixels,
        color: i % 2 === 0 ? "black" : "white",
    }));

    return {
        xBase,
        yBase,
        barraPixels,
        divisores,
        totalMetros,
        divisaoMetros,
    };
}
function lonLatToMeters([lon, lat]: [number, number]): [number, number] {
    const R = 6378137;
    const x = (lon * Math.PI * R) / 180;
    const y = Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)) * R;
    return [x, y];
}

function distanceMeters(p1: [number, number], p2: [number, number]) {
    const [x1, y1] = lonLatToMeters(p1);
    const [x2, y2] = lonLatToMeters(p2);
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
}

function toSvgPathFromRings(
    rings: number[][][],
    options: { width?: number; height?: number; padding?: number; svgSize?: number } = {}
) {
    if (!rings || rings.length === 0)
        return { d: "", width: 0, height: 0, viewBox: "0 0 0 0", dimLines: [] };

    const width = options?.width ?? 512;
    const height = options?.height ?? 512;
    const padding = options?.padding ?? 16;
    const svgSize = options?.svgSize ?? Math.max(width, height);
    let minX = Infinity,
        maxX = -Infinity,
        minY = Infinity,
        maxY = -Infinity;

    for (const ring of rings) {
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
    const scale = Math.min(innerW / spanX, innerH / spanY);
    const scaledW = spanX * scale;
    const scaledH = spanY * scale;
    const offsetX = (width - scaledW) / 2;
    const offsetY = (height - scaledH) / 2;

    const toSvg = (x: number, y: number) => {
        const sx = offsetX + (x - minX) * scale;
        const sy = offsetY + (maxY - y) * scale;
        return [sx, sy] as const;
    };

    let d = "";
    const dimLines: {
        x1: number;
        y1: number;
        x2: number;
        y2: number;
        label: string;
        lx: number;
        ly: number;
        angle: number;
    }[] = [];

    for (const ring of rings) {
        if (!ring.length) continue;
        const [mx, my] = toSvg(ring[0][0], ring[0][1]);
        d += `M ${mx.toFixed(2)} ${my.toFixed(2)} `;
        for (let i = 1; i < ring.length; i++) {
            const [px, py] = toSvg(ring[i][0], ring[i][1]);
            d += `L ${px.toFixed(2)} ${py.toFixed(2)} `;

            // Cotas (distância entre vértices)
            const p1 = [ring[i - 1][0], ring[i - 1][1]] as [number, number];
            const p2 = [ring[i][0], ring[i][1]] as [number, number];
            const dist = distanceMeters(p1, p2);

            const [sx1, sy1] = toSvg(p1[0], p1[1]);
            const [sx2, sy2] = toSvg(p2[0], p2[1]);

            // ponto médio
            const midX = (sx1 + sx2) / 2;
            const midY = (sy1 + sy2) / 2;

            // vetor da linha
            const dx = sx2 - sx1;
            const dy = sy2 - sy1;

            // ângulo original em graus (SVG Y cresce pra baixo, então invertido)
            let angle = (Math.atan2(dy, dx) * 180) / Math.PI;

            // Normaliza o ângulo entre -180 e +180
            if (angle > 180) angle -= 360;
            if (angle < -180) angle += 360;

            // 🔁 Corrige orientação do texto (evita ficar de cabeça pra baixo)
            // Critério: se o texto está voltado para baixo (ângulo > 90° ou < -90°), rotaciona 180°
            if (angle > 90 || angle < -90) {
                angle += 180;
            }

            // Deslocamento proporcional à escala (baseado no tamanho do SVG)
            const offsetBase = svgSize / 80; // ex: 1200/80 ≈ 15 px
            const len = Math.sqrt(dx * dx + dy * dy);
            const offsetX = (-dy / len) * offsetBase;
            const offsetY = (dx / len) * offsetBase;

            // ponto deslocado (fora da linha)
            const textX = midX + offsetX;
            const textY = midY + offsetY;

            // salva cota
            dimLines.push({
                x1: sx1,
                y1: sy1,
                x2: sx2,
                y2: sy2,
                label: `${dist.toFixed(2)} m`,
                lx: textX,
                ly: textY,
                angle,
            });
        }
        d += "Z ";
    }

    const viewBox = `0 0 ${width} ${height}`;
    return { d: d.trim(), width, height, viewBox, dimLines };
}

export default function LoteSVGComCotas({
    svgSize = 1200, // tamanho interno do desenho
}: {
    svgSize?: number;
}) {
    const { ifiscal } = useLoteBusca();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [svgData, setSvgData] = useState<{
        d: string;
        viewBox: string;
        width: number;
        height: number;
        dimLines: any[];
    } | null>(null);
    const [attrs, setAttrs] = useState<Record<string, any> | null>(null);
    const [mostrarCotas, setMostrarCotas] = useState(true);

    useEffect(() => {
        const run = async () => {
            setError(null);
            setSvgData(null);
            setAttrs(null);
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
                    setError("Lote não encontrado na camada 16.");
                    return;
                }

                const feature = data.features[0];
                const geometry = feature.geometry;
                if (!geometry?.rings?.length) {
                    setError("Geometria não disponível para este lote.");
                    return;
                }

                const { d, viewBox, width, height, dimLines } = toSvgPathFromRings(
                    geometry.rings,
                    { width: svgSize, height: svgSize, padding: 16, svgSize }
                );

                setSvgData({ d, viewBox, width, height, dimLines });
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

    const fileName = useMemo(() => {
        const base = attrs?.gtm_ind_fiscal ? `lote_${attrs.gtm_ind_fiscal}` : "lote";
        return `${base}.svg`;
    }, [attrs]);

    const handleDownload = () => {
        if (!svgData) return;
        const { d, viewBox, dimLines } = svgData;

        const cotasSvg = mostrarCotas
            ? dimLines
                .map(
                    (dim) => `
      <line x1="${dim.x1}" y1="${dim.y1}" x2="${dim.x2}" y2="${dim.y2}" stroke="gray" stroke-width="1" />
      <text x="${dim.lx}" y="${dim.ly}" font-size="12" text-anchor="middle" fill="white">${dim.label}</text>
    `
                )
                .join("\n")
            : "";

        const svgString = `<?xml version="1.0" encoding="UTF-8"?>
<svg viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg">
  <g fill="none" stroke="black" stroke-width="2" fill-rule="evenodd">
    <path d="${d}" />
  </g>
  ${cotasSvg}
</svg>`;

        const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.download = fileName;
        a.href = url;
        a.click();
        URL.revokeObjectURL(url);
    };


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
                        onClick={() => setMostrarCotas((prev) => !prev)}
                        disabled={!svgData}
                        variant="outline"
                    >
                        {mostrarCotas ? "Ocultar Cotas" : "Exibir Cotas"}
                    </Button>
                    <Button
                        onClick={handleDownload}
                        disabled={!svgData || loading || !ifiscal}
                    >
                        Baixar SVG
                    </Button>
                </div>
            </div>

            <div className="rounded-lg border bg-card p-4 flex justify-center h-[1000px]">
                {loading && (
                    <div className="text-sm text-muted-foreground">Gerando SVG…</div>
                )}
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
                            <g fill="none" stroke="currentColor" strokeWidth={2} fillRule="evenodd">
                                <path d={svgData.d} />
                            </g>

                            {mostrarCotas && (
                                <g stroke="gray" strokeWidth={1}>
                                    {svgData.dimLines.map((dim, i) => (
                                        <g key={i}>
                                            {/* Linha de cota (tracejada e deslocada junto ao texto) */}
                                            <line
                                                x1={dim.x1}
                                                y1={dim.y1}
                                                x2={dim.x2}
                                                y2={dim.y2}
                                                stroke="gray"
                                                strokeDasharray="4 2"
                                                opacity="0.6"
                                            />

                                            {/* Texto da cota com rotação inteligente */}
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
                        </svg>

                        {attrs && (
                            <div className="text-xs text-muted-foreground text-center">
                                {attrs.gtm_nm_logradouro
                                    ? `${attrs.gtm_nm_logradouro} ${attrs.gtm_num_predial ? `, ${attrs.gtm_num_predial}` : ""
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
