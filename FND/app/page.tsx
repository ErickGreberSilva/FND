import { AppSidebar } from "@/components/app-sidebar";
import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { DataTable } from "@/components/data-table";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import PotencialTable from "@/components/Consulta/PotencialTable";
import data from "./data.json";
import Potencial from "@/components/Consulta/Potencial";
import QuadroZoneamento from "@/components/Consulta/QuadroZoneamento";
import LoteSVGComCotas from "@/components/Consulta/LoteCotas";
import LoteValores from "@/components/Consulta/LoteValores";
import LoteExtrudeMap from "@/components/Consulta/LoteExtrudeMap";
export default function Home() {
  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties
      }
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 pt-0 md:gap-6 md:py-6 md:pt-0">
              <Potencial />

              {/* <MAPA /> */}
              <div className="px-4 lg:px-6">
                <LoteExtrudeMap />
                <PotencialTable />
                <QuadroZoneamento />
                <LoteSVGComCotas />
                <LoteValores />
                <ChartAreaInteractive />
              </div>
              <DataTable data={data} />
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
