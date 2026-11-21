'use client';

import Link from 'next/link';
import { usePainel } from './PainelContexto';

export function AvisoErro() {
  const { erro, painel, query } = usePainel();
  const fontes = painel?.fontes ?? [];
  // Falha de verdade (token expirado, limite, erro de API) alarma em vermelho.
  const falhas = fontes.filter((f) => f.estado === 'erro' && f.motivo !== 'NAO_CONFIGURADO');
  // Fonte só não cadastrada é nota discreta (o aviso do pixel na Visão geral já cobre).
  const semCadastro = fontes.filter((f) => f.estado === 'erro' && f.motivo === 'NAO_CONFIGURADO');
  return (
    <>
      {erro && <p className="mb-4 rounded-lg border border-ruim/50 bg-ruim/10 px-3 py-2 text-sm text-ruim">{erro}</p>}
      {falhas.length > 0 && (
        <p className="mb-4 rounded-lg border border-ruim/50 bg-ruim/10 px-3 py-2 text-sm text-ruim">
          <strong>Falha em {falhas.map((f) => f.rotulo).join(', ')}</strong> —{' '}
          {falhas.map((f) => `${f.rotulo}: ${f.mensagem}`).join(' · ')}. Os números dessas fontes não entram nos totais.{' '}
          <Link href={`/conexoes${query ? `?${query}` : ''}`} className="underline">
            Ver o que fazer
          </Link>
        </p>
      )}
      {semCadastro.length > 0 && (
        <p className="mb-4 rounded-lg border border-borda bg-superficie px-3 py-2 text-xs text-suave">
          Fontes não cadastradas: {semCadastro.map((f) => f.rotulo).join(', ')}.{' '}
          <Link href={`/conexoes${query ? `?${query}` : ''}`} className="underline">
            Como cadastrar
          </Link>
        </p>
      )}
    </>
  );
}
