"use client";

import { useEffect, useRef, useState } from "react";
import "ol/ol.css";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import { fromLonLat, toLonLat } from "ol/proj";
import { defaults as defaultControls, ScaleLine } from "ol/control";
import OSM from "ol/source/OSM";
import XYZ from "ol/source/XYZ";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import GeoJSON from "ol/format/GeoJSON";
import { Stroke, Style } from "ol/style";

export default function MapaCuritiba() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<Map | null>(null);
  const [baseLayer, setBaseLayer] = useState("osm");
  const [cadastralVisible, setCadastralVisible] = useState(true);
  const [cadastralOpacity, setCadastralOpacity] = useState(0.7);
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    // =============================== CAMADAS BASE
    const layers: Record<string, TileLayer<any>> = {
      osm: new TileLayer({
        source: new OSM(),
        visible: true,
      }),
      satellite: new TileLayer({
        source: new XYZ({
          url: "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
        }),
        visible: false,
      }),
      topo: new TileLayer({
        source: new XYZ({
          url: "https://{a}.tile.opentopomap.org/{z}/{x}/{y}.png",
        }),
        visible: false,
      }),
      black: new TileLayer({
        source: new XYZ({
          url: "https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png",
          attributions:
            '© <a href="https://stadiamaps.com/">Stadia Maps</a>, © <a href="https://openmaptiles.org/">OpenMapTiles</a>',
        }),
        visible: false,
      }),
    };

    // =============================== CAMADA GEOJSON - MAPA CADASTRAL (GeoCuritiba)
    const cadastralSource = new VectorSource({
  format: new GeoJSON(),
  url: (extent) =>
    `https://geocuritiba.ippuc.org.br/server/rest/services/GeoCuritiba/Publico_GeoCuritiba_MapaCadastral/MapServer/0/query?` +
    new URLSearchParams({
      where: "1=1",
      outFields: "*",
      returnGeometry: "true",
      f: "geojson",
      geometry: JSON.stringify({
        xmin: extent[0],
        ymin: extent[1],
        xmax: extent[2],
        ymax: extent[3],
      }),
      geometryType: "esriGeometryEnvelope",
      spatialRel: "esriSpatialRelIntersects",
      inSR: "3857",     // ou 31982 se preferir
      outSR: "3857",
    }),
  strategy: undefined  // ou ol.loadingstrategy.bbox como alternativa
});

const cadastralLayer = new VectorLayer({
  source: cadastralSource,
  visible: cadastralVisible,
  opacity: cadastralOpacity,
  style: new Style({
    stroke: new Stroke({
      color: "rgba(0, 200, 255, 0.7)",
      width: 1,
    }),
  }),
});

    // =============================== CRIAÇÃO DO MAPA
    const mapObj = new Map({
      target: mapRef.current,
      layers: [...Object.values(layers), cadastralLayer],
      view: new View({
        center: fromLonLat([-49.271, -25.429]), // Curitiba
        zoom: 13,
        minZoom: 3,
        maxZoom: 20,
      }),
      controls: defaultControls({ zoom: true, rotate: false }).extend([
        new ScaleLine({
          units: "metric",
          bar: true,
          text: true,
          minWidth: 100,
        }),
      ]),
    });

    // =============================== EVENTO DE CLICK (MOSTRAR COORDENADAS)
    mapObj.on("click", (evt) => {
      const [lon, lat] = toLonLat(evt.coordinate);
      setCoords({
        lat: Number(lat.toFixed(6)),
        lon: Number(lon.toFixed(6)),
      });
    });

    setMap(mapObj);
    (mapObj as any).cadastralLayer = cadastralLayer;

    return () => mapObj.setTarget(undefined);
  }, []);

  // =============================== TROCA DE CAMADA BASE
  useEffect(() => {
    if (!map) return;

    map.getLayers().forEach((layerBase) => {
      const layer = layerBase as TileLayer<OSM | XYZ>;
      const source = layer.getSource();
      if (!source) return;

      if (source instanceof OSM) layer.setVisible(baseLayer === "osm");
      else if (source instanceof XYZ) {
        const urls = source.getUrls?.();
        const url = urls?.[0] || "";
        if (url.includes("google")) layer.setVisible(baseLayer === "satellite");
        else if (url.includes("opentopomap")) layer.setVisible(baseLayer === "topo");
        else if (url.includes("stadiamaps")) layer.setVisible(baseLayer === "black");
      }
    });
  }, [baseLayer, map]);

  // =============================== CONTROLE DE VISIBILIDADE E OPACIDADE
  useEffect(() => {
    if (!map) return;
    const cadastralLayer = (map as any).cadastralLayer as VectorLayer<any>;
    cadastralLayer.setVisible(cadastralVisible);
    cadastralLayer.setOpacity(cadastralOpacity);
  }, [cadastralVisible, cadastralOpacity, map]);

  return (
    <div className="relative w-full h-screen bg-background">
      {/* ========= TÍTULO ========= */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 bg-muted/70 backdrop-blur-sm px-4 py-1 rounded-md shadow-md border border-border">
        <h2 className="text-sm md:text-base font-semibold text-foreground">
          Mapa Cadastral - Curitiba
        </h2>
      </div>

      {/* ========= CONTROLES ========= */}
      <div className="absolute top-16 left-4 z-10 flex flex-col gap-3 bg-muted/60 backdrop-blur-sm p-3 rounded-lg border border-border shadow-md w-44">
        <p className="text-xs font-semibold text-foreground mb-1">
          Camadas Base:
        </p>
        {[
          { id: "osm", label: "OpenStreetMap" },
          { id: "satellite", label: "Satélite" },
          { id: "topo", label: "Topográfico" },
          { id: "black", label: "Escuro" },
        ].map((b) => (
          <button
            key={b.id}
            onClick={() => setBaseLayer(b.id)}
            className={`text-xs px-3 py-1.5 rounded-md border transition-all
              ${
                baseLayer === b.id
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-background/80 text-foreground hover:bg-accent/40 border-border"
              }`}
          >
            {b.label}
          </button>
        ))}

        <hr className="border-border/50 my-2" />

        {/* Controle do Mapa Cadastral */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-foreground">
            Mapa Cadastral:
          </label>
          <button
            onClick={() => setCadastralVisible((v) => !v)}
            className={`text-xs px-3 py-1 rounded-md border transition-all ${
              cadastralVisible
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-foreground hover:bg-accent/30 border-border"
            }`}
          >
            {cadastralVisible ? "Ocultar" : "Exibir"}
          </button>

          <label className="text-[11px] text-muted-foreground mt-1">
            Opacidade: {(cadastralOpacity * 100).toFixed(0)}%
          </label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={cadastralOpacity}
            onChange={(e) => setCadastralOpacity(parseFloat(e.target.value))}
            className="w-full accent-primary"
          />
        </div>
      </div>

      {/* ========= COORDENADAS ========= */}
      {coords && (
        <div className="absolute bottom-4 left-4 z-10 bg-muted/70 backdrop-blur-sm px-3 py-1 rounded-md border border-border shadow-sm text-xs text-foreground font-mono">
          <span>Lat: {coords.lat}</span> | <span>Lon: {coords.lon}</span>
        </div>
      )}

      {/* ========= CONTAINER DO MAPA ========= */}
      <div
        ref={mapRef}
        className="w-full h-full rounded-lg border border-border shadow-sm"
      />
    </div>
  );
}
