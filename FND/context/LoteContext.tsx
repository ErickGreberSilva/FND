'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useLoteBusca } from './LoteBuscaContext';

export interface LoteData {
  ifiscal: string;
  inscricaoImobiliaria: string;
  logradouro: string;
  numero: string;
  bairro: string;
  cep?: string;
  zona?: string;
  area?: number;
  coordenadas?: [number, number][]; // array de coordenadas (polígono)
  centro?: [number, number]; // centro aproximado
}

export interface MapExtent {
  sw: [number, number]; // canto sudoeste (lat, lng)
  ne: [number, number]; // canto nordeste (lat, lng)
}

interface LoteContextType {
  lote: LoteData | null;
  loading: boolean;
  error: string | null;
  mapExtent: MapExtent | null; // 🆕 bounding box atual do mapa
  setMapExtent: (extent: MapExtent | null) => void; // 🆕 função para atualizar
}

const LoteContext = createContext<LoteContextType | undefined>(undefined);

export function LoteProvider({ children }: { children: ReactNode }) {
  const { ifiscal } = useLoteBusca(); // 🔗 busca o valor da indicação fiscal
  const [lote, setLote] = useState<LoteData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 🆕 Estado global da extensão do mapa
  const [mapExtent, setMapExtent] = useState<MapExtent | null>(null);

  useEffect(() => {
    const buscarDadosLote = async () => {
      if (!ifiscal) {
        setLote(null);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const url = `https://geocuritiba.ippuc.org.br/server/rest/services/GeoCuritiba/Publico_GeoCuritiba_MapaCadastral/MapServer/15/query?where=gtm_ind_fiscal='${ifiscal}'&outFields=*&returnGeometry=true&f=json`;
        const res = await fetch(url);
        const data = await res.json();

        if (!data.features?.length) {
          setError('Lote não encontrado');
          setLote(null);
          setLoading(false);
          return;
        }

        const attr = data.features[0].attributes;
        const geom = data.features[0].geometry;
        const coords: [number, number][] = geom?.rings?.[0] || [];

        // Calcula o centro do lote
        const centro = coords.length
          ? ([
              coords.reduce((sum: number, c: [number, number]) => sum + c[0], 0) / coords.length,
              coords.reduce((sum: number, c: [number, number]) => sum + c[1], 0) / coords.length,
            ] as [number, number])
          : undefined;

        const loteData: LoteData = {
          ifiscal: attr.gtm_ind_fiscal,
          inscricaoImobiliaria: attr.gtm_insc_imob || '—',
          logradouro: attr.gtm_nm_logradouro || '—',
          numero: attr.gtm_num_predial || '—',
          bairro: attr.gtm_nm_bairro || '—',
          cep: '—',
          zona: attr.gtm_sigla_zoneamento || '—',
          area: attr.gtm_mtr_area_terreno || 0,
          coordenadas: coords,
          centro,
        };

        setLote(loteData);

        // Busca o CEP (camada 11)
        try {
          const urlCep = `https://geocuritiba.ippuc.org.br/server/rest/services/GeoCuritiba/Publico_GeoCuritiba_MapaCadastral/MapServer/11/query?where=gtm_cod_logradouro='${attr.gtm_cod_logradouro}'&outFields=cep_e&f=json`;
          const resCep = await fetch(urlCep);
          const dataCep = await resCep.json();

          if (dataCep.features?.length) {
            const cep = dataCep.features[0].attributes?.cep_e || '—';
            setLote((prev) => (prev ? { ...prev, cep } : prev));
          }
        } catch (e) {
          console.warn('Erro ao buscar CEP:', e);
        }
      } catch (err) {
        console.error('Erro ao buscar lote:', err);
        setError('Erro ao carregar dados do lote.');
      } finally {
        setLoading(false);
      }
    };

    buscarDadosLote();
  }, [ifiscal]); // 🔁 Atualiza automaticamente quando muda o valor de ifiscal

  return (
    <LoteContext.Provider value={{ lote, loading, error, mapExtent, setMapExtent }}>
      {children}
    </LoteContext.Provider>
  );
}

export function useLote() {
  const context = useContext(LoteContext);
  if (!context) {
    throw new Error('useLote deve ser usado dentro de um LoteProvider');
  }
  return context;
}
