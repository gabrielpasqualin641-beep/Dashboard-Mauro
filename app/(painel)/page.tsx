'use client';

import { METAS } from '@/config/metas';
import { GraficoDiario } from '@/components/Graficos';
import { usePainel } from '@/components/PainelContexto';
import { Tabela, type Coluna } from '@/components/Tabela';
import { Cartao, Carregando, Dica, KpiCard, Pill, TituloSecao, type KpiProps } from '@/components/ui';
import { Icone } from '@/components/icones';
import { BarraFerramentas, BotaoExportar } from '@/components/Exportar';
import { dataBR, dinheiro, inteiro, pct, roas } from '@/lib/formato';
import { n, type Folha } from '@/lib/csv';
import type { LinhaFunilPainel } from '@/lib/painel';

export default function VisaoGeral() {
  const { painel } = usePainel();
  if (!painel) return <Carregando />;
  const { kpis: k, kpisAnterior: a, moeda } = painel;
  const per = `${dataBR(painel.periodo.de)} a ${dataBR(painel.periodo.ate)}`;
  const temGoogle = painel.pais !== 'BR' && painel.google.estado !== 'nao-configurado';
  const fInvest = temGoogle ? 'Meta + Google' : 'Meta';

  // Sem Hotmart, vendas e faturamento vêm do pixel do Meta (rotulado em toda a tela).
  const pixel = painel.origemVendas === 'meta-pixel';
  const fVendas = pixel ? 'Meta · pixel' : 'Hotmart';
  const sufixo = pixel ? ' (Meta · pixel)' : ' real';

  // Cartão herói (ROAS) + principais no topo, secundários abaixo.
  const heroi: KpiProps = {
    titulo: `ROAS${pixel ? ' (Meta · pixel)' : ' real'}`,
    valor: roas(k.roasReal),
    icone: 'roas',
    fonte: `${fVendas} ÷ ${fInvest} · faturamento ÷ investimento`,
    delta: { atual: k.roasReal, anterior: a.roasReal },
    destaque: true,
    sub: `meta: empate ${roas(METAS.roasEmpate)} · escala ${roas(METAS.roasEscala)}`,
  };
  const principais: KpiProps[] = [
    { titulo: 'Investimento', valor: dinheiro(k.investimento, moeda), icone: 'investimento', fonte: `${fInvest} · gasto convertido para ${moeda === 'USD' ? 'US$' : 'R$'}`, delta: { atual: k.investimento, anterior: a.investimento, sentido: 'neutro' } },
    pixel
      ? { titulo: 'Faturamento (Meta · pixel)', valor: dinheiro(k.faturamento, moeda), icone: 'faturamento', fonte: 'Meta · valor de compra registrado pelo pixel (bruto, janela 7d clique + 1d visualização). Não é o dinheiro que entrou: conecte a Hotmart para o faturamento real.', delta: { atual: k.faturamento, anterior: a.faturamento } }
      : { titulo: 'Faturamento real', valor: dinheiro(k.faturamento, moeda), icone: 'faturamento', fonte: 'Hotmart · valor líquido das vendas aprovadas com origem de tráfego pago (sck/utm)', delta: { atual: k.faturamento, anterior: a.faturamento } },
    { titulo: 'Resultado', valor: dinheiro(k.resultado, moeda), icone: 'resultado', fonte: `${fVendas} − ${fInvest} · faturamento − investimento`, delta: { atual: k.resultado, anterior: a.resultado }, valorClasse: k.resultado < 0 ? 'text-ruim' : 'text-bom' },
  ];
  const secundarios: KpiProps[] = [
    { titulo: pixel ? 'Vendas (Meta · pixel)' : 'Vendas', valor: inteiro(k.vendas), icone: 'vendas', fonte: pixel ? 'Meta · compras registradas pelo pixel' : 'Hotmart · pedidos aprovados de tráfego pago (sem contar order bump)', delta: { atual: k.vendas, anterior: a.vendas }, sub: pixel ? undefined : `Meta registrou ${inteiro(k.comprasMeta)}` },
    pixel
      ? { titulo: 'Checkouts iniciados', valor: inteiro(k.checkouts), icone: 'checkouts', fonte: 'Meta · evento InitiateCheckout do pixel', delta: { atual: k.checkouts, anterior: a.checkouts }, sub: k.checkouts ? `${((k.vendas / k.checkouts) * 100).toFixed(0)}% viraram compra` : undefined }
      : { titulo: 'ROAS do Meta', valor: roas(k.roasMeta), icone: 'roasMeta', fonte: 'Meta · valor de compra do pixel ÷ gasto do Meta (só para comparação)', delta: { atual: k.roasMeta, anterior: a.roasMeta } },
    { titulo: `CPA${sufixo}`, valor: dinheiro(k.vendas ? k.cpa : null, moeda), icone: 'cpa', fonte: `${fInvest} ÷ ${fVendas} · investimento ÷ vendas`, delta: { atual: k.cpa, anterior: a.cpa, sentido: 'desce' } },
    { titulo: 'Ticket médio', valor: dinheiro(k.vendas ? k.ticket : null, moeda), icone: 'ticket', fonte: `${fVendas} · faturamento ÷ vendas`, delta: { atual: k.ticket, anterior: a.ticket } },
  ];

  const r = painel.ritmo;
  const corRitmo = r.ritmo > METAS.ritmoVerbaMax || r.ritmo < METAS.ritmoVerbaMin ? 'from-alerta/80 to-alerta' : 'from-bom/70 to-bom';

  const colunas: Coluna<LinhaFunilPainel>[] = [
    { chave: 'nome', titulo: 'Funil', valor: (l) => l.nome, render: (l) => <span className={l.chave === 'nao-classificada' ? 'text-alerta' : ''}>{l.nome}</span>, fixa: true },
    { chave: 'investimento', titulo: 'Investimento', alinhar: 'dir', valor: (l) => l.investimento, render: (l) => dinheiro(l.investimento, moeda), dica: `${fInvest} · ${per}` },
    { chave: 'vendas', titulo: 'Vendas', alinhar: 'dir', valor: (l) => l.vendas, render: (l) => inteiro(l.vendas), dica: pixel ? `Meta · compras do pixel · ${per}` : `Hotmart · por sck/utm · ${per}` },
    { chave: 'cpa', titulo: 'CPA', alinhar: 'dir', valor: (l) => (l.vendas ? l.cpa : null), render: (l) => dinheiro(l.vendas ? l.cpa : null, moeda), dica: `Investimento ÷ vendas (${fVendas})` },
    { chave: 'roasReal', titulo: pixel ? 'ROAS (pixel)' : 'ROAS real', alinhar: 'dir', valor: (l) => l.roasReal, render: (l) => roas(l.investimento ? l.roasReal : null), dica: pixel ? 'Meta · valor do pixel ÷ investimento' : 'Hotmart (líquido) ÷ investimento', classe: (l) => (l.investimento ? (l.roasReal >= METAS.roasEscala ? 'text-bom' : l.roasReal < METAS.roasEmpate ? 'text-ruim' : '') : '') },
    ...(pixel ? [] : [{ chave: 'roasMeta', titulo: 'ROAS Meta', alinhar: 'dir', valor: (l) => l.roasMeta, render: (l) => (l.plataforma === 'google' ? '—' : roas(l.investimento ? l.roasMeta : null)), dica: 'Meta · valor do pixel ÷ gasto' } as Coluna<LinhaFunilPainel>]),
    { chave: 'status', titulo: 'Status', valor: (l) => l.status, render: (l) => <Pill valor={l.status} />, dica: `Escalar: ROAS ≥ ${roas(METAS.roasEscala)} no período e nos últimos 3 dias · Manter: ≥ ${roas(METAS.roasEmpate)} · Atenção: até 20% abaixo do empate · Pausar: abaixo disso` },
  ];

  const folhasCSV = (): Folha[] => {
    const varia = (atual: number, ant: number) => (ant ? n(((atual - ant) / Math.abs(ant)) * 100, 1) : null);
    const kpi = (metrica: string, atual: number, ant: number) => [metrica, n(atual), n(ant), varia(atual, ant)];
    return [
      {
        nome: 'KPIs',
        colunas: ['metrica', 'valor', 'periodo_anterior', 'variacao_%'],
        linhas: [
          kpi('investimento', k.investimento, a.investimento),
          kpi(pixel ? 'faturamento_pixel' : 'faturamento_real', k.faturamento, a.faturamento),
          kpi(pixel ? 'roas_pixel' : 'roas_real', k.roasReal, a.roasReal),
          kpi('roas_meta', k.roasMeta, a.roasMeta),
          kpi('vendas', k.vendas, a.vendas),
          kpi('checkouts', k.checkouts, a.checkouts),
          kpi('cpa', k.cpa, a.cpa),
          kpi('ticket_medio', k.ticket, a.ticket),
          kpi('resultado', k.resultado, a.resultado),
          ['compras_meta_pixel', k.comprasMeta, a.comprasMeta, varia(k.comprasMeta, a.comprasMeta)],
        ],
      },
      {
        nome: 'Por funil',
        colunas: ['funil', 'pais', 'investimento', 'investimento_anterior', 'vendas', 'cpa', 'roas_real', 'roas_meta', 'faturamento', 'status'],
        linhas: painel.funis.map((f) => [f.nome, f.pais ?? '', n(f.investimento), n(f.investimentoAnterior), f.vendas, n(f.cpa), n(f.roasReal), n(f.roasMeta), n(f.faturamento), f.status]),
      },
      {
        nome: 'Diario',
        colunas: ['data', 'investimento', 'faturamento', 'roas', 'vendas'],
        linhas: painel.diario.map((d) => [d.date, n(d.investimento), n(d.faturamento), n(d.roas), d.vendas]),
      },
    ];
  };

  return (
    <div className="space-y-5">
      <BarraFerramentas
        titulo={<p className="text-xs text-apagado">{painel.pais === 'TODOS' ? 'BR + US' : painel.pais} · {per}{pixel ? ' · vendas do pixel do Meta' : ''}</p>}
      >
        <BotaoExportar arquivo={`visao-geral_${painel.periodo.de}_a_${painel.periodo.ate}`} folhas={folhasCSV} />
      </BarraFerramentas>
      {pixel && (
        <div className="rounded-lg border border-alerta/50 bg-alerta/10 px-3 py-2 text-sm text-texto">
          <strong className="text-alerta">Vendas e faturamento vindos do pixel do Meta.</strong> A Hotmart não está conectada, então estes números são o que
          o Meta registrou (valor bruto, sujeito a perdas e duplicidades do pixel), não o dinheiro que entrou. Ao cadastrar os Secrets da Hotmart, a
          dashboard passa a usar as vendas reais sozinha.
        </div>
      )}

      {painel.divergencia.alerta && (
        <div className="flex items-start gap-2 rounded-lg border border-acao/60 bg-acao/10 px-3 py-2 text-sm">
          <span className="font-semibold text-acao">Divergência Meta × Hotmart</span>
          <span className="text-texto">
            Meta registrou {inteiro(painel.divergencia.comprasMeta)} compras e a Hotmart {inteiro(painel.divergencia.vendasHotmart)} vendas de tráfego
            pago ({pct(painel.divergencia.diferenca, 0)} de diferença). Confira pixel/CAPI e os parâmetros sck.
          </span>
        </div>
      )}

      {/* Topo: ROAS em destaque + três indicadores principais */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
        <div className="lg:row-span-1">
          <KpiCard {...heroi} />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:col-span-3">
          {principais.map((c) => (
            <KpiCard key={c.titulo} {...c} />
          ))}
        </div>
      </div>

      {/* Indicadores secundários */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {secundarios.map((c) => (
          <KpiCard key={c.titulo} {...c} />
        ))}
      </div>

      <Cartao>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Dica texto="Meta BR · gasto do mês atual (sempre BR, independente do filtro) ÷ verba mensal, comparado com a fração do mês já decorrida">
            <h3 className="flex items-center gap-2 font-titulo text-sm font-semibold text-texto">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-destaque/10 text-destaque"><Icone nome="verba" width={15} height={15} /></span>
              Ritmo da verba BR <span className="font-sans text-xs font-normal text-apagado">· mês atual</span>
            </h3>
          </Dica>
          {r.disponivel ? (
            <p className="num text-sm">
              <span className="font-titulo text-lg font-semibold">{dinheiro(r.gastoMes)}</span>
              <span className="text-suave"> de {dinheiro(r.verba, 'BRL', true)} · {pct(r.pctGasto, 0)} gasto · {pct(r.pctMes, 0)} do mês · ritmo {pct(r.ritmo, 0)}</span>
            </p>
          ) : (
            <p className="text-sm text-ruim">Meta BR sem dados</p>
          )}
        </div>
        {r.disponivel && (
          <div className="relative mt-3 h-3 overflow-hidden rounded-full bg-superficie2 ring-1 ring-inset ring-white/5" role="img" aria-label={`${pct(r.pctGasto, 0)} da verba gasta, ${pct(r.pctMes, 0)} do mês decorrido`}>
            <div className={`h-full rounded-full bg-gradient-to-r ${corRitmo}`} style={{ width: `${Math.min(100, r.pctGasto * 100)}%` }} />
            <div className="absolute top-1/2 h-5 w-0.5 -translate-y-1/2 rounded bg-texto shadow" style={{ left: `${Math.min(100, r.pctMes * 100)}%` }} title="Hoje" />
          </div>
        )}
      </Cartao>

      <Cartao>
        <TituloSecao extra={<span className="text-xs text-apagado">Fonte: {fInvest} (investimento) e {pixel ? 'pixel do Meta' : 'Hotmart'} (faturamento)</span>}>Investimento e ROAS{sufixo} por dia</TituloSecao>
        <GraficoDiario dados={painel.diario} moeda={moeda} rotuloRoas={`ROAS${sufixo}`} rotuloFaturamento={pixel ? 'Faturamento (pixel)' : 'Faturamento real'} />
      </Cartao>

      <Cartao>
        <TituloSecao extra={<span className="text-xs text-apagado">{per}</span>}>Por funil</TituloSecao>
        <Tabela linhas={painel.funis} colunas={colunas} chaveLinha={(l) => l.chave} />
      </Cartao>
    </div>
  );
}

