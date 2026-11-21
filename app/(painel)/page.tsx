'use client';

import { METAS } from '@/config/metas';
import { GraficoDiario } from '@/components/Graficos';
import { usePainel } from '@/components/PainelContexto';
import { Tabela, type Coluna } from '@/components/Tabela';
import { Cartao, Carregando, Delta, Dica, Pill, TituloSecao } from '@/components/ui';
import { dataBR, dinheiro, inteiro, pct, roas } from '@/lib/formato';
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

  const cartoes: Array<{ titulo: string; valor: string; fonte: string; delta?: React.ReactNode; destaque?: boolean; sub?: string }> = [
    { titulo: 'Investimento', valor: dinheiro(k.investimento, moeda), fonte: `${fInvest} · gasto convertido para ${moeda === 'USD' ? 'US$' : 'R$'}`, delta: <Delta atual={k.investimento} anterior={a.investimento} sentido="neutro" /> },
    pixel
      ? { titulo: 'Faturamento (Meta · pixel)', valor: dinheiro(k.faturamento, moeda), fonte: 'Meta · valor de compra registrado pelo pixel (bruto, janela 7d clique + 1d visualização). Não é o dinheiro que entrou: conecte a Hotmart para o faturamento real.', delta: <Delta atual={k.faturamento} anterior={a.faturamento} /> }
      : { titulo: 'Faturamento real', valor: dinheiro(k.faturamento, moeda), fonte: 'Hotmart · valor líquido das vendas aprovadas com origem de tráfego pago (sck/utm)', delta: <Delta atual={k.faturamento} anterior={a.faturamento} /> },
    { titulo: `ROAS${pixel ? ' (Meta · pixel)' : ' real'}`, valor: roas(k.roasReal), fonte: `${fVendas} ÷ ${fInvest} · faturamento ÷ investimento`, delta: <Delta atual={k.roasReal} anterior={a.roasReal} />, destaque: true, sub: `empate ${roas(METAS.roasEmpate)} · escala ${roas(METAS.roasEscala)}` },
    pixel
      ? { titulo: 'Checkouts iniciados', valor: inteiro(k.checkouts), fonte: 'Meta · evento InitiateCheckout do pixel', delta: <Delta atual={k.checkouts} anterior={a.checkouts} />, sub: k.checkouts ? `${(k.vendas / k.checkouts * 100).toFixed(0)}% viraram compra` : undefined }
      : { titulo: 'ROAS do Meta', valor: roas(k.roasMeta), fonte: 'Meta · valor de compra do pixel ÷ gasto do Meta (só para comparação)', delta: <Delta atual={k.roasMeta} anterior={a.roasMeta} /> },
    { titulo: pixel ? 'Vendas (Meta · pixel)' : 'Vendas', valor: inteiro(k.vendas), fonte: pixel ? 'Meta · compras registradas pelo pixel' : 'Hotmart · pedidos aprovados de tráfego pago (sem contar order bump)', delta: <Delta atual={k.vendas} anterior={a.vendas} />, sub: pixel ? undefined : `Meta registrou ${inteiro(k.comprasMeta)}` },
    { titulo: `CPA${sufixo}`, valor: dinheiro(k.vendas ? k.cpa : null, moeda), fonte: `${fInvest} ÷ ${fVendas} · investimento ÷ vendas`, delta: <Delta atual={k.cpa} anterior={a.cpa} sentido="desce" /> },
    { titulo: 'Ticket médio', valor: dinheiro(k.vendas ? k.ticket : null, moeda), fonte: `${fVendas} · faturamento ÷ vendas`, delta: <Delta atual={k.ticket} anterior={a.ticket} /> },
    { titulo: 'Resultado', valor: dinheiro(k.resultado, moeda), fonte: `${fVendas} − ${fInvest} · faturamento − investimento`, delta: <Delta atual={k.resultado} anterior={a.resultado} /> },
  ];

  const r = painel.ritmo;
  const corRitmo = r.ritmo > METAS.ritmoVerbaMax || r.ritmo < METAS.ritmoVerbaMin ? 'bg-alerta' : 'bg-bom';

  const colunas: Coluna<LinhaFunilPainel>[] = [
    { chave: 'nome', titulo: 'Funil', valor: (l) => l.nome, render: (l) => <span className={l.chave === 'nao-classificada' ? 'text-alerta' : ''}>{l.nome}</span>, fixa: true },
    { chave: 'investimento', titulo: 'Investimento', alinhar: 'dir', valor: (l) => l.investimento, render: (l) => dinheiro(l.investimento, moeda), dica: `${fInvest} · ${per}` },
    { chave: 'vendas', titulo: 'Vendas', alinhar: 'dir', valor: (l) => l.vendas, render: (l) => inteiro(l.vendas), dica: pixel ? `Meta · compras do pixel · ${per}` : `Hotmart · por sck/utm · ${per}` },
    { chave: 'cpa', titulo: 'CPA', alinhar: 'dir', valor: (l) => (l.vendas ? l.cpa : null), render: (l) => dinheiro(l.vendas ? l.cpa : null, moeda), dica: `Investimento ÷ vendas (${fVendas})` },
    { chave: 'roasReal', titulo: pixel ? 'ROAS (pixel)' : 'ROAS real', alinhar: 'dir', valor: (l) => l.roasReal, render: (l) => roas(l.investimento ? l.roasReal : null), dica: pixel ? 'Meta · valor do pixel ÷ investimento' : 'Hotmart (líquido) ÷ investimento', classe: (l) => (l.investimento ? (l.roasReal >= METAS.roasEscala ? 'text-bom' : l.roasReal < METAS.roasEmpate ? 'text-ruim' : '') : '') },
    ...(pixel ? [] : [{ chave: 'roasMeta', titulo: 'ROAS Meta', alinhar: 'dir', valor: (l) => l.roasMeta, render: (l) => (l.plataforma === 'google' ? '—' : roas(l.investimento ? l.roasMeta : null)), dica: 'Meta · valor do pixel ÷ gasto' } as Coluna<LinhaFunilPainel>]),
    { chave: 'status', titulo: 'Status', valor: (l) => l.status, render: (l) => <Pill valor={l.status} />, dica: `Escalar: ROAS ≥ ${roas(METAS.roasEscala)} no período e nos últimos 3 dias · Manter: ≥ ${roas(METAS.roasEmpate)} · Atenção: até 20% abaixo do empate · Pausar: abaixo disso` },
  ];

  return (
    <div className="space-y-5">
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

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cartoes.map((c) => (
          <Cartao key={c.titulo} className={c.destaque ? 'border-destaque/50' : ''}>
            <Dica texto={`Fonte: ${c.fonte} · ${per}`}>
              <h3 className="text-xs uppercase tracking-wide text-suave underline decoration-dotted decoration-apagado underline-offset-4">{c.titulo}</h3>
            </Dica>
            <p className={`num mt-1 font-titulo text-2xl font-semibold ${c.destaque ? 'text-destaque' : ''}`}>{c.valor}</p>
            <div className="mt-1 flex flex-wrap items-center gap-x-2">{c.delta}</div>
            {c.sub && <p className="mt-0.5 text-[11px] text-apagado">{c.sub}</p>}
          </Cartao>
        ))}
        <Cartao className="sm:col-span-2 lg:col-span-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <Dica texto="Meta BR · gasto do mês atual (sempre BR, independente do filtro) ÷ verba mensal, comparado com a fração do mês já decorrida">
              <h3 className="text-xs uppercase tracking-wide text-suave underline decoration-dotted decoration-apagado underline-offset-4">Ritmo da verba BR (mês atual)</h3>
            </Dica>
            {r.disponivel ? (
              <p className="num text-sm">
                <span className="font-titulo text-lg font-semibold">{dinheiro(r.gastoMes)}</span>
                <span className="text-suave"> de {dinheiro(r.verba, 'BRL', true)} · {pct(r.pctGasto, 0)} gasto com {pct(r.pctMes, 0)} do mês · ritmo {pct(r.ritmo, 0)}</span>
              </p>
            ) : (
              <p className="text-sm text-ruim">Meta BR sem dados</p>
            )}
          </div>
          {r.disponivel && (
            <div className="relative mt-2 h-2.5 rounded-full bg-superficie2" role="img" aria-label={`${pct(r.pctGasto, 0)} da verba gasta, ${pct(r.pctMes, 0)} do mês decorrido`}>
              <div className={`h-full rounded-full ${corRitmo}`} style={{ width: `${Math.min(100, r.pctGasto * 100)}%` }} />
              <div className="absolute -top-1 w-0.5 bg-texto" style={{ left: `${Math.min(100, r.pctMes * 100)}%`, height: 18 }} title="Hoje" />
            </div>
          )}
        </Cartao>
      </div>

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

