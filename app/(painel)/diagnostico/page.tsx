'use client';

import { usePainel } from '@/components/PainelContexto';
import { Cartao, Carregando, Pill, Vazio } from '@/components/ui';
import { dataBR, dinheiro } from '@/lib/formato';

const GRUPO: Record<number, string> = {
  1: 'Anúncio', 2: 'Anúncio', 3: 'Anúncio', 4: 'Anúncio', 5: 'Anúncio', 6: 'Anúncio',
  7: 'Página', 8: 'Página', 9: 'Checkout', 10: 'Página',
  11: 'Rastreamento', 12: 'Rastreamento', 13: 'Rastreamento', 14: 'Rastreamento',
  15: 'Negócio', 16: 'Negócio', 17: 'Negócio',
};

export default function Diagnostico() {
  const { painel } = usePainel();
  if (!painel) return <Carregando />;
  const total = painel.alertas.reduce((s, a) => s + a.verbaEmRisco, 0);
  const criticos = painel.alertas.filter((a) => a.nivel === 'critico').length;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h2 className="font-titulo text-lg font-semibold">Onde estamos errando</h2>
        <p className="num text-sm text-suave">
          {painel.alertas.length} alerta(s) · {criticos} crítico(s) · {dinheiro(total)} de verba em risco · {dataBR(painel.periodo.de)} a {dataBR(painel.periodo.ate)}
        </p>
      </div>
      <p className="text-xs text-apagado">
        Ordenado por verba em risco (R$). Regras de anúncio de escala e frequência usam sempre os últimos 3 e 7 dias; fonte fora do ar aparece primeiro.
      </p>
      {painel.alertas.length === 0 ? (
        <Vazio>Nenhum alerta no período. Tudo dentro das regras.</Vazio>
      ) : (
        <ol className="space-y-3">
          {painel.alertas.map((a, i) => (
            <li key={`${a.regra}-${a.onde}-${i}`}>
              <Cartao className={a.nivel === 'critico' ? 'border-ruim/50' : 'border-alerta/40'}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Pill valor={a.nivel} rotulo={a.nivel === 'critico' ? 'Crítico' : 'Atenção'} />
                    <span className="text-[11px] uppercase tracking-wide text-apagado">
                      {GRUPO[a.regra]} · regra {a.regra}
                    </span>
                  </div>
                  {a.verbaEmRisco > 0 && (
                    <span className="num text-sm">
                      <span className="text-apagado">em risco </span>
                      <span className="font-titulo font-semibold text-acao">{dinheiro(a.verbaEmRisco)}</span>
                    </span>
                  )}
                </div>
                <h3 className="mt-2 font-titulo text-base font-semibold">{a.titulo}</h3>
                <dl className="mt-2 grid gap-1 text-sm sm:grid-cols-[90px_1fr]">
                  <dt className="text-apagado">Onde</dt>
                  <dd className="break-words">{a.onde}</dd>
                  <dt className="text-apagado">Por quê</dt>
                  <dd className="num">{a.numero}</dd>
                  <dt className="text-apagado">O que fazer</dt>
                  <dd className="font-medium text-texto">{a.acao}</dd>
                </dl>
              </Cartao>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
