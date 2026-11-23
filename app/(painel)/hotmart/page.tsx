'use client';

import { LINK_ABANDONO_HOTMART } from '@/config/operacao';
import { usePainel } from '@/components/PainelContexto';
import { Tabela } from '@/components/Tabela';
import { Cartao, Carregando, Dica, TituloSecao, Vazio } from '@/components/ui';
import { BarraFerramentas, BotaoExportar } from '@/components/Exportar';
import { n, type Folha } from '@/lib/csv';
import { dataBR, decimal, dinheiro, inteiro, pct } from '@/lib/formato';

function Numero({ titulo, valor, dica, alerta }: { titulo: string; valor: string; dica: string; alerta?: boolean }) {
  return (
    <div>
      <Dica texto={dica}>
        <p className="text-xs uppercase tracking-wide text-suave underline decoration-dotted decoration-apagado underline-offset-4">{titulo}</p>
      </Dica>
      <p className={`num font-titulo text-xl font-semibold ${alerta ? 'text-ruim' : ''}`}>{valor}</p>
    </div>
  );
}

export default function Hotmart() {
  const { painel } = usePainel();
  if (!painel) return <Carregando />;
  const h = painel.hotmart;
  const m = painel.moeda;
  const per = `Hotmart · ${dataBR(painel.periodo.de)} a ${dataBR(painel.periodo.ate)}`;
  const r = h.reembolsos;

  const folhasCSV = (): Folha[] => [
    { nome: 'Por produto', colunas: ['produto', 'vendas', 'bruto', 'liquido'], linhas: h.porProduto.map((p) => [p.produto, p.vendas, n(p.bruto), n(p.liquido)]) },
    { nome: 'Por sck (origem)', colunas: ['sck', 'funil', 'vendas', 'liquido'], linhas: h.porSck.map((p) => [p.sck, p.funil, p.vendas, n(p.liquido)]) },
    {
      nome: 'Reembolsos',
      colunas: ['metrica', 'valor'],
      linhas: [
        ['taxa_%', n(r.taxa * 100, 1)], ['reembolsos_qtd', r.reembolsos], ['reembolsos_valor', n(r.valorReembolsos)],
        ['chargebacks_qtd', r.chargebacks], ['chargebacks_valor', n(r.valorChargebacks)], ['cancelados_qtd', r.cancelados], ['pedidos_pagos', r.total],
      ],
    },
    {
      nome: 'Order bump e recompra',
      colunas: ['metrica', 'valor'],
      linhas: [
        ['bump_aceitacao_%', n(h.bump.taxa * 100, 1)], ['bump_pedidos_com', h.bump.comBump], ['bump_pedidos_total', h.bump.principais], ['bump_receita_extra', n(h.bump.receitaExtra)],
        ['express_compradores', h.recompra.compradoresExpress], ['express_viraram_2.0', h.recompra.compraram20Depois], ['express_taxa_%', n(h.recompra.taxa * 100, 1)], ['express_dias_medios', n(h.recompra.diasMedios, 1)],
      ],
    },
  ];

  if (!h.disponivel)
    return (
      <>
        <BarraFerramentas>
          <BotaoExportar arquivo="hotmart" folhas={folhasCSV} disabled />
        </BarraFerramentas>
        <Vazio>Hotmart sem dados no momento (não configurada). Cadastre os Secrets da Hotmart para habilitar esta aba e o export.</Vazio>
      </>
    );

  return (
    <>
      <BarraFerramentas titulo={<p className="text-xs text-apagado">{per}</p>}>
        <BotaoExportar arquivo={`hotmart_${painel.periodo.de}_a_${painel.periodo.ate}`} folhas={folhasCSV} />
      </BarraFerramentas>
      <div className="grid gap-4 lg:grid-cols-2">
      <Cartao>
        <TituloSecao>Vendas por produto</TituloSecao>
        <Tabela
          linhas={h.porProduto}
          chaveLinha={(l) => l.produto}
          ordemInicial={{ chave: 'liquido', desc: true }}
          colunas={[
            { chave: 'produto', titulo: 'Produto', valor: (l) => l.produto, render: (l) => l.produto },
            { chave: 'vendas', titulo: 'Vendas', alinhar: 'dir', valor: (l) => l.vendas, render: (l) => inteiro(l.vendas), dica: `${per} · aprovadas (todas as origens)` },
            { chave: 'bruto', titulo: 'Bruto', alinhar: 'dir', valor: (l) => l.bruto, render: (l) => dinheiro(l.bruto, m), dica: per },
            { chave: 'liquido', titulo: 'Líquido', alinhar: 'dir', valor: (l) => l.liquido, render: (l) => dinheiro(l.liquido, m), dica: `${per} · bruto − taxa Hotmart` },
          ]}
        />
      </Cartao>

      <Cartao>
        <TituloSecao>Vendas por origem (sck)</TituloSecao>
        <Tabela
          linhas={h.porSck}
          chaveLinha={(l) => `${l.sck}|${l.funil}`}
          ordemInicial={{ chave: 'vendas', desc: true }}
          colunas={[
            { chave: 'sck', titulo: 'sck', valor: (l) => l.sck, render: (l) => <code className={l.sck === '(sem sck)' ? 'text-alerta' : 'text-destaque'}>{l.sck}</code> },
            { chave: 'funil', titulo: 'Funil', valor: (l) => l.funil, render: (l) => l.funil },
            { chave: 'vendas', titulo: 'Vendas', alinhar: 'dir', valor: (l) => l.vendas, render: (l) => inteiro(l.vendas), dica: `${per} · pedidos aprovados, sem order bump` },
            { chave: 'liquido', titulo: 'Líquido', alinhar: 'dir', valor: (l) => l.liquido, render: (l) => dinheiro(l.liquido, m), dica: per },
          ]}
        />
      </Cartao>

      <Cartao>
        <TituloSecao>Reembolsos e chargebacks</TituloSecao>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Numero titulo="Taxa" valor={pct(r.taxa, 1)} dica={`${per} · (reembolsos + chargebacks) ÷ pedidos pagos`} alerta={r.taxa > 0.1} />
          <Numero titulo="Reembolsos" valor={`${inteiro(r.reembolsos)} · ${dinheiro(r.valorReembolsos, m)}`} dica={per} />
          <Numero titulo="Chargebacks" valor={`${inteiro(r.chargebacks)} · ${dinheiro(r.valorChargebacks, m)}`} dica={per} />
          <Numero titulo="Cancelados" valor={inteiro(r.cancelados)} dica={`${per} · pedidos cancelados antes do pagamento`} />
          <Numero titulo="Pedidos pagos" valor={inteiro(r.total)} dica={`${per} · aprovados + reembolsados + chargeback`} />
        </div>
      </Cartao>

      <Cartao>
        <TituloSecao>Order bump</TituloSecao>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Numero titulo="Aceitação" valor={pct(h.bump.taxa, 1)} dica={`${per} · pedidos com bump ÷ pedidos aprovados`} />
          <Numero titulo="Pedidos com bump" valor={`${inteiro(h.bump.comBump)} de ${inteiro(h.bump.principais)}`} dica={per} />
          <Numero titulo="Receita extra" valor={dinheiro(h.bump.receitaExtra, m)} dica={`${per} · líquido dos bumps`} />
        </div>
      </Cartao>

      <Cartao>
        <TituloSecao>Express → CONTROLE 2.0</TituloSecao>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Numero titulo="Compradores do Express" valor={inteiro(h.recompra.compradoresExpress)} dica="Hotmart · últimos 90 dias coletados, compradores únicos" />
          <Numero titulo="Compraram o 2.0 depois" valor={`${inteiro(h.recompra.compraram20Depois)} (${pct(h.recompra.taxa, 1)})`} dica="Cruzamento por hash do e-mail (sha256 + SALT_HASH) gerado no coletor; o e-mail nunca é publicado" />
          <Numero titulo="Tempo médio até o 2.0" valor={h.recompra.diasMedios === null ? '—' : `${decimal(h.recompra.diasMedios, 1)} dias`} dica="Da primeira compra do Express à primeira do 2.0" />
        </div>
        <p className="mt-3 text-[11px] text-apagado">
          {h.recompra.disponivel
            ? 'Nenhum dado pessoal de comprador chega a esta tela: o cruzamento usa um hash do e-mail com SALT_HASH, gerado no GitHub Action.'
            : 'Cruzamento desligado: cadastre o Secret SALT_HASH no repositório para ativar.'}
        </p>
      </Cartao>

      <Cartao>
        <TituloSecao>Carrinho abandonado</TituloSecao>
        <p className="text-sm text-suave">
          A Hotmart só entrega abandonos por webhook, o que exigiria um banco de dados. Para manter o projeto sem banco, consulte direto no painel da Hotmart
          (Ferramentas › Recuperador de vendas / Abandono de carrinho).
        </p>
        <a href={LINK_ABANDONO_HOTMART} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block rounded-lg border border-destaque/50 px-3 py-1.5 text-sm text-destaque hover:bg-destaque/10">
          Abrir painel da Hotmart ↗
        </a>
      </Cartao>
      </div>
    </>
  );
}
