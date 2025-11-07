'use client';

import { useState, KeyboardEvent } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ModeToggle } from "./ui/modetoogle";
import { useLoteBusca } from "@/context/LoteBuscaContext";

export function SiteHeader() {
  const { buscarLote } = useLoteBusca();
  const [query, setQuery] = useState('');

  const handleSearch = () => {
    if (query.trim()) {
      buscarLote(query);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <header className="z-1000  flex h-[--header-height] shrink-0 items-center gap-2 border-b pb-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-[--header-height]">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mx-2 data-[orientation=vertical]:h-4"
        />
        <h1 className="text-base font-medium">Dados Geográficos</h1>

        {/* Campo de busca conectado ao contexto */}
        <div className="ml-auto flex flex-1 max-w-md items-center">
          <Input
            type="search"
            placeholder="Buscar por inscrição fiscal..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="h-8 w-full rounded-md bg-background pl-8 text-sm"
          />
          {/* Opcional: botão de busca (pode remover se quiser só Enter) */}
          <Button
            variant="ghost"
            size="sm"
            className="ml-2 h-8 w-8 p-0"
            onClick={handleSearch}
            aria-label="Buscar"
          >
            🔍
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <ModeToggle />
        </div>
      </div>
    </header>
  );
}