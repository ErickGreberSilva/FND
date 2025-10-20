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

// Função auxiliar para carregar scripts de forma segura
function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      // Já carregado
      resolve();
      return;
    }
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(s);
  });
}

export default function Potencial() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const { ifiscal } = useLoteBusca();

  // Inicializa o mapa
  useEffect(() => {
    const initMap = async () => {
      try {
        // Carrega Leaflet e esri-leaflet se não estiverem presentes
        if (typeof window.L === 'undefined') {
          await loadScript('https://unpkg.com/leaflet@1.9.4/dist/leaflet.js');
        }
        if (typeof window.L?.esri === 'undefined') {
          await loadScript('https://unpkg.com/esri-leaflet@3.0.12/dist/esri-leaflet.js');
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

          // Ortofotos 2019 – REMOVA OS ESPAÇOS NAS URLS!
          L.esri.tiledMapLayer({
            url: "https://geocuritiba.ippuc.org.br/server/rest/services/Hosted/Ortofotos2019/MapServer",
            maxZoom: 22,
          }).addTo(m);

          // Camadas dinâmicas
          L.esri.dynamicMapLayer({
            url: "https://geocuritiba.ippuc.org.br/server/rest/services/GeoCuritiba/Publico_GeoCuritiba_MapaCadastral/MapServer",
            layers: [23, 15, 34],
            opacity: 0.8,
          }).addTo(m);
L.esri.dynamicMapLayer({
  url: "https://geocuritiba.ippuc.org.br/server/rest/services/GeoCuritiba/Publico_Interno_GeoCuritiba_BaseCartografica_para_BC/MapServer",
  opacity: 0.9,
}).addTo(m);
          L.control.zoom({ position: 'topright' }).addTo(m);
          setMap(m);
        }
      } catch (err) {
        console.error('Erro ao inicializar o mapa:', err);
      }
    };

    initMap();
  }, []);

  // Efeito de busca – agora com verificação de L.esri
  useEffect(() => {
    if (!ifiscal || !map || typeof window.L?.esri === 'undefined') return;

    // Remove camadas de destaque anteriores
    map.eachLayer((layer: any) => {
      if (layer.options?.url?.includes('/MapServer/16')) {
        map.removeLayer(layer);
      }
    });

    // Agora é seguro usar L.esri
    const L = window.L;
    const highlightLayer = L.esri.featureLayer({
      url: "https://geocuritiba.ippuc.org.br/server/rest/services/GeoCuritiba/Publico_GeoCuritiba_MapaCadastral/MapServer/16",
      where: `gtm_ind_fiscal = '${ifiscal}'`,
      style: { color: "red", weight: 3, fillOpacity: 0.1 },
    }).addTo(map);

    highlightLayer.once("load", function (this: any) {
      this.query().where(`gtm_ind_fiscal = '${ifiscal}'`).bounds((err: any, bounds: any) => {
        if (!err && bounds.isValid()) {
          map.fitBounds(bounds, { maxZoom: 19 });
        }
      });
    });

    // Buscar coordenadas (opcional)
    const fetchCoords = async () => {
      try {
        const url15 = `https://geocuritiba.ippuc.org.br/server/rest/services/GeoCuritiba/Publico_GeoCuritiba_MapaCadastral/MapServer/15/query?where=gtm_ind_fiscal='${ifiscal}'&outFields=x_coord,y_coord&f=json`;
        const res = await fetch(url15);
        const data = await res.json();
        if (data.features?.[0]?.attributes) {
          const { x_coord, y_coord } = data.features[0].attributes;
          if (x_coord && y_coord) {
            const [lat, lon] = utmToLatLon(parseFloat(x_coord), parseFloat(y_coord));
            L.marker([lat, lon])
              .addTo(map)
              .bindPopup(`Lote: ${ifiscal}`)
              .openPopup();
          }
        }
      } catch (e) {
        console.warn('Não foi possível obter coordenadas centrais:', e);
      }
    };

    fetchCoords();
  }, [ifiscal, map]);

  return (
    <div ref={mapRef} className="w-full h-[700px] drop-shadow-lg rounded border" />
  );
}