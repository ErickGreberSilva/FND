"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

export default function MapLibre3D() {
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!mapContainer.current) return;
    if (mapRef.current) return; // evita recriação

    // Inicializa o mapa
    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: "https://tiles.openfreemap.org/styles/bright",
      center: [-25.393154, -49.256758],
      zoom: 15.5,
      pitch: 45,
      bearing: -17.6,
      canvasContextAttributes: { antialias: true },
    });

    // Armazena referência
    mapRef.current = map;

    map.on("load", () => {
      // Localiza camada de texto para inserir abaixo
      const layers = map.getStyle().layers;
      let labelLayerId: string | undefined;
      for (let i = 0; i < layers.length; i++) {
        if (
          layers[i].type === "symbol" &&
          layers[i].layout &&
          (layers[i].layout as any)["text-field"]
        ) {
          labelLayerId = layers[i].id;
          break;
        }
      }

      // Fonte de dados vetoriais
      map.addSource("openfreemap", {
        type: "vector",
        url: "https://tiles.openfreemap.org/planet",
      });

      // Adiciona camada 3D
      map.addLayer(
        {
          id: "3d-buildings",
          source: "openfreemap",
          "source-layer": "building",
          type: "fill-extrusion",
          minzoom: 15,
          filter: ["!=", ["get", "hide_3d"], true],
          paint: {
            "fill-extrusion-color": [
              "interpolate",
              ["linear"],
              ["get", "render_height"],
              0,
              "lightgray",
              200,
              "royalblue",
              400,
              "lightblue",
            ],
            "fill-extrusion-height": [
              "interpolate",
              ["linear"],
              ["zoom"],
              15,
              0,
              16,
              ["get", "render_height"],
            ],
            "fill-extrusion-base": [
              "case",
              [">=", ["get", "zoom"], 16],
              ["get", "render_min_height"],
              0,
            ],
          },
        },
        labelLayerId
      );
    });

    return () => {
      map.remove();
    };
  }, []);

  return (
    <div
      ref={mapContainer}
      className="w-full h-[600px] rounded-lg shadow border"
    />
  );
}