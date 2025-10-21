"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import { utmToLatLon } from "@/hooks/utmToLatLon";
import { useLoteBusca } from "@/context/LoteBuscaContext";

declare global {
  interface Window {
    L: any;
  }
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const s = document.createElement("script");
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

  useEffect(() => {
    const initMap = async () => {
      try {
        if (typeof window.L === "undefined") {
          await loadScript("https://unpkg.com/leaflet@1.9.4/dist/leaflet.js");
        }
        if (typeof window.L?.esri === "undefined") {
          await loadScript(
            "https://unpkg.com/esri-leaflet@3.0.12/dist/esri-leaflet.js"
          );
        }

        if (window.L && !window.L.Icon.Default.prototype._getIconUrl) {
          window.L.Icon.Default.mergeOptions({
            iconUrl: "/icon1.png",
            shadowUrl: "/icon1-sombra.png",
            iconSize: [25, 36],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [25, 36],
            shadowAnchor: [13, 41],
          });
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

          L.esri
            .tiledMapLayer({
              url: "https://geocuritiba.ippuc.org.br/server/rest/services/Hosted/Ortofotos2019/MapServer",
              maxZoom: 22,
            })
            .addTo(m);
          const baseCartograficaLayer = L.esri
            .dynamicMapLayer({
              url: "https://geocuritiba.ippuc.org.br/server/rest/services/GeoCuritiba/Publico_Interno_GeoCuritiba_BaseCartografica_para_BC/MapServer",
              opacity: 0.9,
            })
            .addTo(m);
          const greenIcon = L.icon({
            iconUrl: "/icon1.png",
            shadowUrl: "/icon1-sombra.png",
            iconSize: [25, 36],
            iconAnchor: [2, 36],
            popupAnchor: [1, -34],
            shadowSize: [39, 26],
            shadowAnchor: [2, 26],
          });
          const blueIcon = L.icon({
            iconUrl: "/icon2.png",
            shadowUrl: "/icon1-sombra.png",
            iconSize: [25, 36],
            iconAnchor: [2, 36],
            popupAnchor: [1, -34],
            shadowSize: [39, 26],
            shadowAnchor: [2, 26],
          });
          L.esri
            .dynamicMapLayer({
              url: "https://geocuritiba.ippuc.org.br/server/rest/services/GeoCuritiba/Publico_GeoCuritiba_MapaCadastral/MapServer",
              layers: [23, 15, 34],
              opacity: 0.8,
            })
            .addTo(m);
          L.marker([-25.425911, -49.271735], { icon: greenIcon })
            .addTo(m)
            .bindPopup(`Aluga-se`);
          L.marker([-25.427718, -49.27124], { icon: blueIcon })
            .addTo(m)
            .bindPopup(`Vende-se`);
          L.marker([-25.454245, -49.271484], { icon: greenIcon })
            .addTo(m)
            .bindPopup(`Vende-se`);
          L.control.zoom({ position: "topright" }).addTo(m);
          setMap(m);
          const overlays = {
            "Base Cartográfica": baseCartograficaLayer,
          };
          L.control
            .layers(null, overlays, {
              position: "topright",
              collapsed: true,
            })
            .addTo(m);
        }
      } catch (err) {
        console.error("Erro ao inicializar o mapa:", err);
      }
    };
    initMap();
  }, []);

  useEffect(() => {
    if (!ifiscal || !map || typeof window.L?.esri === "undefined") return;

    map.eachLayer((layer: any) => {
      if (layer.options?.url?.includes("/MapServer/16")) {
        map.removeLayer(layer);
      }
    });

    const L = window.L;
    var greenIcon = L.icon({
      iconUrl: "/icon1.png",
      shadowUrl: "/icon1-sombra.png",
      iconSize: [25, 36],
      iconAnchor: [2, 36],
      popupAnchor: [1, -34],
      shadowSize: [39, 26],
      shadowAnchor: [2, 26],
    });
    const highlightLayer = L.esri
      .featureLayer({
        url: "https://geocuritiba.ippuc.org.br/server/rest/services/GeoCuritiba/Publico_GeoCuritiba_MapaCadastral/MapServer/16",
        where: `gtm_ind_fiscal = '${ifiscal}'`,
        style: { color: "red", weight: 3, fillOpacity: 0.1 },
      })
      .addTo(map);

    highlightLayer.once("load", function (this: any) {
      this.query()
        .where(`gtm_ind_fiscal = '${ifiscal}'`)
        .bounds((err: any, bounds: any) => {
          if (!err && bounds.isValid()) {
            map.fitBounds(bounds, { maxZoom: 21 });
          }
        });
    });

    const fetchCoords = async () => {
      try {
        const url15 = `https://geocuritiba.ippuc.org.br/server/rest/services/GeoCuritiba/Publico_GeoCuritiba_MapaCadastral/MapServer/15/query?where=gtm_ind_fiscal='${ifiscal}'&outFields=x_coord,y_coord&f=json`;
        const res = await fetch(url15);
        const data = await res.json();
        if (data.features?.[0]?.attributes) {
          const { x_coord, y_coord } = data.features[0].attributes;
          if (x_coord && y_coord) {
            const [lat, lon] = utmToLatLon(
              parseFloat(x_coord),
              parseFloat(y_coord)
            );

            // Remove marcadores anteriores (opcional, mas recomendado)
            map.eachLayer((layer: any) => {
              if (layer instanceof L.Marker) {
                map.removeLayer(layer);
              }
            });

            // Cria marcador — usa automaticamente o ícone padrão personalizado
            L.marker([lat, lon], { icon: greenIcon })
              .addTo(map)
              .bindPopup(`Lote: ${ifiscal}`)
              .openPopup();
          }
        }
      } catch (e) {
        console.warn("Não foi possível obter coordenadas centrais:", e);
      }
    };

    fetchCoords();
  }, [ifiscal, map]);

  return (
    <div
      ref={mapRef}
      className="w-full h-[700px] drop-shadow-lg rounded border"
    />
  );
}
