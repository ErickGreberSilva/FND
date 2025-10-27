// "use client";

// import { useEffect, useRef, useState } from "react";
// import maplibregl, { Map, StyleSpecification } from "maplibre-gl";
// import "maplibre-gl/dist/maplibre-gl.css"; // ✅ Caminho correto
// import { layers, namedFlavor } from "@protomaps/basemaps";

// export default function ProtomapsMap() {
//   const mapRef = useRef<HTMLDivElement>(null);
//   const [map, setMap] = useState<Map | null>(null);
//   const [flavor, setFlavor] = useState<"light" | "dark" | "grey" | "white">("light");

//   // === Inicializa o mapa ===
//   useEffect(() => {
//     if (!mapRef.current) return;

    

//     const m = new maplibregl.Map({
//       container: mapRef.current,
//       center: [-49.2733, -25.4284], // 🟢 Curitiba
//       zoom: 13,
//       style: "https://api.protomaps.com/styles/v5/dark/en.json?key=1decd02ca4ec5ee3",
      
//     });

//     // Controles nativos (zoom)
//     m.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

//     setMap(m);

//     return () => {
//       m.remove();
//     };
//   }, []);

//   // === Atualiza flavor dinamicamente ===
//   useEffect(() => {
//     if (!map) return;

//     const newStyle = "https://api.protomaps.com/styles/v5/dark/en.json?key=1decd02ca4ec5ee3"

//     map.setStyle(newStyle);
//   }, [map]);

//   return (
//     <div className="relative w-full h-[700px] border rounded-lg overflow-hidden">
//       {/* Contêiner do mapa */}
//       <div ref={mapRef} className="w-full h-full" />

//       {/* Controle de estilo (flavor) */}
//       <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-md p-2 rounded-md shadow-md flex gap-2 z-[1000]">
//         {(["light", "dark", "grey", "white"] as const).map((f) => (
//           <button
//             key={f}
//             onClick={() => setFlavor(f)}
//             className={`px-3 py-1 rounded text-sm font-medium ${
//               flavor === f
//                 ? "bg-green-700 text-white"
//                 : "bg-gray-200 hover:bg-gray-300 text-gray-800"
//             }`}
//           >
//             {f}
//           </button>
//         ))}
//       </div>
//     </div>
//   );
// }
"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl, { Map } from "maplibre-gl";
import type { StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

import { layers, namedFlavor } from "@protomaps/basemaps";

type Flavor = "light" | "dark" | "grayscale" | "white";

const API_KEY = "1decd02ca4ec5ee3";
// TileJSON endpoint (tiles)
const TILES_URL = `https://api.protomaps.com/tiles/v4.json?key=${API_KEY}`;

function makeStyle(flavor: Flavor): StyleSpecification {
  // sprite conforme flavor (v4)
  const spriteBase = "https://protomaps.github.io/basemaps-assets/sprites/v4";
  const spriteUrl = `${spriteBase}/${flavor}`;

  // Style MapLibre v8
  const style: StyleSpecification = {
    version: 8 as 8,
    glyphs:
      "https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf",
    sprite: spriteUrl,
    sources: {
      protomaps: {
        type: "vector",
        // ✅ usa o TileJSON da API (tiles), não style JSON
        url: TILES_URL,
        attribution:
          '<a href="https://protomaps.com">Protomaps</a> © <a href="https://openstreetmap.org">OpenStreetMap</a>',
      } as any, // (evita ruído de tipagem estrita em algumas versões)
    },
    // Gera as camadas para o source "protomaps" com o flavor escolhido
    layers: layers("protomaps", namedFlavor(flavor), {
      lang: "pt", // mude para "en" se quiser
    }) as any,
  };

  return style;
}

export default function ProtomapsAPIMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<Map | null>(null);
  const [flavor, setFlavor] = useState<Flavor>("light");
  const [zoom, setZoom] = useState(12);

  // Inicializa o mapa
  useEffect(() => {
    if (!mapRef.current) return;

    const m = new maplibregl.Map({
      container: mapRef.current,
      style: makeStyle(flavor), // 🔹 monta style a partir dos tiles
      center: [-49.2733, -25.4284], // Curitiba
      zoom,
      pitch: 0,
      bearing: 0,
    });

    m.addControl(new maplibregl.NavigationControl({ showCompass: true }), "top-right");

    m.on("zoomend", () => setZoom(m.getZoom()));
    setMap(m);

    return () => m.remove();
  }, []);

  // Atualiza o estilo ao trocar o flavor
  useEffect(() => {
    if (!map) return;
    const newStyle = makeStyle(flavor);
    map.setStyle(newStyle);
  }, [flavor, map]);

  // Atualiza zoom pelo control
  const handleZoomChange = (delta: number) => {
    if (!map) return;
    const z = Math.max(1, Math.min(22, (map.getZoom?.() ?? zoom) + delta));
    map.easeTo({ zoom: z });
  };

  return (
    <div className="relative w-full h-[700px] border rounded-lg overflow-hidden">
      <div ref={mapRef} className="w-full h-full" />

      {/* UI de controle */}
      <div className="absolute top-4 left-4 bg-sidebar-accent backdrop-blur-md p-2 rounded-md shadow-md z-[1000]">
        <div className="flex gap-2">
          {(["light", "dark", "grayscale", "white"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFlavor(f)}
              className={`px-3 py-1 rounded text-foreground text-sm font-medium ${
                flavor === f
                  ? "bg-primary text-white"
                  : "bg-card hover:bg-primary text-foreground hover:text-white"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

      </div>
    </div>
  );
}
