// components/Consulta/mapa.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';

declare global {
  interface Window {
    L: any;
  }
}

export default function MAPA() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !mapRef.current) return;
    if (map) return; // já inicializado

    const initMap = async () => {
      // Carrega Leaflet se não estiver disponível
      if (typeof window.L === 'undefined') {
        await new Promise((resolve) => {
          const script = document.createElement('script');
          script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
          script.onload = resolve;
          document.head.appendChild(script);
        });
      }

      // Carrega esri-leaflet
      if (typeof window.L?.esri === 'undefined') {
        await new Promise((resolve) => {
          const script = document.createElement('script');
          script.src = 'https://unpkg.com/esri-leaflet@3.0.12/dist/esri-leaflet.js';
          script.onload = resolve;
          document.head.appendChild(script);
        });
      }

      const L = window.L;

      const newMap = L.map(mapRef.current!).setView([-25.44, -49.17], 15);

      // Camada base: Ortofotos 2019 (opcional, mas recomendado para contexto)
      L.esri.tiledMapLayer({
        url: "https://geocuritiba.ippuc.org.br/server/rest/services/Hosted/Ortofotos2019/MapServer"
      }).addTo(newMap);

      // Camada vetorial: Base Cartográfica (camadas selecionadas)
      L.esri.dynamicMapLayer({
        url: "https://geocuritiba.ippuc.org.br/server/rest/services/GeoCuritiba/Publico_Interno_GeoCuritiba_BaseCartografica_para_BC/MapServer",
        layers: [0, 1, 2, 3, 4], // ajuste conforme as camadas que deseja exibir
        opacity: 0.9
      }).addTo(newMap);

      setMap(newMap);
    };

    initMap();

    return () => {
      if (map) {
        map.remove();
        setMap(null);
      }
    };
  }, [map]);

  return (
    <div
      ref={mapRef}
      style={{ margin: '0 30px', height: '500px', borderRadius: '8px' }}
      className="customshadow"
    />
  );
}