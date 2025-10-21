"use client";

import { useEffect, useState } from "react";
import "leaflet/dist/leaflet.css";
import { useLoteBusca } from "@/context/LoteBuscaContext";

export default function Confrontante() {
  const { ifiscal } = useLoteBusca();
  const [status, setStatus] = useState<'idle' | 'submitting' | 'processing' | 'success' | 'error'>('idle');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);

  useEffect(() => {
    if (!ifiscal) {
      setStatus('idle');
      return;
    }

    let tempUrl: string | null = null;

    const generateCroqui = async () => {
      setStatus('submitting');
      try {
        // 1️⃣ Submeter o job
        const submitUrl = `https://geocuritiba.ippuc.org.br/server/rest/services/GeoCuritiba/CROQUILOTE/GPServer/CROQUI_LOTE/submitJob?indFisc=${encodeURIComponent(ifiscal)}&escala=25&env%3AoutSR=&env%3AprocessSR=&returnZ=false&returnM=false&returnTrueCurves=false&context=&f=json`;
        const res = await fetch(submitUrl);
        const data = await res.json();
        const id = data.jobId;
        if (!id) throw new Error('Job ID não retornado');
        setJobId(id);
        setStatus('processing');

        // 2️⃣ Aguardar conclusão
        const statusUrl = `https://geocuritiba.ippuc.org.br/server/rest/services/GeoCuritiba/CROQUILOTE/GPServer/CROQUI_LOTE/jobs/${id}?f=json`;
        let jobStatus = 'esriJobSubmitted';
        while (['esriJobSubmitted', 'esriJobExecuting', 'esriJobWaiting'].includes(jobStatus)) {
          await new Promise(r => setTimeout(r, 2000));
          const statusRes = await fetch(statusUrl);
          const statusData = await statusRes.json();
          jobStatus = statusData.jobStatus;
          if (jobStatus === 'esriJobFailed') throw new Error('Job falhou');
        }

        // 3️⃣ Obter URL da imagem
        const resultUrl = `https://geocuritiba.ippuc.org.br/server/rest/services/GeoCuritiba/CROQUILOTE/GPServer/CROQUI_LOTE/jobs/${id}/results/resultado?f=pjson`;
        const resultRes = await fetch(resultUrl);
        const resultData = await resultRes.json();
        const url = resultData.value?.url?.trim();
        if (!url) throw new Error('URL da imagem não retornada');

        // 4️⃣ Baixar imagem como Blob e criar URL temporária
        const imgRes = await fetch(url);
        if (!imgRes.ok) throw new Error("Falha ao baixar a imagem");
        const imgBlob = await imgRes.blob();
        tempUrl = URL.createObjectURL(imgBlob);
        setImageUrl(tempUrl);

        setStatus('success');
      } catch (err) {
        console.error('Erro ao gerar croqui temporário:', err);
        setStatus('error');
      }
    };

    generateCroqui();

    // Limpeza: liberar URL temporária quando componente desmontar
    return () => {
      if (tempUrl) URL.revokeObjectURL(tempUrl);
    };
  }, [ifiscal]);

  if (status === 'idle') return null;
  if (status === 'submitting') return <div>Enviando solicitação...</div>;
  if (status === 'processing') return <div>Gerando croqui... (Job: {jobId})</div>;
  if (status === 'error') return <div className="text-red-500">Erro ao gerar o croqui.</div>;

  if (status === 'success' && imageUrl)
    return (
      <div className="mt-4 border rounded p-2 bg-white">
        <h3 className="font-medium mb-2">Croqui do Lote</h3>
        <img
          src={imageUrl}
          alt={`Croqui do lote ${ifiscal}`}
          className="max-w-full h-auto border mb-2"
          onError={() => setStatus('error')}
        />
        <div>
          <a
            href={imageUrl}
            download={`croqui_${ifiscal}.jpg`}
            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Download Croqui
          </a>
        </div>
      </div>
    );

  return null;
}