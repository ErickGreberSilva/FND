"use client";

import React from "react";
import { useLote } from "@/context/LoteContext";

const zonas = {
  ZR1: {
    titulo: "Quadro XVI - Zona Residencial 1 (ZR1)",
    idTabela: "tabela-zr1",
    habitacionais: [
      ["Habitações Unifamiliares (1)", "1", "2", "-", "50%", "5 m", "25% (2)", "-", "15 x 600"],
      ["Habitação Unifamiliar em Série (3)", "1", "2", "-", "50%", "5 m", "25% (2)", "-", ""],
    ],
    naoHabitacionais: [
      ["Comércio e Serviço Vicinal (4)", "-", "-", "100", "-", "-", "-", "-", ""],
      ["Indústria Tipo 1 (5)", "-", "-", "100", "-", "-", "-", "-", ""],
    ],
    notas: [
      "(1) Uma habitação unifamiliar por fração de 300 m².",
      "(2) Atender regulamentação específica.",
      "(3) Somente em terrenos menores que 20.000 m².",
      "(4) Somente em edificação existente.",
      "(5) Somente em edificação existente e vinculada ao uso habitacional.",
      "Fonte: Lei nº 15.511_2019 Atualizada 19.11.2019.",
    ],
  },

  ZR2: {
    titulo: "Quadro XVII - Zona Residencial 2 (ZR2)",
    idTabela: "tabela-zr2",
    habitacionais: [
      ["Habitação Unifamiliar (1)", "1", "2", "-", "50% (2)", "5 m", "25% (3)", "-", "12 x 360"],
      ["Habitação Unifamiliar em Série (4)", "1", "2", "-", "50% (2)", "5 m", "25% (3)", "-", ""],
      ["Habitação Institucional", "1", "2", "-", "50% (2)", "5 m", "25% (3)", "-", ""],
    ],
    naoHabitacionais: [
      ["Comunitário 1 (5)", "1 (6)", "2", "200", "50%", "5 m", "25% (3)", "-", ""],
      ["Comércio e Serviço Vicinal e de Bairro (5)", "1 (6)", "2", "200", "50%", "5 m", "25% (3)", "-", ""],
      ["Indústria Tipo 1 (7)", "-", "-", "200", "-", "-", "-", "-", ""],
    ],
    notas: [
      "(1) Fração mínima de 120 m² por unidade habitacional.",
      "(2) Pode chegar até 60% proporcionalmente (uma única unidade).",
      "(3) Atender regulamentação específica.",
      "(4) Apenas em lotes < 20.000 m².",
      "(5) Alvará até 400 m² com aprovação do CMU.",
      "(6) Limitado a 200 m².",
      "(7) Somente em edificação existente.",
      "Fonte: Lei nº 15.511_2019 Atualizada 19.11.2019.",
    ],
  },

  ZR3: {
    titulo: "Quadro XVIII - Zona Residencial 3 (ZR3)",
    idTabela: "tabela-zr3",
    habitacionais: [
      ["Habitação Unifamiliar (1)(2)", "1", "3 (4)", "-", "50% (2)", "5 m", "25% (3)", "(5)", "12 x 360"],
      ["Habitação Unifamiliar em Série (1)(6)", "1", "3 (4)", "-", "50% (2)", "5 m", "25% (3)", "(5)", ""],
      ["Habitação Coletiva (6)", "1", "3 (4)", "-", "50% (2)", "5 m", "25% (3)", "(5)", ""],
      ["Habitação Institucional", "1", "3 (4)", "-", "50% (2)", "5 m", "25% (3)", "(5)", ""],
      ["Habitação Transitória 1 (7)", "1", "3 (4)", "-", "50% (2)", "5 m", "25% (3)", "(5)", ""],
      ["Empreendimento Inclusivo de HIS (3)", "1", "3 (4)", "-", "50% (2)", "5 m", "25% (3)", "(5)", ""],
    ],
    naoHabitacionais: [
      ["Comunitário 1 (8)", "1 (9)", "2", "200", "50%", "5 m", "25% (3)", "-", ""],
      ["Comunitário 2 – Saúde", "1 (9)", "2", "200", "50%", "5 m", "25% (3)", "-", ""],
      ["Comércio e Serviço Vicinal e de Bairro (8)", "1 (9)", "2", "200", "50%", "5 m", "25% (3)", "-", ""],
      ["Comunitário 2 – Culto Religioso", "1", "2", "-", "50%", "5 m", "25% (3)", "-", ""],
      ["Indústria Tipo 1 (10)", "-", "-", "200", "-", "-", "-", "-", ""],
    ],
    notas: [
      "(1) Fração mínima de 120 m² por unidade habitacional.",
      "(2) Pode chegar até 60% proporcionalmente (uma única unidade).",
      "(3) Atender regulamentação específica.",
      "(4) Até 3 pavimentos com até 10 m de altura; afastamento facultado.",
      "(5) Afastamento mínimo de 2,50 m para habitação institucional.",
      "(6) Somente em terrenos < 20.000 m².",
      "(7) Apenas Apart-hotel; pode ter usos comerciais de bairro.",
      "(8) Alvará até 400 m² com aprovação do CMU.",
      "(9) Limitado a 200 m².",
      "(10) Somente em edificação existente.",
      "Fonte: Lei nº 15.511_2019 Atualizada 19.11.2019.",
    ],
  },

  "ZR3-T": {
    titulo: "Quadro XIX - Zona Residencial 3 Transição (ZR3-T)",
    idTabela: "tabela-zr3t",
    habitacionais: [
      ["Habitações Unifamiliares (1)", "", "", "", "", "", "", "Até 2 pav. = Facultado. Acima de 2 pav. = H/6.", "15 x 450"],
      ["Habitação Coletiva", "1", "4 (2)", "-", "50%", "5 m", "25% (3)", "", ""],
      ["Habitação Institucional", "1", "4 (2)", "-", "50%", "5 m", "25% (3)", "", ""],
      ["Habitação Transitória 1", "1", "4 (2)", "-", "50%", "5 m", "25% (3)", "", ""],
    ],
    naoHabitacionais: [
      ["Comunitário 1 (6)", "1 (5)", "2", "200", "50%", "5 m", "25% (3)", "-", ""],
      ["Comércio e Serviço Vicinal (6)", "1 (5)", "2", "200", "50%", "5 m", "25% (3)", "-", ""],
      ["Comunitário 2 – Ensino", "1", "2", "-", "50%", "5 m", "25% (3)", "-", ""],
      ["Indústria Tipo 1 (7)", "-", "-", "200", "-", "-", "-", "-", ""],
    ],
    notas: [
      "(1) Admitido até 3 habitações unifamiliares por lote.",
      "(2) Até 6 pavimentos junto a Eixo Nova Curitiba.",
      "(3) Atender regulamentação específica.",
      "(5) Aplicar o parâmetro mais restritivo.",
      "(6) Alvará até 400 m² com aprovação do CMU.",
      "(7) Somente alvará de licença para edificação existente.",
      "Fonte: Lei nº 15.511_2019 Atualizada 19.11.2019.",
    ],
  },

  ZR4: {
    titulo: "Parâmetros Urbanísticos - Zona Residencial 4 (ZR4)",
    idTabela: "tabela-zr4",
    habitacionais: [
      ["Habitação Unifamiliar (1)", "1", "2", "-", "50", "5", "25 (2)", "-", "15 x 450"],
      ["Habitação Coletiva", "2", "6", "-", "50", "5", "25 (2)", "Até 2 pav. = facultado. Acima de 2 pav. = H/6, mínimo 2,50 m", ""],
      ["Habitação Institucional", "2", "6", "-", "50", "5", "25 (2)", "-", ""],
      ["Habitação Transitória 1 (4)", "2", "6", "-", "50", "5", "25 (2)", "-", ""],
    ],
    naoHabitacionais: [
      ["Comunitário 1", "-", "-", "-", "-", "-", "-", "-", ""],
      ["Comércio e Serviço Vicinal", "1 (6)", "2", "200 (6)", "50", "5", "25 (2)", "-", ""],
      ["Indústria Tipo 1", "-", "-", "200", "-", "-", "-", "-", ""],
    ],
    notas: [
      "(1) Fração mínima 120 m² por unidade habitacional.",
      "(2) Atender regulamentação específica.",
      "(4) Sem centro de convenções.",
      "(6) Aplicar o parâmetro mais restritivo entre coeficiente e porte.",
      "Fonte: Lei nº 15.511_2019 Atualizada 19.11.2019.",
    ],
  },

  ZUM: {
    titulo: "Quadro XXV - Zona de Uso Misto 1 (ZUM-1)",
    idTabela: "tabela-zum1",
    habitacionais: [
      ["Habitação Unifamiliar (1)", "1", "2", "-", "50%", "5 m", "25% (2)", "-", "15 x 450"],
      ["Habitação Coletiva (3)", "1", "4", "-", "50%", "5 m", "25% (2)", "Até 2 pav. = Facultado. Acima de 2 pav. = H/6.", ""],
    ],
    naoHabitacionais: [
      ["Comunitário 1 e 2", "1", "4", "-", "50%", "5 m", "25% (2)", "Até 2 pav. = Facultado.", ""],
      ["Indústria Tipo 1 (4)", "-", "-", "400", "-", "-", "-", "-", ""],
    ],
    notas: [
      "(1) Uma habitação unifamiliar por lote.",
      "(2) Atender regulamentação específica.",
      "(4) Somente alvará de licença para edificação existente.",
      "Fonte: Lei nº 15.511_2019 Atualizada 19.11.2019.",
    ],
  },

  EAC: {
    titulo: "Quadro VIII - Eixo Presidente Affonso Camargo (EAC / Outras Vias)",
    idTabela: "tabela-eac",
    habitacionais: [
      ["Habitação Unifamiliar (1)", "1", "2", "-", "50%", "5 m", "25% (2)", "-", "15 x 450"],
      ["Habitação Coletiva", "1,5", "4", "-", "50%", "5 m", "25% (2)", "Até 2 pav.: facultado. Acima de 2 pav.: H/6.", ""],
      ["Habitação Institucional", "1,5", "4", "-", "50%", "5 m", "25% (2)", "", ""],
    ],
    naoHabitacionais: [
      ["Comércio e Serviço Vicinal", "1", "4", "-", "50%", "5 m", "25% (2)", "", ""],
      ["Indústria Tipo 1 (3)", "-", "-", "400", "-", "-", "-", "-", ""],
    ],
    notas: [
      "(1) Uma habitação unifamiliar por lote.",
      "(2) Atender regulamentação específica.",
      "(3) Somente alvará de licença para localização em edificação existente.",
      "Fonte: Lei nº 15.511_2019 Atualizada 19.11.2019.",
    ],
  },
};

export default function QuadroZoneamento() {
  const { lote } = useLote();
  const zona = lote?.zona?.trim() as keyof typeof zonas;
  if (!zona) return null;

  const dados = zonas[zona];
  if (!dados) return null;

  return (
    <div className=" p-0 overflow-x-auto mb-3 mt-8 shadow-sm rounded-lg border" id="html_zona">
      <h5 className="bg-muted/50 rounded-t-lg shadow-md border-b  font-sans font-semibold text-[16px] p-2">
        {dados.titulo}
      </h5>

      <table className="w-full border-collapse border-b font-sans text-[14px]" id={dados.idTabela}>
        <thead>
          <tr className="bg-muted text-foreground">
            <th className="p-2 text-left">Usos</th>
            <th className="p-2 text-left">Coef. de Aproveitamento</th>
            <th className="p-2 text-left">Altura (pav.)</th>
            <th className="p-2 text-left">Porte (m²)</th>
            <th className="p-2 text-left">Taxa de Ocupação</th>
            <th className="p-2 text-left">Recuo</th>
            <th className="p-2 text-left">Taxa de Permeabilidade</th>
            <th className="p-2 text-left">Afast. das Divisas</th>
            <th className="p-2 text-left">Lote Padrão</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-border rounded-2xl">
          <tr>
            <th colSpan={9} className="text-left bg-muted font-semibold p-2 border-b border-t">
              Usos Habitacionais
            </th>
          </tr>

          {dados.habitacionais.map((linha, i) => (
            <tr key={i} className="hover:bg-muted/50 ">
              {linha.map((col, j) => (
                <td key={j} className="p-2">
                  {col}
                </td>
              ))}
            </tr>
          ))}

          <tr>
            <th colSpan={9} className="text-left bg-muted font-semibold p-2">
              Usos Não Habitacionais
            </th>
          </tr>

          {dados.naoHabitacionais.map((linha, i) => (
            <tr key={i} className="hover:bg-muted/50 ">
              {linha.map((col, j) => (
                <td key={j} className="p-2">
                  {col}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <ul className="text-[13px] m-3 pl-5 list-disc text-foreground">
        {dados.notas.map((nota, i) => (
          <li key={i} className={nota.startsWith("Fonte:") ? "font-semibold" : ""}>
            {nota}
          </li>
        ))}
      </ul>
    </div>
  );
}
