"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import { useIsMobile } from "@/hooks/use-mobile";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { useLote } from "@/context/LoteContext";

interface ValorAno {
  ano: string;
  valor: number;
}

export default function LoteValores() {
  const { lote } = useLote();
  const ifiscal = lote?.ifiscal?.trim();

  const [valores, setValores] = useState<ValorAno[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!ifiscal) return;

    const carregarValores = async () => {
      setCarregando(true);
      setErro(null);

      try {
        const resposta = await fetch(
          "https://geocuritiba.ippuc.org.br/GeoCuritibaPHP/PlantaGenericaDeValores/LotesObtemValores.php",
          {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({ indfiscal: ifiscal }),
          }
        );

        const texto = await resposta.text();
        const linhas = texto.trim().split("|").filter((l) => l);

        const anosTodos: string[] = [];
        for (let ano = 2025; ano >= 2002; ano--) anosTodos.push(ano.toString());

        const anosDesejados: string[] = [];
        for (let ano = 2020; ano <= 2025; ano++) anosDesejados.push(ano.toString());

        if (linhas.length > 0) {
          const valoresBrutos = linhas[0].split(";").filter((v) => v);
          const valoresReais = anosTodos.map((ano, i) => ({
            ano,
            valor: parseFloat(
              (valoresBrutos[anosTodos.length - 1 - i] || "0").replace(",", ".")
            ),
          }));

          const filtrados = valoresReais
            .filter((v) => anosDesejados.includes(v.ano) && v.valor > 0)
            .sort((a, b) => parseInt(a.ano) - parseInt(b.ano));

          setValores(filtrados);
        } else {
          setValores([]);
        }
      } catch (erro) {
        console.error("Erro ao buscar valores:", erro);
        setErro("Erro ao obter valores por m².");
        setValores([]);
      } finally {
        setCarregando(false);
      }
    };

    carregarValores();
  }, [ifiscal]);

  if (!ifiscal) return null;

  return (
    <div className="ordercalc mt-4">
      <h5 className="titulotabextra mb-2">Valores por m² (Localidade)</h5>

      {/* === Tabela === */}
      {carregando ? (
        <div className="p-3 text-sm text-muted-foreground">Carregando...</div>
      ) : erro ? (
        <div className="p-3 text-sm text-red-600">{erro}</div>
      ) : valores.length > 0 ? (
        <table className="ptable w-full border-collapse rounded-lg border font-sans text-[14px] shadow-sm mb-6">
          <thead>
            <tr className="bg-muted text-foreground">
              <th className="p-2 text-left">Ano</th>
              <th className="p-2 text-left">Valor (R$/m²)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border rounded-2xl">
            {[...valores].reverse().map((v) => (
              <tr key={v.ano} className="hover:bg-green-50">
                <td className="p-2">{v.ano}</td>
                <td className="p-2">R$ {v.valor.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="p-3 text-sm text-muted-foreground">
          Sem valores encontrados para o período 2020–2025.
        </div>
      )}

      {/* === Gráfico === */}
      {valores.length > 0 && (
        <Card className="@container/card mt-6 shadow-md border border-gray-200">
          <CardHeader>
            <CardTitle>Histórico de Valores (2020–2025)</CardTitle>
            <CardDescription>Variação do valor por m² no período</CardDescription>
          </CardHeader>

          <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
            <ChartContainer
              config={{
                valor: {
                  label: "Valor (R$/m²)",
                  color: "#008236", // ✅ cor institucional verde
                },
              }}
              className="aspect-auto h-[250px] w-full"
            >
              <AreaChart
                data={valores.map((v) => ({
                  ano: v.ano,
                  valor: v.valor,
                }))}
              >
                <defs>
                  {/* ✅ degradê verde suave */}
                  <linearGradient id="fillValor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#008236" stopOpacity={0.9} />
                    <stop offset="95%" stopColor="#008236" stopOpacity={0.1} />
                  </linearGradient>
                </defs>

                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="ano"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={16}
                />

                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      labelFormatter={(label, payload) => {
                        const valor = payload?.[0]?.value ?? 0;
                        return `Ano ${label} — R$ ${Number(valor).toFixed(2)}`;
                      }}
                      indicator="dot"
                    />
                  }
                />

                <Area
                  dataKey="valor"
                  type="monotone"
                  fill="url(#fillValor)"
                  stroke="#008236"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
