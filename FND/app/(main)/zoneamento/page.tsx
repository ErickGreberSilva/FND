import QuadrosZoneamento from "@/components/Zoneamento/Zonas";
import zonasData from "@/public/quadros_zoneamento.json";

export default function ZoneamentoPage() {
  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4">Quadros de Zoneamento</h1>
      <QuadrosZoneamento/>
    </main>
  );
}