'use client';

import { GraficoGoogle } from '@/components/Graficos';
import { usePainel } from '@/components/PainelContexto';
import { Tabela } from '@/components/Tabela';
import { Cartao, Carregando, MiniStat, TituloSecao, Vazio } from '@/components/ui';
import { BarraFerramentas, BotaoExportar } from '@/components/Exportar';
import { n, type Folha } from '@/lib/csv';
import { dataBR, decimal, dinheiro, inteiro, pct } from '@/lib/formato';

export default function Google() {
  const { painel } = usePainel();
  if (!painel) return <Carregando />;
  const g = painel.google;
  if (g.estado === 'nao-configurado' || g.estado === 'erro') {
    return (
      <>
        <BarraFerramentas>
          <BotaoExportar arquivo="google-ads" folhas={() => []} disabled />
        </BarraFerramentas>
        <Vazio>
          {g.estado === 'nao-configurado' ? (
            <>
              <strong className="text-texto">Conector não configurado.</strong> O Google Ads ainda não entra na coleta automática (fase 2). O restante da dashboard funciona normalmente.
            </>
          ) : (
            'Google Ads sem dados no momento (veja o indicador no topo).'
          )}
        </Vazio>
      </>
    );
  }
  const per = `Google Ads · ${dataBR(painel.periodo.de)} a ${dataBR(painel.periodo.ate)}`;
  const t = g.totais;
  const itens: Array<[string, string, string]> = [
    ['Custo', dinheiro(t.custo, 'USD'), 'investimento'],
    ['Cliques', inteiro(t.cliques), 'checkouts'],
    ['CTR', pct(t.ctr, 2), 'roasMeta'],
    ['CPC', dinheiro(t.cpc || null, 'USD'), 'cpa'],
    ['Conversões', decimal(t.conversoes, 1), 'vendas'],
  ];
  const negativas = g.termos.filter((x) => x.negativa);
  const folhasCSV = (): Folha[] => [
    {
      nome: 'Totais',
      colunas: ['metrica', 'valor'],
      linhas: [['custo_usd', n(t.custo)], ['cliques', t.cliques], ['impressoes', t.impressoes], ['ctr_%', n(t.ctr * 100, 2)], ['cpc_usd', n(t.cpc)], ['conversoes', n(t.conversoes, 1)]],
    },
    { nome: 'Diario', colunas: ['data', 'custo_usd', 'cliques', 'conversoes'], linhas: g.diario.map((d) => [d.date, n(d.custo), d.cliques, n(d.conversoes, 1)]) },
    {
      nome: 'Termos de pesquisa',
      colunas: ['termo', 'campanha', 'custo_usd', 'cliques', 'conversoes', 'sugestao_negativa'],
      linhas: g.termos.map((x) => [x.term, x.campaign, n(x.custo), x.cliques, n(x.conversoes, 1), x.negativa ?? '']),
    },
  ];
  return (
    <div className="space-y-4">
      <BarraFerramentas titulo={<p className="text-xs text-apagado">{per}</p>}>
        <BotaoExportar arquivo={`google-ads_${painel.periodo.de}_a_${painel.periodo.ate}`} folhas={folhasCSV} />
      </BarraFerramentas>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {itens.map(([k, v, ic]) => (
          <MiniStat key={k} titulo={k} valor={v} icone={ic} dica={per} />
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
