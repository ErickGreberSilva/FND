// src/components/MapaCuritiba.tsx
'use client';

import { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';

// Tipagem para evitar erros de L global
declare global {
  interface Window {
    L: any;
  }
}

export default function MapaPotencial() {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Carrega os scripts do Leaflet e esri-leaflet dinamicamente
    const loadScripts = async () => {
      // Verifica se já foi carregado
      if (typeof window.L === 'undefined') {
        await new Promise<void>((resolve) => {
          const leafletScript = document.createElement('script');
          leafletScript.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
          leafletScript.onload = () => resolve();
          document.head.appendChild(leafletScript);
        });

        await new Promise<void>((resolve) => {
          const esriScript = document.createElement('script');
          esriScript.src = 'https://unpkg.com/esri-leaflet@3.0.12/dist/esri-leaflet.js';
          esriScript.onload = () => resolve();
          document.head.appendChild(esriScript);
        });
      }

      // Agora cria o mapa
      if (mapRef.current && !mapRef.current.hasChildNodes()) {
        const L = window.L;

        const map = L.map(mapRef.current, {
          zoomControl: false,
          maxZoom: 30,
          minZoom: 0,
        }).setView([-25.4284, -49.2733], 15);

        // Ortofotos 2019
        L.esri.tiledMapLayer({
          url: "https://geocuritiba.ippuc.org.br/server/rest/services/Hosted/Ortofotos2019/MapServer",
          maxZoom:30,
        }).addTo(map);

        // Camadas cadastrais
        L.esri.dynamicMapLayer({
          url: "https://geocuritiba.ippuc.org.br/server/rest/services/GeoCuritiba/Publico_GeoCuritiba_MapaCadastral/MapServer",
          layers: [23, 15, 34],
          opacity: 0.8,
        }).addTo(map);

        // Camada de rótulos (layer 11)
        L.esri.dynamicMapLayer({
          url: "https://geocuritiba.ippuc.org.br/server/rest/services/GeoCuritiba/Publico_GeoCuritiba_MapaCadastral/MapServer",
          layers: [11],
          opacity: 1.0,
        }).addTo(map);

        // Limpeza (opcional)
        return () => {
          if (map) {
            map.remove();
          }
        };
      }
    };

    loadScripts();
  }, []);

  return (
    <div
      ref={mapRef}
      className="w-full h-[600px] rounded-lg border border-gray-700"
      style={{ zIndex: 0 }}
    />
  );
}