"use client";

import React, { JSX, useEffect, useMemo, useState } from "react";
import { useLote } from "@/context/LoteContext";

type EsriPoint = { x: number; y: number };
type EsriPolyline = { paths: number[][][] };
type EsriPolygon = { rings: number[][][] };
type EsriFeature = { attributes: Record<string, any>; geometry?: EsriPoint | EsriPolyline | EsriPolygon };
type EsriQueryResponse = { features?: EsriFeature[] };

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

const R = 6378137;
const lon2x = (lon: number) => (lon * Math.PI * R) / 180;
const lat2y = (lat: number) => R * Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));

function toExpandedWebMercatorExtent(swLat: number, swLng: number, neLat: number, neLng: number, expandFactor = 1) {
  const xmin = lon2x(swLng);
  const ymin = lat2y(swLat);
  const xmax = lon2x(neLng);
  const ymax = lat2y(neLat);
  const cx = (xmin + xmax) / 2;
  const cy = (ymin + ymax) / 2;
  const halfWidth = (xmax - xmin) / 2;
  const halfHeight = (ymax - ymin) / 2;
  return {
    xmin: cx - halfWidth * expandFactor,
    ymin: cy - halfHeight * expandFactor,
    xmax: cx + halfWidth * expandFactor,
    ymax: cy + halfHeight * expandFactor,
    spatialReference: { wkid: 102100, latestWkid: 3857 },
  };
}

function buildProjector(bbox: { minX: number; minY: number; maxX: number; maxY: number }, svgW: number, svgH: number) {
  const spanX = bbox.maxX - bbox.minX;
  const spanY = bbox.maxY - bbox.minY;
  const scale = Math.min(svgW / spanX, svgH / spanY);
  const toXY = (x: number, y: number) => {
    const sx = (x - bbox.minX) * scale;
    const sy = (bbox.maxY - y) * scale;
    return [sx, sy] as const;
  };
  return { toXY };
}

function pathsFromPolyline(pl: EsriPolyline, toXY: (x: number, y: number) => readonly [number, number]) {
  return pl.paths
    .map((path) => {
      if (!path.length) return "";
      const [x0, y0] = toXY(path[0][0], path[0][1]);
      let d = `M ${x0.toFixed(2)} ${y0.toFixed(2)}`;
      for (let i = 1; i < path.length; i++) {
        const [x, y] = toXY(path[i][0], path[i][1]);
        d += ` L ${x.toFixed(2)} ${y.toFixed(2)}`;
      }
      return d;
    })
    .join(" ");
}

async function fetchAllFeaturesPaginated(urlBase: string, delayMs = 300) {
  let allFeatures: EsriFeature[] = [];
  let offset = 0;
  const limit = 2000;
  let done = false;

  while (!done) {
    const url = `${urlBase}&resultOffset=${offset}&resultRecordCount=${limit}`;
    console.log(`📦 Buscando feições ${offset}–${offset + limit}...`);

    const res = await fetch(url);
    const data: EsriQueryResponse = await res.json();
    const feats = data.features ?? [];
    allFeatures = allFeatures.concat(feats);

    if (feats.length < limit) done = true;
    else {
      offset += limit;
      await delay(delayMs);
    }
  }

  console.log(`✅ Total de feições obtidas: ${allFeatures.length}`);
  return allFeatures;
}

export default function SVGFromMapServer({
  layerIds = [5, 14, 16, 64, 65, 72, 73, 75, 76, 77, 82, 80, 81, 83],
  width = 800,
  height = 800,
  expandFactor = 3,
}: {
  layerIds?: number[];
  width?: number;
  height?: number;
  expandFactor?: number;
}) {
  const { mapExtent } = useLote();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [featuresByLayer, setFeaturesByLayer] = useState<Record<number, EsriFeature[]> | null>(null);

  const serviceBase =
    "https://geocuritiba.ippuc.org.br/server/rest/services/GeoCuritiba/Publico_Interno_GeoCuritiba_BaseCartografica_para_BC/MapServer";

  useEffect(() => {
    const run = async () => {
      if (!mapExtent) return;
      setError(null);
      setLoading(true);

      try {
        const expandedExtent = toExpandedWebMercatorExtent(
          mapExtent.sw[0],
          mapExtent.sw[1],
          mapExtent.ne[0],
          mapExtent.ne[1],
          expandFactor
        );

        const geomParam = encodeURIComponent(JSON.stringify(expandedExtent));
        const all: Record<number, EsriFeature[]> = {};

        for (const id of layerIds) {
          const urlBase = `${serviceBase}/${id}/query?f=json&where=1%3D1&returnGeometry=true&spatialRel=esriSpatialRelIntersects&geometry=${geomParam}&geometryType=esriGeometryEnvelope&inSR=102100&outFields=*&outSR=102100`;
          const features = await fetchAllFeaturesPaginated(urlBase, 300);
          all[id] = features;
        }

        setFeaturesByLayer(all);
      } catch (e) {
        console.error(e);
        setError("Erro ao buscar feições.");
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [mapExtent, expandFactor, layerIds.join(",")]);

  const svg = useMemo(() => {
    if (!featuresByLayer || !mapExtent) return null;

    const bbox = toExpandedWebMercatorExtent(mapExtent.sw[0], mapExtent.sw[1], mapExtent.ne[0], mapExtent.ne[1], 1);
    const { toXY } = buildProjector(
      { minX: bbox.xmin, minY: bbox.ymin, maxX: bbox.xmax, maxY: bbox.ymax },
      width,
      height
    );

    // 🎨 estilos
    const layerStyle: Record<
      number,
      { fill?: string; stroke?: string; strokeWidth?: number; fillOpacity?: number; strokeDasharray?: string }
    > = {
      83: { fill: "#f9efd3" },
      81: { fill: "#e9ffbe" },
      80: { fill: "#e6e6e4" },
      82: { fill: "#ffffbe", stroke: "#ff0000", strokeWidth: 1 }, // ⬅️ novo layer 82
      77: { fill: "#a4a4a2" },
      16: { fill: "#8be8ff" },
      14: { fill: "#c9f7b8" },
      76: { stroke: "#ffffff", strokeWidth: 1, strokeDasharray: "3,3" },
      75: { stroke: "red", strokeWidth: 1 },
      64: { fill: "green", stroke: "green", fillOpacity: 0.5 },
      72: { fill: "#fbcac3", stroke: "#000000", strokeWidth: 1 },
      73: { fill: "#fbe0dc", stroke: "#000000", strokeWidth: 1 },
      65: {},
    };

    // 🧭 ordem (menor = mais baixo)
    const orderPriority = (layerId: number) => {
      if (layerId === 83) return 1;
      if (layerId === 81) return 2;
      if (layerId === 77) return 3;
      if (layerId === 82) return 4; // ⬅️ acima do 77
      if (layerId === 80) return 5;
      if (layerId === 16) return 6;
      if (layerId === 14) return 7;
      if (layerId === 76) return 8;
      if (layerId === 65) return 9;
      if (layerId === 73) return 10;
      if (layerId === 72) return 11;
      if (layerId === 64) return 12;
      if (layerId === 75) return 13;
      if (layerId === 5) return 14;
      return 20;
    };

    const orderedLayers = Object.keys(featuresByLayer)
      .map(Number)
      .sort((a, b) => orderPriority(a) - orderPriority(b));

    const layerGroups: JSX.Element[] = [];

    for (const id of orderedLayers) {
      const feats = featuresByLayer[id] ?? [];
      const style = layerStyle[id] ?? {};
      const elems: JSX.Element[] = [];

      if (id === 5) {
        // curvas
        for (const f of feats) {
          const attrs = f.attributes || {};
          const tipo = String(attrs.tipocurvanivel || "");
          const stroke =
            tipo === "Mestra" ? "#000" : tipo === "Normal" ? "#ba6b21" : "#af9b87";
          const strokeWidth = tipo === "Mestra" ? 1.2 : 0.6;
          if ((f.geometry as EsriPolyline)?.paths) {
            const d = pathsFromPolyline(f.geometry as EsriPolyline, toXY);
            elems.push(<path key={`line-5-${elems.length}`} d={d} fill="none" stroke={stroke} strokeWidth={strokeWidth} />);
          }
        }
      } else {
        for (const f of feats) {
          if (!f.geometry) continue;

          if ((f.geometry as EsriPolygon).rings) {
            const rings = (f.geometry as EsriPolygon).rings;
            const d = rings
              .map((r) => {
                if (!r.length) return "";
                const [x0, y0] = toXY(r[0][0], r[0][1]);
                let path = `M ${x0.toFixed(2)} ${y0.toFixed(2)}`;
                for (let i = 1; i < r.length; i++) {
                  const [x, y] = toXY(r[i][0], r[i][1]);
                  path += ` L ${x.toFixed(2)} ${y.toFixed(2)}`;
                }
                return path + " Z";
              })
              .join(" ");
            elems.push(
              <path
                key={`poly-${id}-${elems.length}`}
                d={d}
                fill={style.fill}
                fillOpacity={style.fillOpacity ?? 1}
                stroke={style.stroke}
                strokeWidth={style.strokeWidth ?? 0}
                strokeDasharray={style.strokeDasharray}
              />
            );
          } else if ((f.geometry as EsriPolyline).paths) {
            const d = pathsFromPolyline(f.geometry as EsriPolyline, toXY);
            elems.push(
              <path
                key={`line-${id}-${elems.length}`}
                d={d}
                fill="none"
                stroke={style.stroke}
                strokeWidth={style.strokeWidth ?? 0.8}
                strokeDasharray={style.strokeDasharray}
              />
            );
          } else if ((f.geometry as EsriPoint).x) {
            const { x, y } = f.geometry as EsriPoint;
            const [sx, sy] = toXY(x, y);
            const pointFill = id === 65 ? "#004d00" : style.fill ?? "#004d00";
            elems.push(<circle key={`pt-${id}-${elems.length}`} cx={sx} cy={sy} r={10} fill={pointFill} fillOpacity={0.5} />);
          }
        }
      }

      layerGroups.push(
        <g id={`layer-${id}`} key={`layer-${id}`} data-layer={id}>
          {elems}
        </g>
      );
    }

    return (
      <svg viewBox={`0 0 ${width} ${height}`} width={width} height={height}>
        <defs>
          <clipPath id="mapClip">
            <rect x="0" y="0" width={width} height={height} />
          </clipPath>
        </defs>

        <rect x={0} y={0} width={width} height={height} fill="white" />
        <g clipPath="url(#mapClip)">{layerGroups}</g>
        <rect x={0} y={0} width={width} height={height} fill="none" stroke="#000" strokeWidth={2} />
      </svg>
    );
  }, [featuresByLayer, mapExtent, width, height]);

  return (
    <div className="space-y-3">
      {loading && <p>⏳ Buscando feições (paginado)...</p>}
      {error && <p className="text-red-600">{error}</p>}
      {!loading && !error && svg}
    </div>
  );
}
