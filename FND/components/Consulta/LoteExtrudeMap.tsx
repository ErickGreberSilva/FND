'use client';

import { useEffect, useRef } from 'react';
import maplibregl, { Map } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useLote } from '@/context/LoteContext';

type XY = [number, number];

function logStep(label: string, data: any) {
  // Logs organizados no console
  try {
    console.group(`🔎 ${label}`);
    console.log(data);
    if (Array.isArray(data) && data.length) {
      const sample = data.slice(0, 5);
      console.table(sample);
    }
    console.groupEnd();
  } catch {
    // evita quebrar caso algo no console falhe
  }
}

// ============================ CONVERSÕES ============================

// WGS84 já está ok (lon, lat em graus)
function isLikelyWGS84(coords: XY[]): boolean {
  // Se todos os pontos tiverem lon [-180..180] e lat [-90..90], parece WGS84
  return coords.every(([x, y]) => x >= -180 && x <= 180 && y >= -90 && y <= 90);
}

// WebMercator (EPSG:3857) tipicamente |x|,|y| <= ~20037508
function isLikelyWebMercator(coords: XY[]): boolean {
  return coords.every(
    ([x, y]) => Math.abs(x) > 180 && Math.abs(y) > 90 && Math.abs(x) <= 20037508 && Math.abs(y) <= 20037508
  );
}

// UTM 22S (EPSG:31982) – típico: x entre ~150k..850k, y entre ~6.9M..7.2M (Curitiba ~7.19M)
function isLikelyUTM22S(coords: XY[]): boolean {
  return coords.every(([x, y]) => x > 100000 && x < 900000 && y > 6500000 && y < 10000000);
}

// WebMercator → WGS84
function webMercatorToWgs84([x, y]: XY): XY {
  const lon = (x / 20037508.34) * 180;
  let lat = (y / 20037508.34) * 180;
  lat = (180 / Math.PI) * (2 * Math.atan(Math.exp((lat * Math.PI) / 180)) - Math.PI / 2);
  return [lon, lat];
}

// UTM 22S → WGS84
function utm22SToLatLon([x, y]: XY): XY {
  const zoneNumber = 22;
  const isSouthernHemisphere = true;

  const a = 6378137.0; // WGS84
  const e = 0.081819191;
  const e1sq = 0.006739497;
  const k0 = 0.9996;

  const xAdjusted = x - 500000.0; // remove 500k offset
  let yAdjusted = y;
  if (isSouthernHemisphere) yAdjusted -= 10000000.0;

  const m = yAdjusted / k0;
  const mu = m / (a * (1.0 - e * e / 4.0 - (3 * e ** 4) / 64.0 - (5 * e ** 6) / 256.0));

  const phi1Rad =
    mu +
    (3 * e1sq / 2 - 27 * e1sq ** 3 / 32.0) * Math.sin(2 * mu) +
    (21 * e1sq ** 2 / 16 - 55 * e1sq ** 4 / 32.0) * Math.sin(4 * mu) +
    (151 * e1sq ** 3 / 96.0) * Math.sin(6 * mu);

  const n1 = a / Math.sqrt(1 - e ** 2 * Math.sin(phi1Rad) ** 2);
  const t1 = Math.tan(phi1Rad) ** 2;
  const c1 = e1sq * Math.cos(phi1Rad) ** 2;
  const r1 = (a * (1 - e ** 2)) / Math.pow(1 - e ** 2 * Math.sin(phi1Rad) ** 2, 1.5);
  const d = xAdjusted / (n1 * k0);

  const lat =
    phi1Rad -
    (n1 * Math.tan(phi1Rad) / r1) *
      (d ** 2 / 2 -
        ((5 + 3 * t1 + 10 * c1 - 4 * c1 ** 2 - 9 * e1sq) * d ** 4) / 24 +
        ((61 + 90 * t1 + 298 * c1 + 45 * t1 ** 2 - 252 * e1sq - 3 * c1 ** 2) * d ** 6) / 720);
  const lon =
    (d -
      ((1 + 2 * t1 + c1) * d ** 3) / 6 +
      ((5 - 2 * c1 + 28 * t1 - 3 * c1 ** 2 + 8 * e1sq + 24 * t1 ** 2) * d ** 5) / 120) /
      Math.cos(phi1Rad);

  const lonOrigin = (zoneNumber - 1) * 6 - 180 + 3;
  const latitude = lat * (180 / Math.PI);
  const longitude = lonOrigin + lon * (180 / Math.PI);
  return [longitude, latitude];
}

// Detecta CRS e normaliza todas as coords para WGS84
function normalizeToWGS84(coords: XY[]): { coordsWGS84: XY[]; crs: 'WGS84' | 'WEBMERC' | 'UTM22S' | 'UNKNOWN' } {
  if (coords.length === 0) return { coordsWGS84: [], crs: 'UNKNOWN' };

  // LOG: entrada crua
  logStep('Entrada - Coordenadas cruas (primeiros pontos)', coords.slice(0, 10));

  if (isLikelyWGS84(coords)) {
    logStep('Detecção CRS', { crs: 'WGS84' });
    return { coordsWGS84: coords, crs: 'WGS84' };
  }
  if (isLikelyWebMercator(coords)) {
    logStep('Detecção CRS', { crs: 'WEBMERC' });
    const converted = coords.map(webMercatorToWgs84);
    logStep('Convertido WEBMERC → WGS84 (amostra)', converted.slice(0, 10));
    return { coordsWGS84: converted, crs: 'WEBMERC' };
  }
  if (isLikelyUTM22S(coords)) {
    logStep('Detecção CRS', { crs: 'UTM22S' });
    const converted = coords.map(utm22SToLatLon);
    logStep('Convertido UTM22S → WGS84 (amostra)', converted.slice(0, 10));
    return { coordsWGS84: converted, crs: 'UTM22S' };
  }

  // fallback (tenta WebMercator)
  const fallback = coords.map(webMercatorToWgs84);
  logStep('CRS não detectado, usando fallback WebMercator → WGS84 (amostra)', fallback.slice(0, 10));
  return { coordsWGS84: fallback, crs: 'UNKNOWN' };
}

// Centróide simples (média dos pontos)
function centroid(coords: XY[]): XY | null {
  if (!coords.length) return null;
  const sx = coords.reduce((acc, c) => acc + c[0], 0);
  const sy = coords.reduce((acc, c) => acc + c[1], 0);
  return [sx / coords.length, sy / coords.length];
}

// Fecha o anel do polígono se não estiver fechado
function ensureClosedRing(ring: XY[]): XY[] {
  if (!ring.length) return ring;
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] === last[0] && first[1] === last[1]) return ring;
  return [...ring, first];
}

// ============================ COMPONENTE ============================

export default function LoteExtrudeMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const { lote } = useLote();

  // Init Map
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            minzoom: 0,
            maxzoom: 19,
          },
        },
        layers: [
          {
            id: 'osm-base',
            type: 'raster',
            source: 'osm',
          },
        ],
      },
      center: [-49.27, -25.43], // Curitiba approx
      zoom: 15,
      pitch: 45,
      bearing: 20,
      // @ts-expect-error (antialias não tipado no MapOptions em algumas versões)
      antialias: true,
    });

    mapRef.current = map;

    return () => map.remove();
  }, []);

  // Extrude do lote
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Limpa camadas/sources anteriores
    if (map.getLayer('lote-extrude')) map.removeLayer('lote-extrude');
    if (map.getSource('lote')) map.removeSource('lote');

    if (!lote?.coordenadas || lote.coordenadas.length === 0) {
      logStep('Aviso', 'Sem coordenadas no lote para extrusão.');
      return;
    }

    // 1) Normaliza coordenadas → WGS84
    const { coordsWGS84, crs } = normalizeToWGS84(lote.coordenadas);

    // 2) Validação pós conversão
    const invalid = coordsWGS84.some(([_lon, lat]) => lat < -90 || lat > 90);
    if (invalid) {
      logStep('Erro', 'Após conversão, algumas latitudes estão fora de [-90, 90]. Abortando.');
      return;
    }

    // 3) Fecha o anel do polígono se necessário
    const ringClosed = ensureClosedRing(coordsWGS84);

    // 4) Monta GeoJSON
    const geojson: GeoJSON.FeatureCollection<GeoJSON.Polygon> = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: {
            ifiscal: lote.ifiscal,
            zona: lote.zona,
            area: lote.area,
            crsDetectado: crs,
          },
          geometry: {
            type: 'Polygon',
            coordinates: [ringClosed],
          },
        },
      ],
    };

    logStep('GeoJSON pronto (amostra primeiro e último ponto)', {
      first: ringClosed[0],
      last: ringClosed[ringClosed.length - 1],
      crsDetectado: crs,
    });

    // 5) Adiciona source e layer
    map.addSource('lote', {
      type: 'geojson',
      data: geojson,
    });

    map.addLayer({
      id: 'lote-extrude',
      type: 'fill-extrusion',
      source: 'lote',
      paint: {
        'fill-extrusion-color': '#008236',
        'fill-extrusion-height': [
          'interpolate',
          ['linear'],
          ['zoom'],
          15,
          0,
          18,
          (lote.area || 100) / 10,
        ],
        'fill-extrusion-opacity': 0.8,
      },
    });

    // 6) Centraliza no centróide (recalculado em WGS84)
    const centro = centroid(coordsWGS84);
    logStep('Centróide (WGS84) para flyTo', centro);

    if (centro) {
      map.flyTo({
        center: centro,
        zoom: 18,
        speed: 0.8,
        curve: 1.2,
        essential: true,
      });
    } else {
      logStep('Aviso', 'Não foi possível calcular centróide, mantendo centro padrão.');
    }
  }, [lote]);

  return <div ref={mapContainer} className="w-full h-[700px] rounded-md shadow-md border" />;
}
