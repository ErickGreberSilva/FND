import Potencial from "@/components/Consulta/Potencial";
import PotencialTable from "@/components/Consulta/PotencialTable";
import QuadroZoneamento from "@/components/Consulta/QuadroZoneamento";
import LoteKonva from "@/components/SvgDraw/LoteKonva";
import SunPathCuritiba from "@/components/sunpaths/Sunpath-2D";
import Diagram2D from "@/components/sunpaths/Sunpath-Diagram";
import LoteSVGComCotas from "@/components/Consulta/LoteCotas";
import LoteValores from "@/components/Consulta/LoteValores";

export default function Home() {
  return (
    <div className="flex flex-col gap-6">
      <Potencial />
      <LoteKonva />
      <SunPathCuritiba />
      <Diagram2D />
      <PotencialTable />
      <QuadroZoneamento />
      <LoteSVGComCotas />
      <LoteValores />
    </div>
  );
}
