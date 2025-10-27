'use client';

import { useEffect, useRef } from 'react';
import maplibregl, { Map } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useLote } from '@/context/LoteContext';

type XY = [number, number];

// Conversão EPSG:31982 (SIRGAS2000 / UTM 22S) → WGS84 (EPSG:4326)
function convertUTM31982toWGS84([x, y]: XY): [number, number] {
  const a = 6378137.0;
  const f = 1 / 298.257222101;
  const b = a * (1 - f);
  const e = Math.sqrt(1 - (b / a) ** 2);
  const e1sq = e * e / (1 - e * e);
  const k0 = 0.9996;
  const zone = 22;
  const lonOrigin = (zone - 1) * 6 - 180 + 3;

  const xAdj = x - 500000.0;
  const yAdj = y - 10000000.0;

  const m = yAdj / k0;
  const mu =
    m /
    (a *
      (1 - e ** 2 / 4 - (3 * e ** 4) / 64 - (5 * e ** 6) / 256));

  const e1 = (1 - Math.sqrt(1 - e ** 2)) / (1 + Math.sqrt(1 - e ** 2));

  const phi1 =
    mu +
    (3 * e1) / 2 * Math.sin(2 * mu) +
    (21 * e1 ** 2) / 16 * Math.sin(4 * mu) +
    (151 * e1 ** 3) / 96 * Math.sin(6 * mu);

  const n1 = a / Math.sqrt(1 - e ** 2 * Math.sin(phi1) ** 2);
  const t1 = Math.tan(phi1) ** 2;
  const c1 = e1sq * Math.cos(phi1) ** 2;
  const r1 =
    (a * (1 - e ** 2)) /
    Math.pow(1 - e ** 2 * Math.sin(phi1) ** 2, 1.5);
  const d = xAdj / (n1 * k0);

  const lat =
    phi1 -
    (n1 * Math.tan(phi1)) / r1 *
      (d ** 2 / 2 -
        ((5 + 3 * t1 + 10 * c1 - 4 * c1 ** 2 - 9 * e1sq) *
          d ** 4) /
          24 +
        ((61 + 90 * t1 + 298 * c1 + 45 * t1 ** 2 - 252 * e1sq - 3 * c1 ** 2) *
          d ** 6) /
          720);
  const lon =
    lonOrigin +
    ((d -
      ((1 + 2 * t1 + c1) * d ** 3) / 6 +
      ((5 - 2 * c1 + 28 * t1 - 3 * c1 ** 2 + 8 * e1sq + 24 * t1 ** 2) *
        d ** 5) /
        120) /
      Math.cos(phi1)) *
      (180 / Math.PI);

  const latitude = (lat * 180) / Math.PI;
  return [lon, latitude];
}

function centroid(coords: XY[]): XY | null {
  if (!coords.length) return null;
  const sumX = coords.reduce((a, [x]) => a + x, 0);
  const sumY = coords.reduce((a, [, y]) => a + y, 0);
  return [sumX / coords.length, sumY / coords.length];
}

export default function LoteExtrudeMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<Map | null>(null);
  const { lote } = useLote();

  // Inicializa o mapa 3D com estilo OpenFreeMap (Neighbourhood Roads)
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: 'https://tiles.openfreemap.org/styles/liberty', // estilo vizinhança
      center: [-49.27, -25.43], // Curitiba
      zoom: 14.5,
      pitch: 45,
      bearing: 20,
      // @ts-expect-error
      antialias: true,
    });

    mapRef.current = map;

    // Controle de navegação (zoom + orientação)
    map.addControl(new maplibregl.NavigationControl(), 'top-right');

    return () => map.remove();
  }, []);

  // Adiciona o extrude do lote pesquisado
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !lote?.coordenadas?.length) return;

    if (map.getLayer('lote-extrude')) map.removeLayer('lote-extrude');
    if (map.getSource('lote')) map.removeSource('lote');

    const coordsWGS84 = lote.coordenadas.map(convertUTM31982toWGS84);
    const geojson: GeoJSON.FeatureCollection<GeoJSON.Polygon> = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { ...lote },
          geometry: {
            type: 'Polygon',
            coordinates: [coordsWGS84],
          },
        },
      ],
    };

    map.addSource('lote', { type: 'geojson', data: geojson });

    // Extrude verde
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
        'fill-extrusion-opacity': 0.9,
      },
    });

    const centro = centroid(coordsWGS84);
    if (centro) {
      console.log('🎯 Centrando em', centro);
      map.flyTo({
        center: centro,
        zoom: 18,
        speed: 0.8,
        curve: 1.2,
      });
    }
  }, [lote]);

  return (
    <div
      ref={mapContainer}
      className="w-full h-[700px] rounded-md shadow-md border border-gray-300"
    />
  );
}
