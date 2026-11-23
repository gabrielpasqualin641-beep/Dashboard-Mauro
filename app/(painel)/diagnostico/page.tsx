'use client';

import { usePainel } from '@/components/PainelContexto';
import { Cartao, Carregando, MiniStat, Pill, Vazio } from '@/components/ui';
import { Icone } from '@/components/icones';
import { BotaoExportar } from '@/components/Exportar';
import { n } from '@/lib/csv';
import { dataBR, dinheiro, inteiro } from '@/lib/formato';

const GRUPO: Record<number, string> = {
  1: 'Anúncio', 2: 'Anúncio', 3: 'Anúncio', 4: 'Anúncio', 5: 'Anúncio', 6: 'Anúncio',
  7: 'Página', 8: 'Página', 9: 'Checkout', 10: 'Página',
  11: 'Rastreamento', 12: 'Rastreamento', 13: 'Rastreamento', 14: 'Rastreamento',
  15: 'Negócio', 16: 'Negócio', 17: 'Negócio',
};

const ICONE_GRUPO: Record<string, string> = {
  Anúncio: 'grafico', Página: 'funil', Checkout: 'checkouts', Rastreamento: 'roasMeta', Negócio: 'resultado',
};

export default function Diagnostico() {
  const { painel } = usePainel();
  if (!painel) return <Carregando />;
  const total = painel.alertas.reduce((s, a) => s + a.verbaEmRisco, 0);
  const criticos = painel.alertas.filter((a) => a.nivel === 'critico').length;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-titulo text-lg font-semibold">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-acao/15 text-acao"><Icone nome="alerta" /></span>
          Onde estamos errando
        </h2>
        <BotaoExportar
          arquivo={`diagnostico_${painel.periodo.de}_a_${painel.periodo.ate}`}
          disabled={painel.alertas.length === 0}
          folhas={() => [
            {
              nome: 'Alertas',
              colunas: ['regra', 'grupo', 'nivel', 'titulo', 'onde', 'por_que', 'o_que_fazer', 'verba_em_risco'],
              linhas: painel.alertas.map((a) => [a.regra, GRUPO[a.regra] ?? '', a.nivel, a.titulo, a.onde, a.numero, a.acao, n(a.verbaEmRisco)]),
            },
          ]}
        />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <MiniStat titulo="Alertas" valor={inteiro(painel.alertas.length)} icone="alerta" />
        <MiniStat titulo="Críticos" valor={inteiro(criticos)} icone="alerta" alerta={criticos > 0} />
        <MiniStat titulo="Verba em risco" valor={dinheiro(total)} icone="resultado" />
      </div>
      <p className="text-xs text-apagado">
        Ordenado por verba em risco (R$). Regras de anúncio de escala e frequência usam sempre os últimos 3 e 7 dias; fonte fora do ar aparece primeiro ·{' '}
        {dataBR(painel.periodo.de)} a {dataBR(painel.periodo.ate)}.
      </p>
      {painel.alertas.length === 0 ? (
        <Vazio>Nenhum alerta no período. Tudo dentro das regras.</Vazio>
      ) : (
        <ol className="space-y-3">
          {painel.alertas.map((a, i) => (
            <li key={`${a.regra}-${a.onde}-${i}`}>
              <Cartao className={`relative overflow-hidden ${a.nivel === 'critico' ? 'border-ruim/40' : 'border-alerta/30'}`}>
                <span className={`absolute inset-y-0 left-0 w-1 ${a.nivel === 'critico' ? 'bg-ruim' : 'bg-alerta'}`} aria-hidden />
                <div className="flex flex-wrap items-start justify-between gap-2 pl-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${a.nivel === 'critico' ? 'bg-ruim/15 text-ruim' : 'bg-alerta/15 text-alerta'}`}>
                      <Icone nome={ICONE_GRUPO[GRUPO[a.regra]] ?? 'alerta'} width={15} height={15} />
                    </span>
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
                <h3 className="mt-2 pl-2 font-titulo text-base font-semibold">{a.titulo}</h3>
                <dl className="mt-2 grid gap-1 pl-2 text-sm sm:grid-cols-[90px_1fr]">
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
