'use client';

import { baixarCSV, type Folha } from '@/lib/csv';

/** Botão "Exportar CSV" padrão das abas. `folhas` é calculado só no clique. */
export function BotaoExportar({
  arquivo,
  folhas,
  disabled,
  rotulo = 'Exportar CSV',
}: {
  arquivo: string;
  folhas: () => Folha[];
  disabled?: boolean;
  rotulo?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => baixarCSV(arquivo, folhas())}
      title="Baixar os dados desta aba em CSV para analisar (no Claude, Excel, etc.)"
      className="inline-flex items-center gap-1.5 rounded-lg border border-borda bg-superficie2 px-3 py-1.5 text-xs font-medium text-suave transition-colors hover:border-destaque/50 hover:text-texto disabled:cursor-not-allowed disabled:opacity-50"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      {rotulo}
    </button>
  );
}

/** Barra fina no topo da aba, com título opcional à esquerda e ações à direita. */
export function BarraFerramentas({ children, titulo }: { children: React.ReactNode; titulo?: React.ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
      <div>{titulo}</div>
      <div className="ml-auto flex items-center gap-2">{children}</div>
    </div>
  );
}
