import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import PotencialTable from "@/components/Consulta/PotencialTable";
import Potencial from "@/components/Consulta/Potencial";
import QuadroZoneamento from "@/components/Consulta/QuadroZoneamento";
import LoteSVGComCotas from "@/components/Consulta/LoteCotas";
import LoteValores from "@/components/Consulta/LoteValores";
// import LoteExtrudeMap from "@/components/Consulta/LoteExtrudeMap";
// import ProtomapsAPIMap from "@/components/Consulta/Prtomps";
import SunPathCuritiba from "@/components/sunpaths/Sunpath-2D";
import Diagram2D from "@/components/sunpaths/Sunpath-Diagram";
import SunSimulator from "@/components/sunpaths/SunSimulator";
// import SVGFromMapServer from "@/components/SvgDraw/SVGFromMapServer";
import LoteKonva from "@/components/SvgDraw/LoteKonva";

export default function Home() {
  return (
    <SidebarProvider style=
    {
      { 
      "--sidebar-width": "calc(var(--spacing) * 72)", 
      "--header-height": "calc(var(--spacing) * 12)", 
      } as React.CSSProperties}>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 pt-0 md:gap-6 md:py-6 md:pt-0">
              <Potencial />
              <div className="px-4 lg:px-6">
                <LoteKonva />
                 {/* <ProtomapsAPIMap /> */}
                {/* <LoteExtrudeMap /> */}
                <SunPathCuritiba /> {/* SVG by Elyson */}
                <Diagram2D />
                <PotencialTable />
                <QuadroZoneamento />
                <LoteSVGComCotas />
                <LoteValores />
                 {/* <SVGFromMapServer
        layerIds={[ 5, 14, 16, 64, 65, 72, 73, 75, 76, 77, 80, 81, 82, 83 ]}
        width={1500}
        height={1000}
        expandFactor={1.5}
      /> */}
              </div>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
