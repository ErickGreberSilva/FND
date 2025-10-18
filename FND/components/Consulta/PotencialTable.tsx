// src/components/Consulta/ResultadoLote.tsx
"use client";

import { useEffect, useState } from "react";
import { zoneamentoData } from "@/hooks/zoneamento";
import { format } from "@/hooks/formatNumber";
import { useLoteBusca } from "@/context/LoteBuscaContext";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface DadosLote {
  basico: Record<string, any>; // agora é um objeto para facilitar acesso direto
  calculo?: [string, any][];
  extra?: { title: string; data: [string, any][] }[];
}
function capitalizeWords(str: string | null | undefined): string {
  if (!str) return "—";
  return str
    .toLowerCase()
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
export default function ResultadoLote() {
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

        const basico = {
          "Indicação Fiscal": attr.gtm_ind_fiscal || "—",
          "Inscrição Imobiliária": attr.gtm_insc_imob || "—",
          Logradouro: capitalizeWords(attr.gtm_nm_logradouro),
          Número: attr.gtm_num_predial || "—",
          Bairro: capitalizeWords(attr.gtm_nm_bairro),
          CEP: "—",
        };

        let calculo: [string, any][] | undefined;
        const zona = attr.gtm_sigla_zoneamento?.trim();
        const area = parseFloat(attr.gtm_mtr_area_terreno) || 0;

        if (
          zona &&
          zoneamentoData[zona as keyof typeof zoneamentoData] &&
          area > 0
        ) {
          const [
            coef,
            taxaOcup,
            taxaPerm,
            alturaMax,
            recuo,
            areaMin,
            testadaMin,
          ] = zoneamentoData[zona as keyof typeof zoneamentoData];
          calculo = [
            [
              "Zona",
              <Badge
                key="zona"
                variant="outline"
                className="text-muted-foreground px-1.5"
              >
                {zona}
              </Badge>,
            ],
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

        let extra: { title: string; data: [string, any][] }[] = [];
        try {
          const url20 = `https://geocuritiba.ippuc.org.br/server/rest/services/GeoCuritiba/Publico_GeoCuritiba_MapaCadastral/MapServer/20/query?where=gtm_ind_fiscal='${ifiscal}'&outFields=*&f=json`;
          const res20 = await fetch(url20);
          const dadosExtra = await res20.json();
          if (dadosExtra.features?.length) {
            extra = dadosExtra.features.map((f: any, i: number) => ({
              title: `Registro ${i + 1}`,
              data: Object.entries(f.attributes).filter(
                ([k]) => !["objectid", "globalid"].includes(k)
              ),
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

  if (loading)
    return (
      <div className="p-4 text-sm text-muted-foreground">Carregando...</div>
    );
  if (error) return <div className="p-4 text-sm text-destructive">{error}</div>;
  if (!dados)
    return (
      <div className="p-4 text-sm text-muted-foreground">
        Busque um lote pela Indicação Fiscal.
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
        <div className="px-4 py-3 font-semibold border-b bg-muted/30 text-sm">
          Dados Básicos
        </div>
        <div className="flex justify-around items-center p-4 text-sm">
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {Object.entries(dados.basico).map(([campo, valor]) => (
              <div
                key={campo}
                className='class="flex justify-around items-center text-[15px]"'
              >
                <span className="font-medium text-muted-foreground">
                  {campo}:
                </span>{" "}
                <span className="text-foreground">{valor}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {dados.calculo && (
        <SeccaoTabela titulo="Cálculo de Potencial" dados={dados.calculo} />
      )}
      {dados.extra?.map((reg, i) => (
        <SeccaoTabela key={i} titulo={reg.title} dados={reg.data} />
      ))}
    </div>
  );
}

function SeccaoTabela({
  titulo,
  dados,
}: {
  titulo: string;
  dados: [string, any][];
}) {
  return (
    <>
      <div className="px-4 py-3 font-semibold border-b text-sm">{titulo}</div>
      <div className="overflow-hidden rounded-lg border">
        <div className="relative w-full overflow-x-auto">
          <Table className="w-full caption-bottom text-sm">
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead className="[&_tr]:border-b bg-muted sticky top-0 z-10">
                  Campo
                </TableHead>
                <TableHead className="[&_tr]:border-b bg-muted sticky top-0 z-10">
                  Valor
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dados.map(([campo, valor], i) => (
                <TableRow
                  key={i}
                  className="hover:bg-accent/30 transition-colors data-[state=selected]:bg-muted"
                >
                  <TableCell className="font-medium py-2.5 pl-4 text-sm text-foreground">
                    {campo}
                  </TableCell>
                  <TableCell className="py-2.5 pr-4 text-sm text-foreground">
                    {valor != null ? (
                      typeof valor === "string" || typeof valor === "number" ? (
                        String(valor)
                      ) : (
                        valor
                      )
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
}
