'use client';

import { useMemo, useState } from 'react';
import { Sparkline } from '@/components/Graficos';
import { usePainel } from '@/components/PainelContexto';
import { Tabela, type Coluna } from '@/components/Tabela';
import { Cartao, Carregando, Pill } from '@/components/ui';
import { BotaoExportar } from '@/components/Exportar';
import { dataBR, decimal, dinheiro, inteiro, pct, roas } from '@/lib/formato';
import { n as csvNum, type Folha } from '@/lib/csv';
import type { LinhaAnuncio } from '@/lib/painel';

const RANKING: Record<string, string> = {
  ABOVE_AVERAGE: 'Acima da média',
  AVERAGE: 'Na média',
  BELOW_AVERAGE_35: 'Abaixo (35% piores)',
  BELOW_AVERAGE_20: 'Abaixo (20% piores)',
  BELOW_AVERAGE_10: 'Abaixo (10% piores)',
  UNKNOWN: '—',
};

const STATUS: Record<string, string> = {
  ACTIVE: 'Ativo',
  PAUSED: 'Pausado',
  CAMPAIGN_PAUSED: 'Campanha pausada',
  ADSET_PAUSED: 'Conjunto pausado',
  DISAPPROVED: 'Reprovado',
  WITH_ISSUES: 'Com problema',
  IN_PROCESS: 'Em análise',
  ARCHIVED: 'Arquivado',
  UNKNOWN: '—',
};

export default function Criativos() {
  const { painel } = usePainel();
  const [porConceito, setPorConceito] = useState(false);
  const [funil, setFunil] = useState<string>('todos');
  const linhas = useMemo(
    () => (painel?.anuncios ?? []).filter((a) => funil === 'todos' || a.funnelKey === funil),
    [painel, funil],
  );
  if (!painel) return <Carregando />;
  const m = painel.moeda;
  const per = `Meta · ${dataBR(painel.periodo.de)} a ${dataBR(painel.periodo.ate)}`;
  const funisComAnuncio = [...new Map(painel.anuncios.map((a) => [a.funnelKey, a.funilNome])).entries()];

  const col: Coluna<LinhaAnuncio>[] = [
    {
      chave: 'anuncio',
      titulo: 'Anúncio',
      fixa: true,
      valor: (l) => l.adName,
      render: (l) => (
        <div className="flex max-w-[280px] items-center gap-2">
          {l.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={l.thumbnailUrl} alt="" referrerPolicy="no-referrer" className="h-10 w-10 shrink-0 rounded object-cover" loading="lazy" />
          ) : (
            <div className="h-10 w-10 shrink-0 rounded bg-superficie2" aria-hidden />
          )}
          <div className="min-w-0">
            <p className="truncate font-medium" title={l.adName}>{l.adName}</p>
            <p className="truncate text-[11px] text-apagado" title={`${l.campaignName} › ${l.adsetName}`}>
              {l.funilNome} · {STATUS[l.status] ?? l.status}
            </p>
          </div>
        </div>
      ),
    },
    { chave: 'acao', titulo: 'Ação sugerida', valor: (l) => l.acao, render: (l) => <Pill valor={l.acao} />, dica: 'Regras 1–4 e 6 do Diagnóstico' },
    { chave: 'gasto', titulo: 'Gasto', alinhar: 'dir', valor: (l) => l.gasto, render: (l) => dinheiro(l.gasto, m), dica: per },
    { chave: 'spark', titulo: '14 dias', render: (l) => (
      <div className="flex flex-col gap-0.5">
        <Sparkline valores={l.spark.map((s) => s.gasto)} rotulo={`Gasto diário dos últimos 14 dias de ${l.adName}`} />
        <Sparkline valores={l.spark.map((s) => s.cpa)} cor="#F5B83D" rotulo={`CPA diário (Meta) dos últimos 14 dias de ${l.adName}`} />
      </div>
    ), dica: 'Azul: gasto por dia · Âmbar: CPA do Meta por dia (últimos 14 dias)' },
    { chave: 'impressoes', titulo: 'Impressões', alinhar: 'dir', valor: (l) => l.impressoes, render: (l) => inteiro(l.impressoes), dica: per },
    { chave: 'freq', titulo: 'Frequência', alinhar: 'dir', valor: (l) => l.frequencia, render: (l) => (l.frequencia ? decimal(l.frequencia) : '—'), dica: `${per} · alcance real do período` },
    { chave: 'cpm', titulo: 'CPM', alinhar: 'dir', valor: (l) => l.cpm, render: (l) => dinheiro(l.cpm, m), dica: per },
    { chave: 'ctr', titulo: 'CTR link', alinhar: 'dir', valor: (l) => l.ctrLink, render: (l) => pct(l.ctrLink, 2), dica: `${per} · cliques no link ÷ impressões` },
    { chave: 'cpc', titulo: 'CPC', alinhar: 'dir', valor: (l) => l.cpc, render: (l) => dinheiro(l.cpc || null, m), dica: `${per} · gasto ÷ cliques no link` },
    { chave: 'gancho', titulo: 'Gancho', alinhar: 'dir', valor: (l) => l.gancho, render: (l) => pct(l.gancho, 1), dica: `${per} · reproduções de 3s ÷ impressões` },
    { chave: 'retencao', titulo: 'Retenção', alinhar: 'dir', valor: (l) => l.retencao, render: (l) => pct(l.retencao, 1), dica: `${per} · ThruPlays ÷ reproduções de 3s` },
    { chave: 'lpv', titulo: 'LPV/clique', alinhar: 'dir', valor: (l) => l.lpvClique, render: (l) => pct(l.lpvClique, 0), classe: (l) => (l.lpvClique && l.lpvClique < 0.7 ? 'text-alerta' : ''), dica: `${per} · visualizações da página ÷ cliques no link` },
    { chave: 'checkout', titulo: 'Checkout', alinhar: 'dir', valor: (l) => l.checkouts, render: (l) => inteiro(l.checkouts), dica: per },
    { chave: 'compras', titulo: 'Compras', alinhar: 'dir', valor: (l) => l.compras, render: (l) => inteiro(l.compras), dica: 'Hotmart (utm_content) quando a venda traz o anúncio; senão, compras do pixel do Meta' },
    { chave: 'cpa', titulo: 'CPA', alinhar: 'dir', valor: (l) => l.cpa, render: (l) => dinheiro(l.cpa, m), dica: 'Gasto ÷ compras' },
    { chave: 'roas', titulo: 'ROAS', alinhar: 'dir', valor: (l) => l.roas, render: (l) => roas(l.roas), dica: 'Hotmart por utm_content; sem utm, valor do pixel calibrado pelo ROAS real do funil' },
    {
      chave: 'qualidade',
      titulo: 'Qualidade',
      valor: (l) => l.qualidade,
      render: (l) => RANKING[l.qualidade] ?? l.qualidade,
      classe: (l) => (l.qualidade.startsWith('BELOW_AVERAGE') ? 'text-ruim font-medium' : ''),
      dica: 'Meta · ranking de qualidade (vermelho = abaixo da média)',
    },
  ];

  return (
    <Cartao>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 className="mr-auto font-titulo text-base font-semibold">Criativos</h2>
        <select value={funil} onChange={(e) => setFunil(e.target.value)} className="rounded-md border border-borda bg-superficie2 px-2 py-1 text-xs text-texto" aria-label="Filtrar funil">
          <option value="todos">Todos os funis</option>
          {funisComAnuncio.map(([k, nome]) => (
            <option key={k} value={k}>{nome}</option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-xs text-suave">
          <input type="checkbox" checked={porConceito} onChange={(e) => setPorConceito(e.target.checked)} className="accent-[#52BBF6]" />
          Agrupar por conceito
        </label>
        <BotaoExportar
          arquivo={`criativos_${painel.periodo.de}_a_${painel.periodo.ate}`}
          folhas={() => [
            {
              nome: 'Anuncios',
              colunas: ['anuncio', 'conceito', 'conjunto', 'campanha', 'funil', 'status', 'gasto', 'impressoes', 'frequencia', 'cpm', 'ctr_link_%', 'cpc', 'gancho_%', 'retencao_%', 'lpv_por_clique_%', 'checkouts', 'compras', 'cpa', 'roas', 'qualidade', 'acao_sugerida'],
              linhas: linhas.map((l) => [
                l.adName, l.conceito, l.adsetName, l.campaignName, l.funilNome, STATUS[l.status] ?? l.status,
                csvNum(l.gasto), l.impressoes, csvNum(l.frequencia), csvNum(l.cpm), csvNum(l.ctrLink * 100, 2), csvNum(l.cpc),
                l.gancho === null ? null : csvNum(l.gancho * 100, 1), l.retencao === null ? null : csvNum(l.retencao * 100, 1),
                csvNum(l.lpvClique * 100, 0), l.checkouts, l.compras, csvNum(l.cpa), csvNum(l.roas), RANKING[l.qualidade] ?? l.qualidade, l.acao,
              ]),
            } satisfies Folha,
          ]}
        />
      </div>
      <Tabela
        linhas={linhas}
        colunas={col}
        chaveLinha={(l) => l.adId}
        ordemInicial={{ chave: 'gasto', desc: true }}
        agrupar={porConceito ? (l) => l.conceito : undefined}
        vazio="Nenhum anúncio com gasto no período."
      />
    </Cartao>
  );
}
