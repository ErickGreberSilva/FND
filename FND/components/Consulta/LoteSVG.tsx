"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useLoteBusca } from "@/context/LoteBuscaContext";
import { Button } from "@/components/ui/button";

type EsriPolygonGeometry = {
    rings: number[][][]; // [ [ [x,y], ... ], ... ]
};

type EsriFeature = {
    attributes: Record<string, any>;
    geometry?: EsriPolygonGeometry;
};

type EsriQueryResponse = {
    features?: EsriFeature[];
};

function toSvgPathFromRings(
    rings: number[][][],
    options?: { width?: number; height?: number; padding?: number }
) {
    if (!rings || rings.length === 0) return { d: "", width: 0, height: 0, viewBox: "0 0 0 0" };

    const width = options?.width ?? 512;
    const height = options?.height ?? 512;
    const padding = options?.padding ?? 16;

    // ========================================================================== BBox
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

    // =========================================================================== Evitar divisão por zero
    const spanX = Math.max(maxX - minX, 1e-9);
    const spanY = Math.max(maxY - minY, 1e-9);

    // =========================================================================== Definir área interna (após padding)
    const innerW = Math.max(width - padding * 2, 1);
    const innerH = Math.max(height - padding * 2, 1);

    // =========================================================================== Escala uniforme (preserva proporção)
    const scale = Math.min(innerW / spanX, innerH / spanY);

    // =========================================================================== Offsets para centralizar
    const scaledW = spanX * scale;
    const scaledH = spanY * scale;
    const offsetX = (width - scaledW) / 2;
    const offsetY = (height - scaledH) / 2;

    // =========================================================================== Converter pontos para coordenadas SVG (invertendo Y: lat cresce pra cima, SVG pra baixo)
    const toSvg = (x: number, y: number) => {
        const sx = offsetX + (x - minX) * scale;
        const sy = offsetY + (maxY - y) * scale; // flip Y
        return [sx, sy] as const;
    };

    // =========================================================================== Gerar path (usa evenodd pra suportar furos)
    let d = "";
    for (const ring of rings) {
        if (!ring.length) continue;
        const [mx, my] = toSvg(ring[0][0], ring[0][1]);
        d += `M ${mx.toFixed(2)} ${my.toFixed(2)} `;
        for (let i = 1; i < ring.length; i++) {
            const [px, py] = toSvg(ring[i][0], ring[i][1]);
            d += `L ${px.toFixed(2)} ${py.toFixed(2)} `;
        }
        d += "Z ";
    }

    const viewBox = `0 0 ${width} ${height}`;
    return { d: d.trim(), width, height, viewBox };
}

export default function LoteSVG({
    className,
    svgSize = 512,
}: {
    className?: string;
    svgSize?: number;
}) {
    const { ifiscal } = useLoteBusca();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [svgData, setSvgData] = useState<{ d: string; viewBox: string; width: number; height: number } | null>(null);
    const [attrs, setAttrs] = useState<Record<string, any> | null>(null);

    useEffect(() => {
        const run = async () => {
            setError(null);
            setSvgData(null);
            setAttrs(null);

            if (!ifiscal) return;

            setLoading(true);
            try {
                // =========================================================================== Retorna geometria em WGS84
                const url = `https://geocuritiba.ippuc.org.br/server/rest/services/GeoCuritiba/Publico_GeoCuritiba_MapaCadastral/MapServer/16/query?where=gtm_ind_fiscal='${encodeURIComponent(ifiscal)}'&outFields=gtm_ind_fiscal,gtm_num_predial,gtm_nm_logradouro,gtm_nm_bairro&returnGeometry=true&outSR=4326&f=json`;

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

                const { d, viewBox, width, height } = toSvgPathFromRings(geometry.rings, {
                    width: svgSize,
                    height: svgSize,
                    padding: 16,
                });

                setSvgData({ d, viewBox, width, height });
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
        const { d, viewBox } = svgData;

        const svgString = `<?xml version="1.0" encoding="UTF-8"?>
                            <svg viewBox="${viewBox}" xmlns="http://www.w3.org/2000/svg">
                            <g fill="none" stroke="black" stroke-width="2" fill-rule="evenodd">
                                <path d="${d}" />
                            </g>
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
        <div className={`w-full space-y-3 ${className ?? ""}`}>
            <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                    {ifiscal ? (
                        <>
                            Indicação Fiscal: <span className="font-medium text-foreground">{ifiscal}</span>
                        </>
                    ) : (
                        "Informe uma Indicação Fiscal para gerar o SVG."
                    )}
                </div>
                <Button
                    onClick={handleDownload}
                    disabled={!svgData || loading || !ifiscal}
                    className={!svgData || loading || !ifiscal ? "opacity-60 cursor-not-allowed" : ""}
                >
                    Baixar SVG
                </Button>
            </div>

            <div className="rounded-lg border bg-card p-4">
                {loading && <div className="text-sm text-muted-foreground">Gerando SVG…</div>}
                {error && <div className="text-sm text-destructive">{error}</div>}
                {!loading && !error && svgData && (
                    <div className="flex flex-col items-center gap-2">
                        <svg
                            viewBox={svgData.viewBox}
                            className="w-full max-w-[520px] aspect-square"
                            aria-label="Lote em SVG"
                        >
                            <g fill="none" stroke="currentColor" strokeWidth={2} fillRule="evenodd">
                                <path d={svgData.d} />
                            </g>
                        </svg>
                        {attrs && (
                            <div className="text-xs text-muted-foreground text-center">
                                {attrs.gtm_nm_logradouro ? (
                                    <>
                                        {attrs.gtm_nm_logradouro} {attrs.gtm_num_predial ? `, ${attrs.gtm_num_predial}` : ""} —{" "}
                                        {attrs.gtm_nm_bairro ?? ""}
                                    </>
                                ) : (
                                    "Lote"
                                )}
                            </div>
                        )}
                    </div>
                )}
                {!loading && !error && !svgData && ifiscal && (
                    <div className="text-sm text-muted-foreground">Nenhum SVG disponível para esta IF.</div>
                )}
            </div>
        </div>
    );
}
