'use client';

import Link from 'next/link';
import { usePainel } from './PainelContexto';

export function AvisoErro() {
  const { erro, painel, query } = usePainel();
  const fora = painel?.fontes.filter((f) => f.estado === 'erro') ?? [];
  return (
    <>
      {erro && <p className="mb-4 rounded-lg border border-ruim/50 bg-ruim/10 px-3 py-2 text-sm text-ruim">{erro}</p>}
      {fora.length > 0 && (
        <p className="mb-4 rounded-lg border border-ruim/50 bg-ruim/10 px-3 py-2 text-sm text-ruim">
          <strong>Faltando dados de {fora.map((f) => f.rotulo).join(', ')}</strong> —{' '}
          {fora.map((f) => `${f.rotulo}: ${f.mensagem}`).join(' · ')}. Os números dessas fontes não entram nos totais.{' '}
          <Link href={`/conexoes${query ? `?${query}` : ''}`} className="underline">
            Ver o que fazer
          </Link>
        </p>
      )}
    </>
  );
}
