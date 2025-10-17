// src/components/ecommerce/ResultadoLote.tsx
'use client';

import { useEffect, useState } from 'react';
import { zoneamentoData } from '@/hooks/zoneamento';
import { format } from '@/hooks/formatNumber';
import { useLoteBusca } from '@/context/LoteBuscaContext';

interface DadosLote {
  basico: [string, any][];
  calculo?: [string, any][];
 extra?: { title: string; data: [string, any][] }[];
}

export default function PotencialTable() {
  const { ifiscal } = useLoteBusca();
  const [dados, setDados] = useState<DadosLote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!ifiscal) {
      setDados(null);
      setError(null);
      return;
    }

    const buscarDados = async () => {
      setLoading(true);
      setError(null);
      try {
        // Buscar dados principais (camada 15)
        const url15 = `https://geocuritiba.ippuc.org.br/server/rest/services/GeoCuritiba/Publico_GeoCuritiba_MapaCadastral/MapServer/15/query?where=gtm_ind_fiscal='${ifiscal}'&outFields=*&f=json`;
        const res15 = await fetch(url15);
        const dadosLote = await res15.json();

        if (!dadosLote.features?.length) {
          setError("Nenhum lote encontrado.");
          setDados(null);
          setLoading(false);
          return;
        }

        const attr = dadosLote.features[0].attributes;

        const basico: [string, any][] = [
          ["Indicação Fiscal", attr.gtm_ind_fiscal],
          ["Inscrição Imobiliária", attr.gtm_insc_imob],
          ["Logradouro", attr.gtm_nm_logradouro],
          ["Número", attr.gtm_num_predial],
        ];

        let calculo: [string, any][] | undefined;
        const zona = attr.gtm_sigla_zoneamento?.trim();
        const area = parseFloat(attr.gtm_mtr_area_terreno) || 0;

        if (zona && zoneamentoData[zona as keyof typeof zoneamentoData] && area > 0) {
          const [coef, taxaOcup, taxaPerm, alturaMax, recuo, areaMin, testadaMin] = zoneamentoData[zona as keyof typeof zoneamentoData];
          calculo = [
            ["Zona", zona],
            ["Área do Lote (m²)", format(area)],
            ["Coef. de Aproveitamento", coef],
            ["Taxa de Ocupação", `${(taxaOcup * 100).toFixed(0)}%`],
            ["Taxa de Permeabilidade", `${(taxaPerm * 100).toFixed(0)}%`],
            ["Altura Máx. (Pav)", alturaMax],
            ["Área Máx. Construída (m²)", format(area * coef)],
            ["Área Máx. Ocupada (m²)", format(area * taxaOcup)],
            ["Área Mín. Permeável (m²)", format(area * taxaPerm)],
            ["Recuo Mínimo", recuo],
            ["Área Mínima do Lote", areaMin],
            ["Testada Mínima", testadaMin],
          ];
        }

        // Dados extras (camada 20)
        let extra: {title: string; data: [string, any][] }[] = [];
        try {
          const url20 = `https://geocuritiba.ippuc.org.br/server/rest/services/GeoCuritiba/Publico_GeoCuritiba_MapaCadastral/MapServer/20/query?where=gtm_ind_fiscal='${ifiscal}'&outFields=*&f=json`;
          const res20 = await fetch(url20);
          const dadosExtra = await res20.json();
          if (dadosExtra.features?.length) {
            extra = dadosExtra.features.map((f: any, i: number) => ({
              title: `Registro ${i + 1}`,
              data: Object.entries(f.attributes),
            }));
          }
        } catch (e) {
          console.warn("Erro ao buscar dados extras", e);
        }

        setDados({ basico, calculo, extra });
      } catch (err) {
        console.error(err);
        setError("Erro ao carregar dados do lote.");
      } finally {
        setLoading(false);
      }
    };

    buscarDados();
  }, [ifiscal]);

  if (loading) return <div className="p-4 text-gray-400">Carregando...</div>;
  if (error) return <div className="p-4 text-red-400">{error}</div>;
  if (!dados) return <div className="p-4 text-gray-500">Busque um lote pela Indicação Fiscal.</div>;

  return (
    <div className="bg-gray-800 p-4 rounded space-y-6">
      <Tabela titulo="Dados Básicos" dados={dados.basico} />
      {dados.calculo && <Tabela titulo="Cálculo de Potencial" dados={dados.calculo} />}
      {dados.extra?.map((reg, i) => (
        <Tabela key={i} titulo={reg.title} dados={reg.data} />
      ))}
    </div>
  );
}

function Tabela({ titulo, dados }: { titulo: string; dados: [string, any][] }) {
  return (
    <div>
      <h3 className="font-bold text-white mb-2">{titulo}</h3>
      <table className="w-full text-sm text-gray-200">
        <tbody>
          {dados.map(([campo, valor], i) => (
            <tr key={i} className="border-b border-gray-700">
              <td className="py-1 font-medium text-gray-300">{campo}</td>
              <td className="py-1">{valor != null ? valor : ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}