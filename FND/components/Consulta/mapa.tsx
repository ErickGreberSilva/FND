// components/Consulta/mapa.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import 'leaflet/dist/leaflet.css';

export default function MAPA() {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null); // ou use L.Map com tipagem

  useEffect(() => {
    if (typeof window === 'undefined' || !mapRef.current) return;

    // Evita criar múltiplas instâncias do mapa
    if (map) return;

    import('leaflet').then((L) => {
      const newMap = L.map(mapRef.current!).setView([-25.4400, -49.1700], 15);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
      }).addTo(newMap);

      setMap(newMap);
    });

    // Limpeza ao desmontar
    return () => {
      if (map) {
        map.remove();
        setMap(null);
      }
    };
  }, [map]);

  return (
    <div
      ref={mapRef}
      style={{ margin:'0 30px', height: '500px', borderRadius: '8px',}}
      className='customshadow'
    />
  );
}