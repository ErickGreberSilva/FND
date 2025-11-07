"use client";

import { useEffect, useState } from "react";

interface ZonaData {
  titulo: string;
  idTabela: string;
  habitacionais: string[][];
  naoHabitacionais: string[][];
  notas: string[];
}

export default function ZoneamentoPage() {
  const [zonas, setZonas] = useState<Record<string, ZonaData>>({});

  useEffect(() => {
    fetch("/quadros_zoneamento_formatado.json")
      .then((res) => res.json())
      .then((data) => setZonas(data))
      .catch((err) => console.error("Erro ao carregar JSON:", err));
  }, []);

  if (!zonas || Object.keys(zonas).length === 0) {
    return (
      <div className="lato-regular flex items-center justify-center h-screen text-muted-foreground">
        Carregando quadros de zoneamento...
      </div>
    );
  }

  return (
    <div className="lato-regular p-6 space-y-10">
      <h1 className="lato-regular text-2xl font-bold mb-2 text-foreground antialiased">
        Quadros de Zoneamento
      </h1>
      <p className="text-sm text-muted-foreground mb-6">
        Fonte: Lei nº 15.511/2019 – Atualizada em 19/11/2019
      </p>

      {Object.entries(zonas).map(([key, dados]) => (
        <div
          key={key}
          className="p-0 antialiased overflow-x-auto mb-3 mt-8 shadow-sm rounded-lg border bg-background"
          id={dados.idTabela}
        >
          {/* ===== TÍTULO ===== */}
          <h5 className="lato-regular bg-muted/50 rounded-t-lg shadow-md border-b font-sans font-semibold text-[16px] p-2 flex justify-between items-center">
            <span>{dados.titulo}</span>
            <span className="text-xs text-muted-foreground font-mono">{key}</span>
          </h5>

          {/* ===== TABELA PRINCIPAL ===== */}
          <table className=" w-full border-collapse border-b lato-regular text-[14px]">
            <thead>
              <tr className="lato-regular bg-muted text-foreground">
                <th className="p-2 text-left">Usos</th>
                <th className="p-2 text-left">Permissíveis</th>
                <th className="p-2 text-left">CA Básico</th>
                <th className="p-2 text-left">Altura (pav.)</th>
                <th className="p-2 text-left">Porte (m²)</th>
                <th className="p-2 text-left">Taxa Ocupação</th>
                <th className="p-2 text-left">Recuo</th>
                <th className="p-2 text-left">Permeabilidade</th>
                <th className="p-2 text-left">Afastamento</th>
                <th className="p-2 text-left">Lote Padrão</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border rounded-2xl">
              {/* ==================== HABITACIONAIS ==================== */}
              <tr>
                <th
                  colSpan={10}
                  className="text-left bg-muted font-semibold p-2 border-b border-t"
                >
                  Usos Habitacionais
                </th>
              </tr>

              {dados.habitacionais?.map((linha, i) => (
                <tr
                  key={`hab-${i}`}
                  className="hover:bg-accent/30 transition-colors"
                >
                  {linha.map((col, j) => (
                    <td key={j} className="p-2 text-foreground align-top">
                      {col || "—"}
                    </td>
                  ))}
                </tr>
              ))}

              {/* ==================== NÃO HABITACIONAIS ==================== */}
              <tr>
                <th colSpan={10} className="${outfit.className} text-left bg-muted font-semibold p-2">
                  Usos Não Habitacionais
                </th>
              </tr>

              {dados.naoHabitacionais?.map((linha, i) => (
                <tr
                  key={`nao-${i}`}
                  className="hover:bg-accent/30 transition-colors"
                >
                  {linha.map((col, j) => (
                    <td key={j} className="p-2 text-foreground valign-top">
                      {col || "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>

          {/* ==================== OBSERVAÇÕES ==================== */}
          {dados.notas && dados.notas.length > 0 && (
            <div className="${outfit.className} border-t border-border bg-muted/30 p-4 text-sm rounded-b-lg">
              <p className="font-semibold mb-3 text-foreground">Observações:</p>

              <table className="w-full border-collapse font-sans text-[13px]">
                <tbody>
                  {dados.notas.map((nota, i) => (
                    <tr key={i} className="align-text-top ">
                      {/* Numeração fixa e alinhada à esquerda */}
                      <td className="font-semibold text-foreground w-8  text-left align-text-top ">
                        ({i + 1})
                      </td>
                      {/* Texto com padding consistente */}
                      <td className="text-muted-foreground leading-none ">
                        {nota}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
