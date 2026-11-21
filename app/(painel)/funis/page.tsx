'use client';

import { usePainel } from '@/components/PainelContexto';
import { Cartao, Carregando, Delta, Dica, Pill } from '@/components/ui';
import { dataBR, dinheiro, inteiro, pct, roas } from '@/lib/formato';
import type { LinhaFunilPainel } from '@/lib/painel';

function FunilVisual({ f, per, moeda }: { f: LinhaFunilPainel; per: string; moeda: 'BRL' | 'USD' }) {
  const topo = Math.max(1, f.etapas[0]?.valor ?? 1);
  const fonte = (nome: string) =>
    nome.startsWith('Compra') ? 'Hotmart (vendas aprovadas pelo sck)' : f.plataforma === 'google' ? 'Google Ads' : 'Meta';
  return (
    <Cartao>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-titulo text-base font-semibold">{f.nome}</h2>
          <p className="num text-xs text-suave">
            {dinheiro(f.investimento, moeda)} investidos · {inteiro(f.vendas)} vendas · ROAS real {roas(f.investimento ? f.roasReal : null)}
          </p>
        </div>
        <Pill valor={f.status} />
      </div>
      <ol className="space-y-2">
        {f.etapas.map((e, i) => {
          // Largura em escala logarítmica para impressões não esmagarem as etapas de baixo.
          const largura = e.valor > 0 ? Math.max(2, (Math.log10(e.valor + 1) / Math.log10(topo + 1)) * 100) : 0;
          return (
            <li key={e.nome}>
              {i > 0 && (
                <div className="num flex flex-wrap items-center gap-x-2 pl-1 text-[11px] text-apagado">
                  <span aria-hidden>↓</span>
                  <Dica texto={`Taxa desta etapa sobre a anterior · ${per}`}>
                    <span className="text-suave">{pct(e.taxa, 1)}</span>
                  </Dica>
                  <span>antes {pct(e.taxaAnterior, 1)}</span>
                </div>
              )}
              <div className="flex items-center gap-3">
                <div className="w-40 shrink-0 text-sm text-suave sm:w-48">{e.nome}</div>
                <div className="relative h-7 flex-1 overflow-hidden rounded-md bg-superficie2/60">
                  <div className="h-full rounded-md bg-destaque/70" style={{ width: `${largura}%` }} />
                  <Dica texto={`Fonte: ${fonte(e.nome)} · ${per}`} className="absolute inset-y-0 left-2 items-center">
                    <span className="num text-sm font-semibold text-texto drop-shadow">{inteiro(e.valor)}</span>
                  </Dica>
                </div>
                <div className="hidden w-32 shrink-0 text-right sm:block">
                  <Delta atual={e.valor} anterior={e.anterior} />
                </div>
              </div>
              {e.diagnostico && (
                <p className="ml-0 mt-1 rounded-md border-l-2 border-acao bg-acao/10 px-2 py-1 text-xs text-texto sm:ml-48">{e.diagnostico}</p>
              )}
            </li>
          );
        })}
      </ol>
    </Cartao>
  );
}

export default function Funis() {
  const { painel } = usePainel();
  if (!painel) return <Carregando />;
  const per = `${dataBR(painel.periodo.de)} a ${dataBR(painel.periodo.ate)}`;
  const comDados = painel.funis.filter((f) => f.investimento > 0 || f.vendas > 0 || f.investimentoAnterior > 0);
  const semDados = painel.funis.filter((f) => !comDados.includes(f));
  return (
    <div className="space-y-4">
      <p className="text-sm text-suave">
        Impressões → cliques → página → (quiz) → checkout → compra. A taxa é sempre sobre a etapa anterior; a variação compara com o período anterior.
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        {comDados.map((f) => (
          <FunilVisual key={f.chave} f={f} per={per} moeda={painel.moeda} />
        ))}
      </div>
      {semDados.length > 0 && (
        <p className="text-xs text-apagado">Sem investimento no período: {semDados.map((f) => f.nome).join(', ')}.</p>
      )}
    </div>
  );
}
