
"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl, { Map, StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { layers, namedFlavor } from "@protomaps/basemaps";

type Flavor = "light" | "dark" | "grayscale" | "white";
const API_KEY = "1decd02ca4ec5ee3";
const TILE_URL = `https://api.protomaps.com/tiles/v4.json?key=${API_KEY}`;

// 🧩 Função que gera o estilo MapLibre dinamicamente
function getStyle(flavor: Flavor, showLabels: boolean): StyleSpecification {
  return {
    version: 8 as 8,
    glyphs:
      "https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf",
    sprite: `https://protomaps.github.io/basemaps-assets/sprites/v4/${flavor}`,
    sources: {
      protomaps: {
        type: "vector",
        url: TILE_URL,
        attribution:
          '<a href="https://protomaps.com">Protomaps</a> © <a href="https://openstreetmap.org">OpenStreetMap</a>',
      } as any,
    },
    layers: layers("protomaps", namedFlavor(flavor), {
      lang: showLabels ? "pt" : undefined, // 🔹 labels ON/OFF
    }) as any,
  };
}

export default function ProtomapsTilesMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<Map | null>(null);
  const [flavor, setFlavor] = useState<Flavor>("light");
  const [showLabels, setShowLabels] = useState(true);

  // Inicializa o mapa
  useEffect(() => {
    if (!mapRef.current) return;

    const m = new maplibregl.Map({
      container: mapRef.current,
      style: getStyle(flavor, showLabels),
      center: [-49.2733, -25.4284], // 🟢 Curitiba
      zoom: 13,
      pitch: 0,
      bearing: 0,
    });

    m.addControl(new maplibregl.NavigationControl({ showCompass: true }), "top-right");
    setMap(m);

    return () => m.remove();
  }, []);

  // Atualiza o estilo ao trocar flavor ou showLabels
  useEffect(() => {
    if (!map) return;
    map.setStyle(getStyle(flavor, showLabels));
  }, [flavor, showLabels, map]);

  return (
    <div className="relative w-full h-[700px] border rounded-lg overflow-hidden">
      <div ref={mapRef} className="w-full h-full" />

      {/* Painel de controle */}
      <div className="absolute top-4 left-4 bg-sidebar-accent backdrop-primary-md p-3 rounded-md shadow-md z-[1000] space-y-3 ">
        <div className="flex flex-wrap gap-2">
          {(["light", "dark", "grayscale", "white"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFlavor(f)}
              className={`px-3 py-1 rounded text-sm font-medium ${
                flavor === f
                  ? "bg-primary text-white"
                  : "bg-card hover:bg-primary text-foreground hover:text-white"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <input
            id="showLabels"
            type="checkbox"
            checked={showLabels}
            onChange={(e) => setShowLabels(e.target.checked)}
            className="cursor-pointer"
          />
          <label htmlFor="showLabels" className="text-sm cursor-pointer">
            Mostrar rótulos
          </label>
        </div>
      </div>
    </div>
  );
}
