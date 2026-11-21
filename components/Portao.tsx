'use client';

import type { ReactNode } from 'react';
import { Cabecalho } from './Cabecalho';
import { AvisoErro } from './AvisoErro';
import { usePainel } from './PainelContexto';
import { TelaSenha } from './TelaSenha';

/** Sem a senha certa, nenhum número é descriptografado nem renderizado. */
export function Portao({ children }: { children: ReactNode }) {
  const { autenticado } = usePainel();
  if (!autenticado) return <TelaSenha />;
  return (
    <>
      <Cabecalho />
      <main className="mx-auto max-w-7xl px-4 py-5">
        <AvisoErro />
        {children}
      </main>
      <footer className="mx-auto max-w-7xl px-4 pb-8 text-[11px] text-apagado">
        Somente leitura: esta dashboard nunca cria, edita ou pausa nada nas contas. Os dados são atualizados por um GitHub Action a cada
        15–30 minutos e esta página confere a cada 5 minutos.
      </footer>
    </>
  );
}
