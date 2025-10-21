"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import { utmToLatLon } from "@/hooks/utmToLatLon";
import { useLoteBusca } from "@/context/LoteBuscaContext";
import { Button } from "../ui/button";

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

export default function Potencial() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const { ifiscal } = useLoteBusca();
  const [downloadReady, setDownloadReady] = useState(false);
  const [lotesNaVisao, setLotesNaVisao] = useState<any>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const initMap = async () => {
      try {
        if (typeof window.L === "undefined") {
          await loadScript("https://unpkg.com/leaflet@1.9.4/dist/leaflet.js");
        }
        if (typeof window.L?.esri === "undefined") {
          await loadScript("https://unpkg.com/esri-leaflet@3.0.12/dist/esri-leaflet.js");
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
            center: [-25.393154, -49.256758],
            zoom: 18,
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

          L.esri
            .dynamicMapLayer({
              url: "https://geocuritiba.ippuc.org.br/server/rest/services/GeoCuritiba/Publico_GeoCuritiba_MapaCadastral/MapServer",
              layers: [23, 15, 34],
              opacity: 0.4,
            })
            .addTo(m);

          L.control.zoom({ position: "topright" }).addTo(m);
          setMap(m);
          L.control.layers(null, { "Base Cartográfica": baseCartograficaLayer }).addTo(m);
        }
      } catch (err) {
        console.error("Erro ao inicializar o mapa:", err);
      }
    };
    initMap();
  }, []);

  // 🔹 Busca os lotes na visão
  useEffect(() => {
    if (!ifiscal || !map || typeof window.L?.esri === "undefined") {
      setDownloadReady(false);
      return;
    }

    map.eachLayer((layer: any) => {
      if (layer.options?.url?.includes("/MapServer/16")) {
        map.removeLayer(layer);
      }
    });

    const L = window.L;
    const highlightLayer = L.esri
      .featureLayer({
        url: "https://geocuritiba.ippuc.org.br/server/rest/services/GeoCuritiba/Publico_GeoCuritiba_MapaCadastral/MapServer/16",
        where: `gtm_ind_fiscal = '${ifiscal}'`,
        style: { color: "red", weight: 3, fillOpacity: 0.1 },
      })
      .addTo(map);

    highlightLayer.once("load", function (this: any) {
      this.query().where(`gtm_ind_fiscal = '${ifiscal}'`).bounds(async (err: any, bounds: any) => {
        if (err || !bounds?.isValid()) return;

        map.fitBounds(bounds, { maxZoom: 21 });
        const R = 6378137;
        const latLngToWebMercator = (latLng: any) => ({
          x: R * latLng.lng * (Math.PI / 180),
          y: R * Math.log(Math.tan(Math.PI / 4 + (latLng.lat * Math.PI) / 360)),
        });

        const mapBounds = map.getBounds();
        const sw = mapBounds.getSouthWest();
        const ne = mapBounds.getNorthEast();
        const extent = {
          xmin: latLngToWebMercator(sw).x,
          ymin: latLngToWebMercator(sw).y,
          xmax: latLngToWebMercator(ne).x,
          ymax: latLngToWebMercator(ne).y,
        };

        const geometry = {
          ...extent,
          spatialReference: { wkid: 102100, latestWkid: 3857 },
        };
        const geometryStr = encodeURIComponent(JSON.stringify(geometry));

        const queryUrl = `https://geocuritiba.ippuc.org.br/server/rest/services/GeoCuritiba/Publico_GeoCuritiba_MapaCadastral/MapServer/15/query?f=json&where=1%3D1&returnGeometry=true&spatialRel=esriSpatialRelIntersects&geometry=${geometryStr}&geometryType=esriGeometryEnvelope&inSR=102100&outFields=*&outSR=102100&resultOffset=0&resultRecordCount=2000`;

        try {
          const response = await fetch(queryUrl);
          const data = await response.json();
          const formatted = formatGeoJson(data);
          setLotesNaVisao(formatted);
          setDownloadReady(true);
          console.log("✅ Lotes formatados e prontos:", formatted);
        } catch (e) {
          console.error("Erro ao buscar lotes:", e);
        }
      });
    });
  }, [ifiscal, map]);

  // 🔹 Função de download do DWG
  const handleDownloadDWG = async () => {
    if (!lotesNaVisao) {
      alert("Nenhum dado disponível para exportar.");
      return;
    }

    setProcessing(true);
    try {
      // 1️⃣ Upload do JSON
      const uploadUrl =
        "https://geocuritiba.ippuc.org.br/server/rest/services/GeoCuritiba/ExportToFile/GPServer/uploads/upload?";
      const blob = new Blob([JSON.stringify(lotesNaVisao)], { type: "application/json" });
      const formData = new FormData();
      formData.append("file", blob, "dados_formatados.json");
      formData.append("f", "json");

      const uploadResponse = await fetch(uploadUrl, { method: "POST", body: formData });
      const uploadResult = await uploadResponse.json();
      const itemID = uploadResult?.item?.itemID;
      if (!itemID) throw new Error("Falha ao obter itemID.");

      console.log("✅ Upload concluído:", itemID);

      // 2️⃣ Submissão do Job
      const submitUrl =
        "https://geocuritiba.ippuc.org.br/server/rest/services/GeoCuritiba/ExportToFile/GPServer/ExportToFile/submitJob";
      const params = new URLSearchParams();
      params.append("input_json_file", JSON.stringify({ itemID }));
      params.append("Output_Type", "CAD");
      params.append("output_cad_type", "DWG_R2010");
      params.append("sr_output_wkid", "3857");
      params.append("f", "json");

      const submitResponse = await fetch(submitUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: params.toString(),
      });

      const submitResult = await submitResponse.json();
      const jobId = submitResult?.jobId;
      if (!jobId) throw new Error("Falha ao submeter job.");
      console.log("🚀 Job submetido:", jobId);

      // 3️⃣ Esperar o processamento
      const statusUrl = `https://geocuritiba.ippuc.org.br/server/rest/services/GeoCuritiba/ExportToFile/GPServer/ExportToFile/jobs/${jobId}?f=json`;
      let status = "esriJobSubmitted";
      while (["esriJobSubmitted", "esriJobExecuting", "esriJobWaiting"].includes(status)) {
        await new Promise((r) => setTimeout(r, 3000));
        const statusRes = await fetch(statusUrl);
        const statusData = await statusRes.json();
        status = statusData?.jobStatus;
        console.log("⏳ Status do job:", status);
        if (status === "esriJobFailed") throw new Error("Job falhou no servidor.");
      }

      // 4️⃣ Buscar resultado
      const resultUrl = `https://geocuritiba.ippuc.org.br/server/rest/services/GeoCuritiba/ExportToFile/GPServer/ExportToFile/jobs/${jobId}/results/output_filename?f=json`;
      const resultRes = await fetch(resultUrl);
      const resultData = await resultRes.json();
      const downloadUrl = resultData?.value?.url;

      if (downloadUrl) {
        console.log("📁 Link DWG:", downloadUrl);
        alert(`✅ Arquivo DWG pronto!\n\n${downloadUrl}`);
        window.open(downloadUrl, "_blank");
      } else {
        throw new Error("Link DWG não retornado.");
      }
    } catch (err) {
      console.error("❌ Erro durante o download DWG:", err);
      alert("Erro ao gerar o DWG. Veja o console para detalhes.");
    } finally {
      setProcessing(false);
    }
  };

  // 🔹 Download local do JSON
  const handleDownloadJSON = () => {
    if (!lotesNaVisao) return;
    const blob = new Blob([JSON.stringify(lotesNaVisao, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "features.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <div ref={mapRef} className="w-full h-[700px] drop-shadow-lg rounded border" />
      <div className="mt-4 flex justify-end gap-3">
        <Button onClick={handleDownloadJSON} disabled={!downloadReady} variant="secondary">
          Baixar JSON
        </Button>
        <Button onClick={handleDownloadDWG} disabled={!downloadReady || processing} variant="default">
          {processing ? "Gerando DWG..." : "Baixar DWG"}
        </Button>
      </div>
    </>
  );
}
