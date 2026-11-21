'use client';

import type { ReactNode } from 'react';
import { pct as fpct, variacao } from '@/lib/formato';

/** Tooltip acessível (hover e foco). */
export function Dica({ texto, children, className = '' }: { texto: string; children: ReactNode; className?: string }) {
  return (
    <span className={`group relative inline-flex ${className}`} tabIndex={0} aria-label={texto}>
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-30 mb-2 hidden w-max max-w-[260px] -translate-x-1/2 whitespace-normal rounded-md border border-borda bg-[#0B1822] px-2.5 py-1.5 text-left text-xs font-normal normal-case leading-snug tracking-normal text-texto shadow-lg group-hover:block group-focus:block"
      >
        {texto}
      </span>
    </span>
  );
}

export function Cartao({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-xl border border-borda/60 bg-superficie p-4 ${className}`}>{children}</section>;
}

export function TituloSecao({ children, extra }: { children: ReactNode; extra?: ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
      <h2 className="font-titulo text-base font-semibold text-texto">{children}</h2>
      {extra}
    </div>
  );
}

/**
 * Variação vs período anterior. `melhorQuandoSobe=false` para custo (CPA):
 * subir é ruim. Neutro para investimento.
 */
export function Delta({
  atual,
  anterior,
  sentido = 'sobe',
}: {
  atual: number;
  anterior: number;
  sentido?: 'sobe' | 'desce' | 'neutro';
}) {
  const v = variacao(atual, anterior);
  if (v === null) return <span className="text-xs text-apagado">sem comparação</span>;
  const bom = sentido === 'neutro' ? null : sentido === 'sobe' ? v >= 0 : v <= 0;
  const cor = bom === null ? 'text-suave' : bom ? 'text-bom' : 'text-ruim';
  const seta = v > 0 ? '▲' : v < 0 ? '▼' : '■';
  return (
    <span className={`num text-xs ${cor}`}>
      {seta} {fpct(Math.abs(v), 0)} <span className="text-apagado">vs anterior</span>
    </span>
  );
}

const ESTILO_PILL: Record<string, string> = {
  Escalar: 'bg-bom/15 text-bom border-bom/40',
  Manter: 'bg-destaque/15 text-destaque border-destaque/40',
  'Atenção': 'bg-alerta/15 text-alerta border-alerta/40',
  Pausar: 'bg-ruim/15 text-ruim border-ruim/40',
  'Escalar 20%': 'bg-bom/15 text-bom border-bom/40',
  'Trocar criativo': 'bg-alerta/15 text-alerta border-alerta/40',
  'Criativo cansando': 'bg-alerta/15 text-alerta border-alerta/40',
  critico: 'bg-ruim/15 text-ruim border-ruim/40',
  atencao: 'bg-alerta/15 text-alerta border-alerta/40',
};

const ICONE_PILL: Record<string, string> = {
  Escalar: '↑',
  'Escalar 20%': '↑',
  Manter: '→',
  'Atenção': '!',
  Pausar: '■',
  'Trocar criativo': '!',
  'Criativo cansando': '!',
  critico: '■',
  atencao: '!',
};

export function Pill({ valor, rotulo }: { valor: string; rotulo?: string }) {
  if (valor === '—') return <span className="text-apagado">—</span>;
  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium ${
        ESTILO_PILL[valor] ?? 'border-borda bg-superficie2 text-suave'
      }`}
    >
      <span aria-hidden>{ICONE_PILL[valor] ?? '·'}</span>
      {rotulo ?? valor}
    </span>
  );
}

export function Vazio({ children }: { children: ReactNode }) {
  return <p className="rounded-lg border border-dashed border-borda p-6 text-center text-sm text-suave">{children}</p>;
}

export function Carregando() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-24 animate-pulse rounded-xl bg-superficie" />
      ))}
    </div>
  );
}

/** Container que rola na horizontal sem estourar a página no celular. */
export function Rolagem({ children }: { children: ReactNode }) {
  return <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">{children}</div>;
}
