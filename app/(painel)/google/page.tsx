'use client';

import { GraficoGoogle } from '@/components/Graficos';
import { usePainel } from '@/components/PainelContexto';
import { Tabela } from '@/components/Tabela';
import { Cartao, Carregando, Dica, TituloSecao, Vazio } from '@/components/ui';
import { dataBR, decimal, dinheiro, inteiro, pct } from '@/lib/formato';

export default function Google() {
  const { painel } = usePainel();
  if (!painel) return <Carregando />;
  const g = painel.google;
  if (g.estado === 'nao-configurado') {
    return (
      <Vazio>
        <strong className="text-texto">Conector não configurado.</strong> O Google Ads ainda não entra na coleta automática (fase 2). O restante da dashboard funciona normalmente.
      </Vazio>
    );
  }
  if (g.estado === 'erro') return <Vazio>Google Ads sem dados no momento (veja o indicador no topo).</Vazio>;
  const per = `Google Ads · ${dataBR(painel.periodo.de)} a ${dataBR(painel.periodo.ate)}`;
  const t = g.totais;
  const itens = [
    ['Custo', dinheiro(t.custo, 'USD')],
    ['Cliques', inteiro(t.cliques)],
    ['CTR', pct(t.ctr, 2)],
    ['CPC', dinheiro(t.cpc || null, 'USD')],
    ['Conversões', decimal(t.conversoes, 1)],
  ];
  const negativas = g.termos.filter((x) => x.negativa);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {itens.map(([k, v]) => (
          <Cartao key={k}>
            <Dica texto={per}>
              <p className="text-xs uppercase tracking-wide text-suave underline decoration-dotted decoration-apagado underline-offset-4">{k}</p>
            </Dica>
            <p className="num font-titulo text-xl font-semibold">{v}</p>
          </Cartao>
        ))}
      </div>
      <Cartao>
        <TituloSecao extra={<span className="text-xs text-apagado">US$ · conta {g.moedaConta}</span>}>Custo por dia</TituloSecao>
        <GraficoGoogle dados={g.diario} />
      </Cartao>
      <Cartao>
        <TituloSecao extra={<span className="text-xs text-apagado">{negativas.length} sugestão(ões) de negativa</span>}>Termos de pesquisa</TituloSecao>
        <Tabela
          linhas={g.termos}
          chaveLinha={(l) => `${l.term}|${l.campaign}`}
          ordemInicial={{ chave: 'custo', desc: true }}
          colunas={[
            { chave: 'term', titulo: 'Termo', fixa: true, valor: (l) => l.term, render: (l) => l.term },
            { chave: 'campaign', titulo: 'Campanha', valor: (l) => l.campaign, render: (l) => <span className="text-suave">{l.campaign}</span> },
            { chave: 'custo', titulo: 'Custo', alinhar: 'dir', valor: (l) => l.custo, render: (l) => dinheiro(l.custo, 'USD'), dica: per },
            { chave: 'cliques', titulo: 'Cliques', alinhar: 'dir', valor: (l) => l.cliques, render: (l) => inteiro(l.cliques), dica: per },
            { chave: 'conv', titulo: 'Conversões', alinhar: 'dir', valor: (l) => l.conversoes, render: (l) => decimal(l.conversoes, 1), dica: per },
            {
              chave: 'neg',
              titulo: 'Negativar?',
              valor: (l) => (l.negativa ? 1 : 0),
              render: (l) => (l.negativa ? <span className="font-medium text-acao">Sim — {l.negativa}</span> : <span className="text-apagado">—</span>),
              dica: 'Custo > US$10 sem conversão, ou contém: pills, viagra, cialis, spray, porn, reddit, jobs',
            },
          ]}
        />
      </Cartao>
    </div>
  );
}
