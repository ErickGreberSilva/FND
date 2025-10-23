.ordercalc {
    border-radius: 20px;
    background: var(--light);
    padding: 24px;
    overflow-x: auto;
    margin-bottom: 10px;
}

.titulotabextra {
    background-color: #eeeeee;
    border-top-right-radius: 10px;
    border-top-left-radius: 10px;
    border-bottom-color: #cccccc;
    border-bottom-width: 2px;
    box-shadow: 2px 2px 6px rgb(0 0 0 / 22%);
    z-index: 1;
    position: relative;
    font-family: 'Lato';
    font-size: 16px;
    padding: 6px;
}

table.ptable {
    width: 100%;
    border-collapse: collapse;
    font-family: 'lato', sans-serif;
    font-size: 14px;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1);
    /* border-radius: 20px; */
}

table.ptable tr {
    border-bottom: 1px solid #ccc;
    border-radius: 20px;
}

#html_zona table.ptable th {
    background-color: #4193e3;
    color: white;
    text-align: left;
    padding: 10px;
    width: 10%;
}


content = (
    //PADRAO ==================================================================================================
    <div className=" p-0 overflow-x-auto mb-3 shadow-sm rounded-lg border" id="html_zona">
      <h5 className="bg-muted/50 rounded-t-lg shadow-md border-b  font-sans font-semibold text-[16px] p-2">
        Quadro XVIII - Zona Residencial 3 (ZR3) //Variavel Quadro Zona
      </h5>

      <table className="w-full border-collapse rounded-lg border font-sans text-[14px] shadow-md" id="{IDTABELA}"> //Idtabela variavel
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
        
          //variaveis de uso habitacional ==========================================
          <tr className="hover:bg-blue-50">
            <td className="p-2">Habitação Unifamiliar (1)(2)</td>
            <td className="p-2">1</td>
            <td className="p-2">3 (4)</td>
            <td className="p-2">-</td>
            <td className="p-2">50% (2)</td>
            <td className="p-2">5 m</td>
            <td className="p-2">25% (3)</td>
            <td className="p-2">(5)</td>
            <td className="p-2">12 x 360</td>
          </tr>

          <tr className="hover:bg-blue-50">
            <td className="p-2">Habitação Unifamiliar em Série (1)(6)</td>
            <td className="p-2">1</td>
            <td className="p-2">3 (4)</td>
            <td className="p-2">-</td>
            <td className="p-2">50% (2)</td>
            <td className="p-2">5 m</td>
            <td className="p-2">25% (3)</td>
            <td className="p-2">(5)</td>
            <td className="p-2"></td>
          </tr>

          <tr className="hover:bg-blue-50">
            <td className="p-2">Habitação Coletiva (6)</td>
            <td className="p-2">1</td>
            <td className="p-2">3 (4)</td>
            <td className="p-2">-</td>
            <td className="p-2">50% (2)</td>
            <td className="p-2">5 m</td>
            <td className="p-2">25% (3)</td>
            <td className="p-2">(5)</td>
            <td className="p-2"></td>
          </tr>

          <tr className="hover:bg-blue-50">
            <td className="p-2">Habitação Institucional</td>
            <td className="p-2">1</td>
            <td className="p-2">3 (4)</td>
            <td className="p-2">-</td>
            <td className="p-2">50% (2)</td>
            <td className="p-2">5 m</td>
            <td className="p-2">25% (3)</td>
            <td className="p-2">(5)</td>
            <td className="p-2"></td>
          </tr>

          <tr className="hover:bg-blue-50">
            <td className="p-2">Habitação Transitória 1 (7)</td>
            <td className="p-2">1</td>
            <td className="p-2">3 (4)</td>
            <td className="p-2">-</td>
            <td className="p-2">50% (2)</td>
            <td className="p-2">5 m</td>
            <td className="p-2">25% (3)</td>
            <td className="p-2">(5)</td>
            <td className="p-2"></td>
          </tr>

          <tr className="hover:bg-blue-50">
            <td className="p-2">Empreendimento Inclusivo de HIS (3)</td>
            <td className="p-2">1</td>
            <td className="p-2">3 (4)</td>
            <td className="p-2">-</td>
            <td className="p-2">50% (2)</td>
            <td className="p-2">5 m</td>
            <td className="p-2">25% (3)</td>
            <td className="p-2">(5)</td>
            <td className="p-2"></td>
          </tr>
        //Fim variaveis de uso habitacional ==============================================================================
        //PADRAO =========================================================================================================
                <th colSpan={9} className="text-left bg-muted font-semibold p-2">
                Usos Não Habitacionais
                </th>
           </tr>
        //variaveis de uso Não Habitacional habitacional ==================================================================
        <tr className="hover:bg-blue-50">
            <td className="p-2">Comunitário 1 (8)</td>
            <td className="p-2">1 (9)</td>
            <td className="p-2">2</td>
            <td className="p-2">200</td>
            <td className="p-2">50%</td>
            <td className="p-2">5 m</td>
            <td className="p-2">25% (3)</td>
            <td className="p-2">-</td>
            <td className="p-2"></td>
          </tr>

          <tr className="hover:bg-blue-50">
            <td className="p-2">Comunitário 2 – Saúde</td>
            <td className="p-2">1 (9)</td>
            <td className="p-2">2</td>
            <td className="p-2">200</td>
            <td className="p-2">50%</td>
            <td className="p-2">5 m</td>
            <td className="p-2">25% (3)</td>
            <td className="p-2">-</td>
            <td className="p-2"></td>
          </tr>

          <tr className="hover:bg-blue-50">
            <td className="p-2">Comércio e Serviço Vicinal e de Bairro (8)</td>
            <td className="p-2">1 (9)</td>
            <td className="p-2">2</td>
            <td className="p-2">200</td>
            <td className="p-2">50%</td>
            <td className="p-2">5 m</td>
            <td className="p-2">25% (3)</td>
            <td className="p-2">-</td>
            <td className="p-2"></td>
          </tr>

          <tr className="hover:bg-blue-50">
            <td className="p-2">Comunitário 2 – Culto Religioso</td>
            <td className="p-2">1</td>
            <td className="p-2">2</td>
            <td className="p-2">-</td>
            <td className="p-2">50%</td>
            <td className="p-2">5 m</td>
            <td className="p-2">25% (3)</td>
            <td className="p-2">-</td>
            <td className="p-2"></td>
          </tr>

          <tr className="hover:bg-blue-50">
            <td className="p-2">Indústria Tipo 1 (10)</td>
            <td className="p-2">-</td>
            <td className="p-2">-</td>
            <td className="p-2">200</td>
            <td className="p-2">-</td>
            <td className="p-2">-</td>
            <td className="p-2">-</td>
            <td className="p-2">-</td>
            <td className="p-2"></td>
          </tr>
        //Fim variaveis de uso Não Habitacional habitacional ==================================================================
        </tbody>
        </table>
        //variaveis Notas ==================================================================
                <ul className="text-[13px] mt-3 pl-5 list-disc text-foreground">
                    <li>(1) Fração mínima de 120 m² por unidade habitacional.</li>
                    <li>(2) Em lotes menores que o padrão, pode chegar até 60% proporcionalmente (uma única unidade).</li>
                    <li>(3) Atender regulamentação específica.</li>
                    <li>(4) Até 3 pavimentos com até 10 m de altura; afastamento facultado.</li>
                    <li>(5) Afastamento mínimo de 2,50 m para habitação institucional.</li>
                    <li>(6) Somente em terrenos &lt; 20.000 m².</li>
                    <li>(7) Apenas Apart-hotel; pode ter usos comerciais de bairro.</li>
                    <li>(8) Alvará até 400 m² com aprovação do CMU.</li>
                    <li>(9) Limitado a 200 m².</li>
                    <li>(10) Somente em edificação existente.</li>
                    <li className="font-semibold">Fonte: Lei nº 15.511_2019 Atualizada 19.11.2019.</li>
                </ul>
        //fim variaveis Notas ==================================================================
    </div>



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
      "(1) Uma habitação unifamiliar por fração de 300 m²",
      "(2) Atender regulamentação específica",
      "(3) Somente em terrenos menores que 20.000 m², com fração mínima de 300 m² por unidade",
      "(4) Somente em edificação existente",
      "(5) Somente em edificação existente e vinculada ao uso habitacional",
    ],
  },

  ZR2: {
    titulo: "Quadro XVII - Zona Residencial 2 (ZR2)",
    idTabela: "tabela-zr2",
    habitacionais: [
      ["Habitação Unifamiliar (1)", "1", "2", "-", "50% (2)", "5 m", "25% (3)", "-", "12 x 360"],
      ["Habitação Unifamiliar em Série (1)(4)", "1", "2", "-", "50% (2)", "5 m", "25% (3)", "-", ""],
      ["Habitação Institucional", "1", "2", "-", "50% (2)", "5 m", "25% (3)", "-", ""],
      ["Empreendimento Inclusivo de HIS (3)", "1", "2", "-", "50% (2)", "5 m", "25% (3)", "-", ""],
    ],
    naoHabitacionais: [
      ["Comunitário 1 (5)", "1 (6)", "2", "200", "50%", "5 m", "25% (3)", "-", ""],
      ["Comércio e Serviço Vicinal e de Bairro (5)", "1 (6)", "2", "200", "50%", "5 m", "25% (3)", "-", ""],
      ["Comunitário 2 – Culto Religioso", "1", "2", "-", "50%", "5 m", "25% (3)", "-", ""],
      ["Indústria Tipo 1 (7)", "-", "-", "200", "-", "-", "-", "-", ""],
    ],
    notas: [
      "(1) Fração mínima de 120 m² por unidade habitacional.",
      "(2) Em lotes menores que o padrão, pode chegar até 60% proporcionalmente (uma única unidade).",
      "(3) Atender regulamentação específica.",
      "(4) Apenas em lotes < 20.000 m².",
      "(5) Alvará possível até 400 m² com aprovação do CMU.",
      "(6) Desde que limitado a 200 m².",
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
      "(2) Em lotes menores que o padrão, pode chegar até 60% proporcionalmente (uma única unidade).",
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
};

// === Componente de renderização dinâmico (mantendo o estilo original) =============================
function QuadroZona({ zona }: { zona: keyof typeof zonas }) {
  const dados = zonas[zona];
  if (!dados) return null;

  return (
    <div
      className="p-0 overflow-x-auto mb-3 shadow-sm rounded-lg border"
      id="html_zona"
    >
      <h5 className="bg-muted/50 rounded-t-lg shadow-md border-b font-sans font-semibold text-[16px] p-2">
        {dados.titulo}
      </h5>

      <table
        className="w-full border-collapse rounded-lg border font-sans text-[14px] shadow-md"
        id={dados.idTabela}
      >
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
            <th
              colSpan={9}
              className="text-left bg-muted font-semibold p-2 border-b border-t"
            >
              Usos Habitacionais
            </th>
          </tr>

          {dados.habitacionais.map((linha, i) => (
            <tr key={i} className="hover:bg-blue-50">
              {linha.map((col, j) => (
                <td key={j} className="p-2">
                  {col}
                </td>
              ))}
            </tr>
          ))}

          <tr>
            <th
              colSpan={9}
              className="text-left bg-muted font-semibold p-2 border-b border-t"
            >
              Usos Não Habitacionais
            </th>
          </tr>

          {dados.naoHabitacionais.map((linha, i) => (
            <tr key={i} className="hover:bg-blue-50">
              {linha.map((col, j) => (
                <td key={j} className="p-2">
                  {col}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <ul className="text-[13px] mt-3 pl-5 list-disc text-foreground">
        {dados.notas.map((nota, i) => (
          <li
            key={i}
            className={nota.startsWith("Fonte:") ? "font-semibold" : ""}
          >
            {nota}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default QuadroZona;