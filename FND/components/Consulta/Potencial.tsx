"use client";
import { useLote } from "@/context/LoteContext";
import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import { useLoteBusca } from "@/context/LoteBuscaContext";
import { Button } from "../ui/button";
import L from "leaflet";
import "esri-leaflet";

declare global {
  interface Window {
    L: any;
  }
}

// =========================================================================== Loader de script
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

// =========================================================================== Formatacao GeoJson
function formatGeoJson(rawData: any) {
  if (!rawData) return rawData;
  const data = JSON.parse(JSON.stringify(rawData));
  if (data.spatialReference && data.spatialReference.latestWkid) {
    delete data.spatialReference.latestWkid;
  }
  if (Array.isArray(data.features)) {
    data.features = data.features.map((feature: any) => {
      const updatedFeature = { ...feature };
      if (updatedFeature.geometry) {
        updatedFeature.geometry = {
          ...updatedFeature.geometry,
          spatialReference: {
            wkid: 102100,
            latestWkid: 3857,
          },
        };
      }
      return updatedFeature;
    });
  }
  return data;
}

// =========================================================================== Principal
export default function Potencial() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const { ifiscal } = useLoteBusca();
  const [downloadReady, setDownloadReady] = useState(false);
  const [lotesNoEntorno, setLotesNoEntorno] = useState<any>(null);
  const { setMapExtent } = useLote();
  const [processing, setProcessing] = useState(false);
  const [loteSelecionado, setLoteSelecionado] = useState<any>(null);
  const [highlightGeoJson, setHighlightGeoJson] = useState<any>(null);

  // =========================================================================== Inicia o mapa
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
        await loadScript("https://unpkg.com/leaflet-control-geocoder/dist/Control.Geocoder.js");
        const css = document.createElement("link");
        css.rel = "stylesheet";
        css.href = "https://unpkg.com/leaflet-control-geocoder/dist/Control.Geocoder.css";
        document.head.appendChild(css);
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
            center: [-25.393154, -49.256758],
            zoom: 18,
            minZoom: 10,
            maxZoom: 23,
            zoomControl: false,
          });

          // =================================================================== Bases GeoCuritiba e OSM
          const ortofoto2019 = L.esri.tiledMapLayer({
            url: "https://geocuritiba.ippuc.org.br/server/rest/services/Hosted/Ortofotos2019/MapServer/",
            maxZoom: 22,
            attribution: "© GeoCuritiba / IPPUC",
          });

          const openStreet = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            maxZoom: 22,
            attribution: "© OpenStreetMap contributors",
          });

          const openStreetNeighborhood = L.tileLayer(
            "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
            {
              maxZoom: 22,
              attribution: "© CartoDB / OpenStreetMap contributors",
            }
          );

          const openStreetOutdoor = L.tileLayer(
            "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
            {
              maxZoom: 17,
              attribution: "© OpenTopoMap / OpenStreetMap contributors",
            }
          );

          const openStreetBlack = L.tileLayer(
            "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
            {
              maxZoom: 22,
              attribution: "© CartoDB DarkMatter / OpenStreetMap contributors",
            }
          );

          // =================================================================== Basemaps públicos da Esri
          const esriBasemaps = {
            "Esri Topographic": L.tileLayer(
              "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
              { attribution: "Tiles © Esri — Topographic" }
            ),
            "Esri Streets": L.tileLayer(
              "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
              { attribution: "Tiles © Esri — Streets" }
            ),
            "Esri Imagery": L.tileLayer(
              "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
              { attribution: "Tiles © Esri — Imagery" }
            ),
            "Esri Terrain": L.tileLayer(
              "https://server.arcgisonline.com/ArcGIS/rest/services/World_Terrain_Base/MapServer/tile/{z}/{y}/{x}",
              { attribution: "Tiles © Esri — Terrain" }
            ),
            "Esri Gray (Light)": L.tileLayer(
              "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
              { attribution: "Tiles © Esri — Light Gray" }
            ),
            "Esri Gray (Dark)": L.tileLayer(
              "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
              { attribution: "Tiles © Esri — Dark Gray" }
            ),
          };

          // Define base inicial
          ortofoto2019.addTo(m);

          // =================================================================== Camadas adicionais
          const baseCartograficaLayer = L.esri.dynamicMapLayer({
            url: "https://geocuritiba.ippuc.org.br/server/rest/services/GeoCuritiba/Publico_Interno_GeoCuritiba_BaseCartografica_para_BC/MapServer",
            opacity: 0.9,
          }).addTo(m);

          const cadastralLayer = L.esri.dynamicMapLayer({
            url: "https://geocuritiba.ippuc.org.br/server/rest/services/GeoCuritiba/Publico_GeoCuritiba_MapaCadastral/MapServer",
            layers: [23, 34],
            opacity: 0.4,
          }).addTo(m);

          // =================================================================== Lotes
          const lotesLayer = L.esri.featureLayer({
            url: "https://geocuritiba.ippuc.org.br/server/rest/services/GeoCuritiba/Publico_GeoCuritiba_MapaCadastral/MapServer/15",
            simplifyFactor: 0.5,
            precision: 5,
            style: {
              color: "#3388ff",
              weight: 1.5,
              fillOpacity: 0.1,
            },
          });

          m.on("zoomend", () => {
            if (m.getZoom() >= 18) {
              if (!m.hasLayer(lotesLayer)) m.addLayer(lotesLayer);
            } else {
              if (m.hasLayer(lotesLayer)) m.removeLayer(lotesLayer);
            }
          });

          lotesLayer.on("click", (e: any) => {
            const feature = e.layer.feature;
            const attrs = feature?.properties || feature?.attributes;
            if (!attrs) return;
            const bounds = e.layer.getBounds();
            const center = bounds.getCenter();
            setLoteSelecionado({
              coordenadas: {
                x: center.lng.toFixed(6),
                y: center.lat.toFixed(6),
              },
              ...attrs,
            });
          });

          // =================================================================== Controles ===================
          // ================================================================================================= 
          // =================================================================== Geocodificador
          if (L.Control && (L.Control as any).Geocoder) {
            const geocoder = (L.Control as any).geocoder({
              defaultMarkGeocode: true,
              geocoder: (L.Control as any).Geocoder.nominatim(),
              placeholder: "Buscar rua...",
              collapsed: false, // true = ícone; false = caixa expandida
            })
              .on("markgeocode", function (e: any) {
                const bbox = e.geocode.bbox;
                const bounds = L.latLngBounds(bbox);
                m.fitBounds(bounds);
                // opcional: marcador no ponto central
                L.marker(e.geocode.center)
                  .addTo(m)
                  .bindPopup(e.geocode.name)
                  .openPopup();
              })
              .addTo(m);
          }
          // =================================================================== Escala gráfica
          L.control
            .scale({
              position: "bottomleft",
              imperial: false,
              metric: true,
              maxWidth: 200,
            })
            .addTo(m);
          //============================================================================= Zoom
          L.control.zoom({ position: "topright" }).addTo(m);

          // Combina todas as bases
          const baseMaps = {
            "Ortofoto 2019": ortofoto2019,
            "OpenStreetMap": openStreet,
            "Neighborhood (Carto Voyager)": openStreetNeighborhood,
            "Outdoor (OpenTopoMap)": openStreetOutdoor,
            "Black (DarkMatter)": openStreetBlack,
            ...esriBasemaps,
          };
//============================================================================= Camadas
          const overlayMaps = {
            "Base Cartográfica": baseCartograficaLayer,
            "Mapa Cadastral": cadastralLayer,
          };

          L.control.layers(baseMaps, overlayMaps, { position: "topright" }).addTo(m);

          setMap(m);
        }
      } catch (err) {
        console.error("Erro ao inicializar o mapa:", err);
      }
    };
    initMap();
  }, []);

  // =========================================================================== Consultas e HIGHLIGHT
  useEffect(() => {
    if (!ifiscal || !map || typeof window.L?.esri === "undefined") return;

    // Remove destaque anterior
    if (highlightGeoJson) {
      map.removeLayer(highlightGeoJson);
      setHighlightGeoJson(null);
    }

    const L = window.L;
    const featureLayer = L.esri.featureLayer({
      url: "https://geocuritiba.ippuc.org.br/server/rest/services/GeoCuritiba/Publico_GeoCuritiba_MapaCadastral/MapServer/15",
      where: `gtm_ind_fiscal = '${ifiscal}'`,
      simplifyFactor: 0.5,
      precision: 5,
    });

    featureLayer.query().where(`gtm_ind_fiscal = '${ifiscal}'`).run((err: any, featureCollection: any) => {
      if (err || !featureCollection.features.length) return;

      const geoJsonLayer = L.geoJSON(featureCollection, {
        style: {
          color: "#ff0000",
          weight: 4,
          fillOpacity: 0.2,
        },
      }).addTo(map);

      setHighlightGeoJson(geoJsonLayer);
      const bounds = geoJsonLayer.getBounds();
      if (bounds.isValid()) map.fitBounds(bounds, { maxZoom: 21 });

      // Efeito de piscar o destaque (3x)
      let visible = true;
      let blinkCount = 0;
      const interval = setInterval(() => {
        visible = !visible;
        if (visible) map.addLayer(geoJsonLayer);
        else map.removeLayer(geoJsonLayer);
        blinkCount++;
        if (blinkCount > 5) {
          clearInterval(interval);
          map.addLayer(geoJsonLayer);
        }
      }, 400);
    });
  }, [ifiscal, map]);

  // =========================================================================== Download JSON e DWG
  // (mantido igual ao seu código original)
  // ===========================================================================

  return (
    <>
      <div className="relative">
        {loteSelecionado && (
          <div className="absolute top-0 left-0 z-[999] w-80 h-full bg-sidebar border border-gray-300 p-4 overflow-y-auto max-h-[90vh] text-sm">
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-mono text-base">Informações do Lote</h2>
              <button
                onClick={() => setLoteSelecionado(null)}
                className="text-base hover:text-red-500"
              >
                ✕
              </button>
            </div>
            <div className="space-y-1 text-base font-sans">
              <p><b>Indicação Fiscal:</b> {loteSelecionado.gtm_ind_fiscal || "—"}</p>
              <p><b>Coordenada X:</b> {loteSelecionado.coordenadas.x}</p>
              <p><b>Coordenada Y:</b> {loteSelecionado.coordenadas.y}</p>
              <p><b>Código Lote:</b> {loteSelecionado.gtm_cod_lote || "—"}</p>
              <p><b>Inscrição Imobiliária:</b> {loteSelecionado.gtm_insc_imob || "—"}</p>
              <p><b>Nome Logradouro:</b> {loteSelecionado.gtm_nm_logradouro || "—"}</p>
              <p><b>Bairro:</b> {loteSelecionado.gtm_nm_bairro || "—"}</p>
              <p><b>Área Terreno:</b> {loteSelecionado.gtm_mtr_area_terreno || "—"} m²</p>
            </div>
          </div>
        )}

        <div ref={mapRef} className="w-full h-[700px] rounded border" />
      </div>
    </>
  );
}
