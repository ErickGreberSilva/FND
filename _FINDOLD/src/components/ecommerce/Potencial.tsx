// src/components/ecommerce/MapaPotencial.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';
import { utmToLatLon } from '@/hooks/utmToLatLon';
import { useLoteBusca } from '@/context/LoteBuscaContext';

declare global {
  interface Window {
    L: any;
  }
}

export default function Potencial() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const { ifiscal } = useLoteBusca();

  // Inicializa o mapa
  useEffect(() => {
    const initMap = async () => {
      if (typeof window.L === 'undefined') {
        await Promise.all([
          new Promise((res) => {
            const s = document.createElement('script');
            s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
            s.onload = res;
            document.head.appendChild(s);
          }),
          new Promise((res) => {
            const s = document.createElement('script');
            s.src = 'https://unpkg.com/esri-leaflet@3.0.12/dist/esri-leaflet.js';
            s.onload = res;
            document.head.appendChild(s);
          }),
        ]);
      }

      if (mapRef.current && !mapRef.current.hasChildNodes()) {
        const L = window.L;
        const m = L.map(mapRef.current, {
          center: [-25.4284, -49.2733],
          zoom: 16,
          minZoom: 10,
          maxZoom: 23,
          zoomControl: false,
        });

        // Ortofotos 2019 (Web Mercator → compatível!)
        L.esri.tiledMapLayer({
          url: "https://geocuritiba.ippuc.org.br/server/rest/services/Hosted/Ortofotos2019/MapServer",
          maxZoom: 22,
        }).addTo(m);

        // Camadas cadastrais (dinâmicas, reprojetadas pelo servidor)
        L.esri.dynamicMapLayer({
          url: "https://geocuritiba.ippuc.org.br/server/rest/services/GeoCuritiba/Publico_GeoCuritiba_MapaCadastral/MapServer",
          layers: [23, 15, 34],
          opacity: 0.8,
        }).addTo(m);

        L.control.zoom({ position: 'topright' }).addTo(m);

        setMap(m);
      }
    };

    initMap();
  }, []);

  // Só centraliza o mapa no lote — NÃO processa dados!
  useEffect(() => {
    if (!ifiscal || !map) return;

    // Remove camadas anteriores de destaque
    map.eachLayer((layer: any) => {
      if (layer.options?.url?.includes('/MapServer/16')) {
        map.removeLayer(layer);
      }
    });

    // Destacar lote (camada 16)
    const highlightLayer = (window as any).L.esri.featureLayer({
      url: "https://geocuritiba.ippuc.org.br/server/rest/services/GeoCuritiba/Publico_GeoCuritiba_MapaCadastral/MapServer/16",
      where: `gtm_ind_fiscal = '${ifiscal}'`,
      style: { color: "red", weight: 3, fillOpacity: 0.1 },
    }).addTo(map);

    // Centralizar
    highlightLayer.once("load", function (this: any) {
      this.query().where(`gtm_ind_fiscal = '${ifiscal}'`).bounds((err: any, bounds: any) => {
        if (!err && bounds) {
          map.fitBounds(bounds, { maxZoom: 19 });
        }
      });
    });

    // Buscar coordenadas para marcador (opcional)
    const fetchCoords = async () => {
      try {
        const url15 = `https://geocuritiba.ippuc.org.br/server/rest/services/GeoCuritiba/Publico_GeoCuritiba_MapaCadastral/MapServer/15/query?where=gtm_ind_fiscal='${ifiscal}'&outFields=x_coord,y_coord&f=json`;
        const res = await fetch(url15);
        const data = await res.json();
        if (data.features?.[0]?.attributes) {
          const { x_coord, y_coord } = data.features[0].attributes;
          if (x_coord && y_coord) {
            const [lat, lon] = utmToLatLon(parseFloat(x_coord), parseFloat(y_coord));
            (window as any).L.marker([lat, lon])
              .addTo(map)
              .bindPopup(`Lote: ${ifiscal}`)
              .openPopup();
          }
        }
      } catch (e) {
        console.warn('Não foi possível obter coordenadas centrais');
      }
    };

    fetchCoords();
  }, [ifiscal, map]);

  return (
    <div ref={mapRef} className="w-full h-[500px] drop-shadow-lg rounded border border-b-blue-50" />
  );
}