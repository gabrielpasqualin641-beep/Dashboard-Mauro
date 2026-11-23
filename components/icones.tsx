'use client';

import type { SVGProps } from 'react';

/** Ícones inline (traço, estilo lucide). Sem dependência externa. */
const PATHS: Record<string, string> = {
  investimento: 'M3 7h18v10H3z M3 11h18 M7 15h2', // carteira
  faturamento: 'M3 17l6-6 4 4 8-8 M15 7h6v6', // tendência de alta
  roas: 'M12 2a10 10 0 1 0 10 10 M12 8a4 4 0 1 0 4 4 M12 12l5-5', // alvo/gauge
  roasMeta: 'M3 12h4l3 8 4-16 3 8h4', // pulso
  vendas: 'M6 2l1.5 3h9L18 2 M4 7h16l-1.5 13h-13z M9 11v5 M15 11v5', // sacola
  checkouts: 'M3 3h2l2.5 13h11l2-9H6 M9 20a1 1 0 1 0 0 .01 M17 20a1 1 0 1 0 0 .01', // carrinho
  cpa: 'M20 12l-8 8-9-9V4h7z M7.5 7.5h.01', // etiqueta
  ticket: 'M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3a2 2 0 0 0 0-4z', // ingresso
  resultado: 'M12 2v20 M17 7H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6', // cifrão
  verba: 'M4 6h16v12H4z M4 10h16 M8 14h4', // cartão
  alerta: 'M12 3l9 16H3z M12 10v4 M12 17h.01',
  funil: 'M3 4h18l-7 8v6l-4 2v-8z',
  grafico: 'M3 3v18h18 M7 14l3-3 3 3 5-6',
};

export function Icone({ nome, ...props }: { nome: string } & SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" width={18} height={18} aria-hidden {...props}>
      {(PATHS[nome] ?? PATHS.grafico).split(' M').map((seg, i) => (
        <path key={i} d={(i === 0 ? seg : `M${seg}`)} />
      ))}
    </svg>
  );
}
