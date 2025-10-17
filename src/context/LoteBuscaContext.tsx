// src/context/LoteBuscaContext.tsx
'use client';

import { createContext, useContext, useState } from 'react';

type LoteBuscaContextType = {
  ifiscal: string | null;
  buscarLote: (valor: string) => void;
};

const LoteBuscaContext = createContext<LoteBuscaContextType | undefined>(undefined);

export function LoteBuscaProvider({ children }: { children: React.ReactNode }) {
  const [ifiscal, setIfiscal] = useState<string | null>(null);

  const buscarLote = (valor: string) => {
    setIfiscal(valor.trim());
  };

  return (
    <LoteBuscaContext.Provider value={{ ifiscal, buscarLote }}>
      {children}
    </LoteBuscaContext.Provider>
  );
}

export function useLoteBusca() {
  const context = useContext(LoteBuscaContext);
  if (!context) {
    throw new Error('useLoteBusca must be used within a LoteBuscaProvider');
  }
  return context;
}