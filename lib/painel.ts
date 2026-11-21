import { METAS } from '@/config/metas';
import {
  FUNIL_REFERENCIA,
  FUNIS,
  NOME_FUNIL,
  PRODUTOS,
  funilPorChave,
  type FunnelKey,
  type Pais,
} from '@/config/operacao';
import type { Cambio } from './cambio';
import { conceitoDoAnuncio } from './classificar';
import {
  diaEmSP,
  diasNoMes,
  inicioDoMes,
  listaDias,
  minDia,
  periodoAnterior,
  somarDias,
  type Periodo,
} from './datas';
import type { ChaveFonte, DadosColetados, StatusColeta } from './dados';
import { sugerirNegativa } from './negativas';
import { calcularRecompra } from './recompra';
import {
  ordenarAlertas,
  regra10Quiz,
  regra11Pixel,
  regra12SemSck,
  regra13Nomenclatura,
  regra14Fontes,
  regra15Prejuizo,
  regra16Ritmo,
  regra17Reembolso,
  regra1AnuncioSemVenda,
  regra2ExpressSemCheckout,
  regra3Escalar,
  regra4QualidadeBaixa,
  regra5Frequencia,
  regra6CriativoCansando,
  regra7PaginaLenta,
  regra8PaginaNaoConverte,
  regra9Checkout,
  statusDoFunil,
  type PillStatus,
  type StatsFunil,
} from './regras';
import type {
  Alerta,
  AlcanceMeta,
  EstadoFonte,
  FiltroPais,
  LinhaGoogle,
  LinhaMeta,
  Moeda,
  NomeFonte,
  RecompraExpress,
  StatusFonte,
  VendaHotmart,
} from './tipos';

// ───────────────────────────── Tipos de saída ─────────────────────────────

export interface Kpis {
  investimento: number;
  faturamento: number;
  roasReal: number;
  roasMeta: number;
  vendas: number;
  cpa: number;
  ticket: number;
  resultado: number;
  comprasMeta: number;
}

export interface Etapa {
  nome: string;
  valor: number;
  anterior: number;
  taxa: number | null; // em relação à etapa anterior
  taxaAnterior: number | null;
  diagnostico?: string;
}

export interface LinhaFunilPainel {
  chave: FunnelKey;
  nome: string;
  pais: Pais | null;
  plataforma: 'meta' | 'google';
  investimento: number;
  investimentoAnterior: number;
  faturamento: number;
  vendas: number;
  comprasMeta: number;
  cpa: number;
  roasReal: number;
  roasMeta: number;
  status: PillStatus;
  etapas: Etapa[];
}

export interface LinhaAnuncio {
  adId: string;
  adName: string;
  adsetName: string;
  campaignName: string;
  funnelKey: FunnelKey;
  funilNome: string;
  conceito: string;
  status: string;
  thumbnailUrl: string | null;
  gasto: number;
  impressoes: number;
  frequencia: number;
  cpm: number;
  ctrLink: number;
  cpc: number;
  gancho: number | null;
  retencao: number | null;
  lpvClique: number;
  checkouts: number;
  compras: number;
  cpa: number | null;
  roas: number;
  origemVendas: 'hotmart-utm' | 'meta';
  qualidade: string;
  acao: 'Pausar' | 'Escalar 20%' | 'Trocar criativo' | 'Criativo cansando' | 'Manter';
  spark: Array<{ date: string; gasto: number; cpa: number | null }>;
}

export interface Painel {
  geradoEm: string;
  dadosDe: string;
  janela: Periodo;
  periodo: Periodo;
  anterior: Periodo;
  hoje: string;
  pais: FiltroPais;
  moeda: Moeda;
  exemplo: boolean;
  cambio: { atual: number; fonte: string };
  fontes: StatusFonte[];
  kpis: Kpis;
  kpisAnterior: Kpis;
  ritmo: { gastoMes: number; verba: number; pctGasto: number; pctMes: number; ritmo: number; disponivel: boolean };
  diario: Array<{ date: string; investimento: number; faturamento: number; roas: number | null; vendas: number }>;
  funis: LinhaFunilPainel[];
  anuncios: LinhaAnuncio[];
  alertas: Alerta[];
  divergencia: { comprasMeta: number; vendasHotmart: number; diferenca: number; alerta: boolean };
  hotmart: {
    disponivel: boolean;
    porProduto: Array<{ produto: string; vendas: number; bruto: number; liquido: number }>;
    porSck: Array<{ sck: string; funil: string; vendas: number; liquido: number }>;
    reembolsos: {
      reembolsos: number;
      chargebacks: number;
      cancelados: number;
      valorReembolsos: number;
      valorChargebacks: number;
      taxa: number;
      total: number;
    };
    bump: { principais: number; comBump: number; taxa: number; receitaExtra: number };
    recompra: RecompraExpress & { disponivel: boolean };
  };
  google: {
    estado: EstadoFonte;
    totais: { custo: number; cliques: number; impressoes: number; ctr: number; cpc: number; conversoes: number; valor: number };
    diario: Array<{ date: string; custo: number; cliques: number; conversoes: number }>;
    termos: Array<{ term: string; campaign: string; custo: number; cliques: number; conversoes: number; negativa: string | null }>;
    moedaConta: string;
  };
}

// ───────────────────────────── Fontes ─────────────────────────────

const ROTULO_FONTE: Record<ChaveFonte, { fonte: NomeFonte; rotulo: string }> = {
  meta_br: { fonte: 'metaBR', rotulo: 'Meta BR' },
  meta_us: { fonte: 'metaUS', rotulo: 'Meta US' },
  hotmart: { fonte: 'hotmart', rotulo: 'Hotmart' },
  google: { fonte: 'google', rotulo: 'Google Ads' },
};

export const TEXTO_MOTIVO: Record<string, string> = {
  NAO_CONFIGURADO: 'não configurado',
  TOKEN_INVALIDO: 'token inválido ou expirado',
  SEM_ACESSO_A_CONTA: 'token sem acesso à conta',
  LIMITE_DE_CHAMADAS: 'limite de chamadas da API',
  ERRO_API: 'erro na API',
  EXEMPLO: 'DADOS DE EXEMPLO',
};

/** Status de cada fonte, a partir do que o coletor registrou. */
export function statusDasFontes(dados: DadosColetados): StatusFonte[] {
  return (Object.keys(ROTULO_FONTE) as ChaveFonte[]).map((k) => {
    const f: StatusColeta = dados.fontes[k] ?? { ok: false, motivo: 'NAO_CONFIGURADO' };
    const estado: EstadoFonte = f.motivo === 'EXEMPLO'
      ? 'exemplo'
      : f.ok
        ? 'ok'
        : k === 'google' && f.motivo === 'NAO_CONFIGURADO'
          ? 'nao-configurado'
          : 'erro';
    return {
      ...ROTULO_FONTE[k],
      estado,
      mensagem: f.motivo ? TEXTO_MOTIVO[f.motivo] ?? f.motivo : undefined,
      atualizadoEm: dados.gerado_em,
    };
  });
}

// ───────────────────────────── Agregação ─────────────────────────────

const div = (a: number, b: number) => (b > 0 ? a / b : 0);
const dentro = (d: string, p: Periodo) => d >= p.de && d <= p.ate;

interface SomaMeta {
  gastoBrl: number;
  gastoUsd: number;
  impressoes: number;
  cliques: number;
  lpv: number;
  checkouts: number;
  compras: number;
  valorBrl: number;
  valorUsd: number;
  v3: number;
  tp: number;
  quizI: number;
  quizF: number;
}

function somarMeta(linhas: LinhaMeta[]): SomaMeta {
  const s: SomaMeta = { gastoBrl: 0, gastoUsd: 0, impressoes: 0, cliques: 0, lpv: 0, checkouts: 0, compras: 0, valorBrl: 0, valorUsd: 0, v3: 0, tp: 0, quizI: 0, quizF: 0 };
  for (const l of linhas) {
    s.gastoBrl += l.spendBrl;
    s.gastoUsd += l.spendUsd;
    s.impressoes += l.impressions;
    s.cliques += l.linkClicks;
    s.lpv += l.lpv;
    s.checkouts += l.initiateCheckout;
    s.compras += l.purchases;
    s.valorBrl += l.purchaseValueBrl;
    s.valorUsd += l.purchaseValueUsd;
    s.v3 += l.video3s;
    s.tp += l.thruplays;
    s.quizI += l.quizStart;
    s.quizF += l.quizComplete;
  }
  return s;
}

const ehPaga = (v: VendaHotmart) => v.status === 'aprovada' && v.funnelKey !== null;
const ehPedido = (v: VendaHotmart) => !v.isBump;

function somarVendas(vendas: VendaHotmart[]) {
  let pedidos = 0;
  let netBrl = 0;
  let netUsd = 0;
  for (const v of vendas) {
    if (v.status !== 'aprovada') continue;
    if (ehPedido(v)) pedidos++;
    netBrl += v.netBrl;
    netUsd += v.netUsd;
  }
  return { pedidos, netBrl, netUsd };
}

function kpis(
  meta: SomaMeta,
  google: { brl: number; usd: number },
  vendas: ReturnType<typeof somarVendas>,
  moeda: Moeda,
): Kpis {
  const usd = moeda === 'USD';
  const investimento = (usd ? meta.gastoUsd : meta.gastoBrl) + (usd ? google.usd : google.brl);
  const faturamento = usd ? vendas.netUsd : vendas.netBrl;
  const gastoMeta = usd ? meta.gastoUsd : meta.gastoBrl;
  return {
    investimento,
    faturamento,
    roasReal: div(faturamento, investimento),
    roasMeta: div(usd ? meta.valorUsd : meta.valorBrl, gastoMeta),
    vendas: vendas.pedidos,
    cpa: div(investimento, vendas.pedidos),
    ticket: div(faturamento, vendas.pedidos),
    resultado: faturamento - investimento,
    comprasMeta: meta.compras,
  };
}

function somarGoogle(linhas: LinhaGoogle[]) {
  return linhas.reduce(
    (s, l) => ({ brl: s.brl + l.costBrl, usd: s.usd + l.costUsd }),
    { brl: 0, usd: 0 },
  );
}

/** Preço de referência do produto do funil em R$ (CPA de corte quando o funil não vendeu). */
function ticketDoFunil(chave: FunnelKey, cambio: Cambio): number {
  if (chave === 'br-f3-express') return PRODUTOS.find((p) => p.chave === 'controle-express')!.preco;
  if (chave.startsWith('us-')) return PRODUTOS.find((p) => p.chave === 'control-20-us')!.preco * cambio.atual;
  return METAS.ticketMedioBR;
}

// ───────────────────────────── Montagem ─────────────────────────────

export interface ParamsPainel {
  periodo: Periodo;
  pais: FiltroPais;
}

/**
 * Calcula tudo o que as telas mostram, no navegador, a partir dos dados
 * descriptografados. Função pura: mesmos dados + filtros → mesmo painel.
 * "Hoje" é o dia em que o coletor rodou (America/Sao_Paulo).
 */
export function calcularPainel(dados: DadosColetados, { periodo, pais }: ParamsPainel): Painel {
  const hoje = diaEmSP(new Date(dados.gerado_em));
  const anterior = periodoAnterior(periodo);
  const ult7: Periodo = { de: somarDias(hoje, -6), ate: hoje };
  const ult3: Periodo = { de: somarDias(hoje, -2), ate: hoje };
  const ult14: Periodo = { de: somarDias(hoje, -13), ate: hoje };
  const mes: Periodo = { de: inicioDoMes(hoje), ate: hoje };
  const moeda: Moeda = pais === 'US' ? 'USD' : 'BRL';
  const cambio: Cambio = { atual: dados.cambio.usd_brl, porDia: dados.cambio.por_dia ?? {}, fonte: dados.cambio.fonte };

  const fontes = statusDasFontes(dados);
  const exemplo = Boolean(dados.exemplo);
  const dadosDe = dados.gerado_em;
  const metaBROk = Boolean(dados.fontes.meta_br?.ok);
  const hotmartOk = Boolean(dados.fontes.hotmart?.ok);
  const linhasTodas = dados.meta;
  const linhasContaBR = dados.meta.filter((l) => l.account === 'BR');

  // ── Filtro de país ──
  const noPais = (c: Pais) => pais === 'TODOS' || c === pais;
  const linhas = linhasTodas.filter((l) => noPais(l.country));
  const vendasTodas = dados.hotmart.map((v) => {
    const f = v.funnelKey ? funilPorChave(v.funnelKey) : undefined;
    return f && f.pais !== v.country ? { ...v, country: f.pais } : v;
  });
  const vendas = vendasTodas.filter((v) => noPais(v.country));
  const googleLinhas = noPais('US') ? dados.google : [];

  const lPer = linhas.filter((l) => dentro(l.date, periodo));
  const lAnt = linhas.filter((l) => dentro(l.date, anterior));
  const vPer = vendas.filter((v) => dentro(v.date, periodo));
  const vAnt = vendas.filter((v) => dentro(v.date, anterior));
  const gPer = googleLinhas.filter((g) => dentro(g.date, periodo));
  const gAnt = googleLinhas.filter((g) => dentro(g.date, anterior));

  const kpisAtual = kpis(somarMeta(lPer), somarGoogle(gPer), somarVendas(vPer.filter(ehPaga)), moeda);
  const kpisAnt = kpis(somarMeta(lAnt), somarGoogle(gAnt), somarVendas(vAnt.filter(ehPaga)), moeda);

  // ── Ritmo da verba (sempre Meta BR, mês atual) ──
  const gastoMes = linhasContaBR.filter((l) => dentro(l.date, mes) && l.country === 'BR').reduce((s, l) => s + l.spendBrl, 0);
  const diaDoMes = Number(hoje.slice(8, 10));
  const totalDias = diasNoMes(hoje);
  const ritmo = {
    gastoMes,
    verba: METAS.verbaMensalBR,
    pctGasto: div(gastoMes, METAS.verbaMensalBR),
    pctMes: diaDoMes / totalDias,
    ritmo: div(gastoMes, (METAS.verbaMensalBR * diaDoMes) / totalDias),
    disponivel: metaBROk,
  };

  // ── Diário ──
  const usd = moeda === 'USD';
  const diario = listaDias(periodo.de, periodo.ate).map((date) => {
    const m = somarMeta(lPer.filter((l) => l.date === date));
    const g = somarGoogle(gPer.filter((x) => x.date === date));
    const v = somarVendas(vPer.filter((x) => x.date === date && ehPaga(x)));
    const investimento = (usd ? m.gastoUsd + g.usd : m.gastoBrl + g.brl);
    const faturamento = usd ? v.netUsd : v.netBrl;
    return { date, investimento, faturamento, roas: investimento > 0 ? faturamento / investimento : null, vendas: v.pedidos };
  });

  // ── Funis ──
  const funisVisiveis = FUNIS.filter((f) => noPais(f.pais));
  const chavesFunil: FunnelKey[] = [...funisVisiveis.map((f) => f.chave)];
  if (lPer.some((l) => l.funnelKey === 'nao-classificada') || lAnt.some((l) => l.funnelKey === 'nao-classificada')) {
    chavesFunil.push('nao-classificada');
  }

  const statsFunilBrl = (chave: FunnelKey, ls: LinhaMeta[], vs: VendaHotmart[], gs: LinhaGoogle[]): StatsFunil => {
    const f = funilPorChave(chave);
    const m = somarMeta(ls.filter((l) => l.funnelKey === chave));
    const v = somarVendas(vs.filter((x) => x.funnelKey === chave && ehPaga(x)));
    const gl = chave === 'us-google' ? gs : [];
    const g = somarGoogle(gl);
    return {
      chave,
      nome: NOME_FUNIL[chave],
      gasto: m.gastoBrl + g.brl,
      impressoes: m.impressoes + gl.reduce((s, x) => s + x.impressions, 0),
      cliquesLink: m.cliques + gl.reduce((s, x) => s + x.clicks, 0),
      lpv: m.lpv,
      checkouts: m.checkouts,
      vendas: v.pedidos,
      comprasMeta: m.compras,
      receita: v.netBrl,
      temQuiz: f?.temQuiz ?? false,
      quizInicio: m.quizI,
      quizFim: m.quizF,
    };
  };

  const statsPer = new Map(chavesFunil.map((k) => [k, statsFunilBrl(k, lPer, vPer, gPer)]));
  const statsAnt = new Map(chavesFunil.map((k) => [k, statsFunilBrl(k, lAnt, vAnt, gAnt)]));

  const funis: LinhaFunilPainel[] = chavesFunil.map((chave) => {
    const f = funilPorChave(chave);
    const ls = lPer.filter((l) => l.funnelKey === chave);
    const m = somarMeta(ls);
    const mAnt = somarMeta(lAnt.filter((l) => l.funnelKey === chave));
    const gl = chave === 'us-google' ? gPer : [];
    const glAnt = chave === 'us-google' ? gAnt : [];
    const g = somarGoogle(gl);
    const gA = somarGoogle(glAnt);
    const v = somarVendas(vPer.filter((x) => x.funnelKey === chave && ehPaga(x)));
    const vA = somarVendas(vAnt.filter((x) => x.funnelKey === chave && ehPaga(x)));
    const investimento = usd ? m.gastoUsd + g.usd : m.gastoBrl + g.brl;
    const investimentoAnterior = usd ? mAnt.gastoUsd + gA.usd : mAnt.gastoBrl + gA.brl;
    const faturamento = usd ? v.netUsd : v.netBrl;
    const sp = statsPer.get(chave)!;
    const sa = statsAnt.get(chave)!;

    // ROAS real dos últimos 3 dias (para o status "Escalar").
    const roas3 = listaDias(ult3.de, ult3.ate).map((d) => {
      const md = somarMeta(linhas.filter((l) => l.funnelKey === chave && l.date === d));
      const gd = somarGoogle(chave === 'us-google' ? googleLinhas.filter((x) => x.date === d) : []);
      const vd = somarVendas(vendas.filter((x) => x.funnelKey === chave && x.date === d && ehPaga(x)));
      return div(vd.netBrl, md.gastoBrl + gd.brl);
    });

    const ref = statsPer.get(FUNIL_REFERENCIA[f?.pais ?? 'BR']);
    const etapas: Etapa[] = [];
    const add = (nome: string, valor: number, anteriorV: number, diag?: string) => {
      const prev = etapas[etapas.length - 1];
      etapas.push({
        nome,
        valor,
        anterior: anteriorV,
        taxa: prev ? div(valor, prev.valor) : null,
        taxaAnterior: prev ? div(anteriorV, prev.anterior) : null,
        diagnostico: diag,
      });
    };
    const diag = (a: Alerta) => (a.nivel === 'ok' ? undefined : `${a.titulo}: ${a.numero}. ${a.acao}`);
    add('Impressões', sp.impressoes, sa.impressoes);
    const ctr = div(sp.cliquesLink, sp.impressoes);
    add(
      chave === 'us-google' ? 'Cliques' : 'Cliques no link',
      sp.cliquesLink,
      sa.cliquesLink,
      sp.impressoes >= METAS.minImpressoesCtr && ctr < 0.008 && chave !== 'us-google'
        ? `CTR do link baixo (${(ctr * 100).toFixed(2).replace('.', ',')}%): o criativo não está fazendo o público clicar. Testar novos ganchos.`
        : undefined,
    );
    if (f?.plataforma !== 'google') {
      add('Visualizações da página', sp.lpv, sa.lpv, diag(regra7PaginaLenta(sp)));
      if (f?.temQuiz) {
        add('Quiz: início', sp.quizInicio, sa.quizInicio);
        add('Quiz: conclusão', sp.quizFim, sa.quizFim, diag(regra10Quiz(sp)));
      }
      add('Checkout iniciado', sp.checkouts, sa.checkouts, ref ? diag(regra8PaginaNaoConverte(sp, ref)) : undefined);
    }
    add('Compra (Hotmart)', sp.vendas, sa.vendas, f?.plataforma !== 'google' ? diag(regra9Checkout(sp)) : undefined);

    return {
      chave,
      nome: NOME_FUNIL[chave],
      pais: f?.pais ?? null,
      plataforma: f?.plataforma ?? 'meta',
      investimento,
      investimentoAnterior,
      faturamento,
      vendas: v.pedidos,
      comprasMeta: m.compras,
      cpa: div(investimento, v.pedidos),
      roasReal: div(faturamento, investimento),
      roasMeta: div(usd ? m.valorUsd : m.valorBrl, usd ? m.gastoUsd : m.gastoBrl),
      status: chave === 'nao-classificada' ? 'Atenção' : statusDoFunil({ gasto: sp.gasto, receita: sp.receita, roasUltimos3Dias: roas3 }),
      etapas,
    };
  });

  // ── Anúncios ──
  const vendasUtm = new Map<string, { vendas: number; receitaBrl: number }>();
  for (const v of vendas) {
    if (!ehPaga(v) || !v.utmContent) continue;
    const k = v.utmContent.trim().toLowerCase();
    const a = vendasUtm.get(k) ?? { vendas: 0, receitaBrl: 0 };
    if (ehPedido(v)) a.vendas++;
    a.receitaBrl += v.netBrl;
    vendasUtm.set(k, a);
  }
  const fatorFunil = new Map<FunnelKey, number>();
  for (const [k, s] of statsPer) {
    const m = somarMeta(lPer.filter((l) => l.funnelKey === k));
    fatorFunil.set(k, m.valorBrl > 0 && s.receita > 0 ? s.receita / m.valorBrl : 1 - METAS.taxaHotmart);
  }
  // Frequência real só existe para janelas fechadas pelo coletor: últimos 7 dias.
  const alcancePer = new Map<string, AlcanceMeta>();
  for (const a of dados.alcance.ad7d) alcancePer.set(a.id, a);

  const porAnuncio = new Map<string, LinhaMeta[]>();
  for (const l of linhas) {
    const arr = porAnuncio.get(l.adId) ?? [];
    arr.push(l);
    porAnuncio.set(l.adId, arr);
  }

  const atribuicao = (ls: LinhaMeta[], adId: string, adName: string, funil: FunnelKey) => {
    const m = somarMeta(ls);
    const utm = vendasUtm.get(adId.toLowerCase()) ?? vendasUtm.get(adName.trim().toLowerCase());
    if (utm) return { vendas: utm.vendas, receitaBrl: utm.receitaBrl, origem: 'hotmart-utm' as const, m };
    return { vendas: m.compras, receitaBrl: m.valorBrl * (fatorFunil.get(funil) ?? 1 - METAS.taxaHotmart), origem: 'meta' as const, m };
  };

  const alertas: Alerta[] = [];
  const anuncios: LinhaAnuncio[] = [];
  for (const [adId, todas] of porAnuncio) {
    const ls = todas.filter((l) => dentro(l.date, periodo));
    const base = todas[todas.length - 1];
    const funil = base.funnelKey;
    const funilNome = NOME_FUNIL[funil];
    const at = atribuicao(ls, adId, base.adName, funil);
    const m = at.m;
    if (ls.length === 0 || m.gastoBrl === 0) continue;
    const gasto = usd ? m.gastoUsd : m.gastoBrl;
    const alc = alcancePer.get(adId);
    const qualidade = ls[ls.length - 1]?.qualityRanking ?? 'UNKNOWN';

    const s = statsPer.get(funil);
    const cpaMedio = s && s.vendas > 0 ? s.gasto / s.vendas : ticketDoFunil(funil, cambio);
    const statsAd = {
      adId,
      adName: base.adName,
      adsetName: base.adsetName,
      funilNome,
      gasto: m.gastoBrl,
      vendas: at.vendas,
      checkouts: m.checkouts,
      qualityRanking: qualidade,
    };
    const acoes: LinhaAnuncio['acao'][] = [];
    const r2 = funil === 'br-f3-express' ? regra2ExpressSemCheckout(statsAd) : null;
    const r1 = r2 && r2.nivel !== 'ok' ? null : regra1AnuncioSemVenda(statsAd, cpaMedio);
    const r4 = regra4QualidadeBaixa(statsAd);
    const ls3 = todas.filter((l) => dentro(l.date, ult3));
    const at3 = atribuicao(ls3, adId, base.adName, funil);
    const r3 = regra3Escalar({ adName: base.adName, adsetName: base.adsetName, funilNome, gasto: at3.m.gastoBrl, receita: at3.receitaBrl, vendas: at3.vendas });
    for (const a of [r1, r2, r3, r4]) if (a) alertas.push(a);
    if ((r1 && r1.nivel !== 'ok') || (r2 && r2.nivel !== 'ok')) acoes.push('Pausar');
    if (r3.nivel !== 'ok') acoes.push('Escalar 20%');
    if (r4.nivel !== 'ok') acoes.push('Trocar criativo');

    const spark = listaDias(ult14.de, ult14.ate).map((d) => {
      const md = somarMeta(todas.filter((l) => l.date === d));
      const g = usd ? md.gastoUsd : md.gastoBrl;
      return { date: d, gasto: g, cpa: md.compras > 0 ? g / md.compras : null };
    });

    const receita = usd ? at.receitaBrl / cambio.atual : at.receitaBrl;
    anuncios.push({
      adId,
      adName: base.adName,
      adsetName: base.adsetName,
      campaignName: base.campaignName,
      funnelKey: funil,
      funilNome,
      conceito: conceitoDoAnuncio(base.adName),
      status: base.status,
      thumbnailUrl: base.thumbnailUrl,
      gasto,
      impressoes: m.impressoes,
      frequencia: alc?.frequency ?? 0,
      cpm: div(gasto, m.impressoes) * 1000,
      ctrLink: div(m.cliques, m.impressoes),
      cpc: div(gasto, m.cliques),
      gancho: m.v3 > 0 ? m.v3 / m.impressoes : null,
      retencao: m.v3 > 0 ? m.tp / m.v3 : null,
      lpvClique: div(m.lpv, m.cliques),
      checkouts: m.checkouts,
      compras: at.vendas,
      cpa: at.vendas > 0 ? gasto / at.vendas : null,
      roas: div(receita, gasto),
      origemVendas: at.origem,
      qualidade,
      acao: acoes[0] ?? 'Manter',
      spark,
    });
  }

  // Regra 6: CTR 7d vs 7d anteriores, por anúncio.
  const a7 = new Map<string, AlcanceMeta>();
  const aAnt = new Map<string, AlcanceMeta>();
  dados.alcance.ad7d.forEach((a) => a.id && a7.set(a.id, a));
  dados.alcance.ad7dAnterior.forEach((a) => a.id && aAnt.set(a.id, a));
  for (const [id, atual] of a7) {
    const ant = aAnt.get(id);
    if (!ant || !noPais(atual.country)) continue;
    const gasto7d = linhas.filter((l) => l.adId === id && dentro(l.date, ult7)).reduce((s, l) => s + l.spendBrl, 0);
    const r6 = regra6CriativoCansando({
      adName: atual.nome,
      funilNome: NOME_FUNIL[atual.funnelKey],
      ctrAtual: div(atual.linkClicks, atual.impressions),
      ctrAnterior: div(ant.linkClicks, ant.impressions),
      freqAtual: atual.frequency,
      freqAnterior: ant.frequency,
      impressoesAtual: atual.impressions,
      impressoesAnterior: ant.impressions,
      gasto7d,
    });
    alertas.push(r6);
    const linha = anuncios.find((x) => x.adId === id);
    if (r6.nivel !== 'ok' && linha && linha.acao === 'Manter') linha.acao = 'Criativo cansando';
  }

  // Regra 5: frequência 7d por conjunto.
  {
    for (const c of dados.alcance.adset7d) {
      if (!noPais(c.country)) continue;
      const gasto7d = linhas.filter((l) => l.adsetId === c.id && dentro(l.date, ult7)).reduce((s, l) => s + l.spendBrl, 0);
      alertas.push(
        regra5Frequencia({
          adsetName: c.nome,
          funilNome: NOME_FUNIL[c.funnelKey],
          remarketing: funilPorChave(c.funnelKey)?.remarketing ?? false,
          frequencia7d: c.frequency,
          gasto7d,
        }),
      );
    }
  }

  // Regras 7–10: página e checkout, por funil.
  for (const [chave, s] of statsPer) {
    if (chave === 'nao-classificada' || chave === 'us-google') continue;
    const f = funilPorChave(chave)!;
    alertas.push(regra7PaginaLenta(s), regra9Checkout(s), regra10Quiz(s));
    const ref = statsPer.get(FUNIL_REFERENCIA[f.pais]);
    if (ref) alertas.push(regra8PaginaNaoConverte(s, ref));
  }

  // Regra 11: rastreamento, por país.
  for (const p of ['BR', 'US'] as Pais[]) {
    if (!noPais(p) || !hotmartOk) continue;
    const metaFunis = FUNIS.filter((f) => f.pais === p && f.plataforma === 'meta').map((f) => f.chave as FunnelKey);
    const vendasH = vPer.filter((v) => ehPaga(v) && ehPedido(v) && v.funnelKey && metaFunis.includes(v.funnelKey)).length;
    const lp = lPer.filter((l) => l.country === p && metaFunis.includes(l.funnelKey));
    alertas.push(
      regra11Pixel({
        onde: `Meta ${p}`,
        vendasHotmart: vendasH,
        comprasMeta: lp.reduce((s, l) => s + l.purchases, 0),
        gasto: lp.reduce((s, l) => s + l.spendBrl, 0),
      }),
    );
  }

  // Regra 12: vendas sem sck.
  if (hotmartOk) {
    const pedidos = vPer.filter((v) => v.status === 'aprovada' && ehPedido(v));
    // Vendas do Google são identificadas por utm_source (não usam sck por definição).
    const semSck = pedidos.filter((v) => !v.sck && v.funnelKey !== 'us-google').length;
    alertas.push(regra12SemSck({ vendas: pedidos.length, semSck, gasto: somarMeta(lPer).gastoBrl }));
  }

  // Regra 13: campanhas fora do padrão.
  const naoClass = new Map<string, number>();
  for (const l of lPer) if (l.funnelKey === 'nao-classificada') naoClass.set(l.campaignName, (naoClass.get(l.campaignName) ?? 0) + l.spendBrl);
  alertas.push(regra13Nomenclatura([...naoClass].map(([nome, gasto]) => ({ nome, gasto }))));

  // Regra 14: fontes.
  alertas.push(regra14Fontes(fontes));

  // Regra 15: prejuízo em 7 dias, por funil.
  for (const chave of chavesFunil) {
    if (chave === 'nao-classificada') continue;
    const s7 = statsFunilBrl(chave, linhas.filter((l) => dentro(l.date, ult7)), vendas.filter((v) => dentro(v.date, ult7)), googleLinhas.filter((g) => dentro(g.date, ult7)));
    if (s7.gasto > 0 && (hotmartOk || s7.vendas > 0)) alertas.push(regra15Prejuizo({ nome: s7.nome, gasto7d: s7.gasto, receita7d: s7.receita }));
  }

  // Regra 16: ritmo da verba BR.
  if (noPais('BR') && metaBROk) {
    alertas.push(regra16Ritmo({ gastoMes, verbaMensal: METAS.verbaMensalBR, diaDoMes, diasNoMes: totalDias }));
  }

  // ── Hotmart ──
  const aprov = vPer.filter((v) => v.status === 'aprovada');
  const reemb = vPer.filter((v) => v.status === 'reembolsada');
  const cb = vPer.filter((v) => v.status === 'chargeback');
  const canc = vPer.filter((v) => v.status === 'cancelada');
  const valor = (v: VendaHotmart) => (usd ? v.grossUsd : v.grossBrl);
  const liquido = (v: VendaHotmart) => (usd ? v.netUsd : v.netBrl);
  if (hotmartOk) {
    alertas.push(
      regra17Reembolso({
        aprovadas: aprov.filter(ehPedido).length,
        reembolsos: reemb.filter(ehPedido).length,
        chargebacks: cb.filter(ehPedido).length,
        valorPerdido: [...reemb, ...cb].reduce((s, v) => s + v.grossBrl, 0),
      }),
    );
  }
  const porProduto = new Map<string, { produto: string; vendas: number; bruto: number; liquido: number }>();
  for (const v of aprov) {
    const nome = v.isBump ? `${v.productName} (order bump)` : v.productName;
    const p = porProduto.get(nome) ?? { produto: nome, vendas: 0, bruto: 0, liquido: 0 };
    p.vendas++;
    p.bruto += valor(v);
    p.liquido += liquido(v);
    porProduto.set(nome, p);
  }
  const porSck = new Map<string, { sck: string; funil: string; vendas: number; liquido: number }>();
  for (const v of aprov.filter(ehPedido)) {
    const k = v.sck || `(sem sck)|${v.funnelKey ?? ''}`;
    const p = porSck.get(k) ?? { sck: v.sck || (v.funnelKey === 'us-google' ? '(utm_source=google)' : '(sem sck)'), funil: v.funnelKey ? NOME_FUNIL[v.funnelKey] : 'Origem não identificada', vendas: 0, liquido: 0 };
    p.vendas++;
    p.liquido += liquido(v);
    porSck.set(k, p);
  }
  const principais = aprov.filter(ehPedido);
  const bumps = aprov.filter((v) => v.isBump);
  const totalReemb = aprov.filter(ehPedido).length + reemb.filter(ehPedido).length + cb.filter(ehPedido).length;

  // ── Google (página própria, sempre em US$ e independente do filtro de país) ──
  const gPerTodos = dados.google.filter((g) => dentro(g.date, periodo));
  const gTot = gPerTodos.reduce(
    (s, l) => ({
      custo: s.custo + l.costUsd,
      cliques: s.cliques + l.clicks,
      impressoes: s.impressoes + l.impressions,
      conversoes: s.conversoes + l.conversions,
      valor: s.valor + l.value,
    }),
    { custo: 0, cliques: 0, impressoes: 0, conversoes: 0, valor: 0 },
  );
  const gDiario = listaDias(periodo.de, periodo.ate).map((date) => {
    const ls = gPerTodos.filter((l) => l.date === date);
    return {
      date,
      custo: ls.reduce((s, l) => s + l.costUsd, 0),
      cliques: ls.reduce((s, l) => s + l.clicks, 0),
      conversoes: ls.reduce((s, l) => s + l.conversions, 0),
    };
  });
  const moedaG = 'USD';
  const termos = dados.termos.map((t) => {
    const custoUsd = moedaG === 'USD' ? t.cost : t.cost / cambio.atual;
    return { term: t.term, campaign: t.campaign, custo: custoUsd, cliques: t.clicks, conversoes: t.conversions, negativa: sugerirNegativa(t, custoUsd) };
  });

  // ── Divergência Meta × Hotmart (funis do Meta) ──
  const metaChaves = FUNIS.filter((f) => f.plataforma === 'meta').map((f) => f.chave as FunnelKey);
  const comprasMeta = lPer.filter((l) => metaChaves.includes(l.funnelKey)).reduce((s, l) => s + l.purchases, 0);
  const vendasHotMeta = vPer.filter((v) => ehPaga(v) && ehPedido(v) && v.funnelKey && metaChaves.includes(v.funnelKey)).length;
  const maior = Math.max(comprasMeta, vendasHotMeta);
  const diferenca = maior > 0 ? Math.abs(comprasMeta - vendasHotMeta) / maior : 0;

  return {
    geradoEm: dados.gerado_em,
    dadosDe,
    janela: dados.janela,
    periodo,
    anterior,
    hoje,
    pais,
    moeda,
    exemplo,
    cambio: { atual: cambio.atual, fonte: cambio.fonte },
    fontes,
    kpis: kpisAtual,
    kpisAnterior: kpisAnt,
    ritmo,
    diario,
    funis,
    anuncios: anuncios.sort((a, b) => b.gasto - a.gasto),
    alertas: ordenarAlertas(alertas),
    divergencia: {
      comprasMeta,
      vendasHotmart: vendasHotMeta,
      diferenca,
      alerta: Boolean(hotmartOk) && maior >= 5 && diferenca > METAS.divergenciaMetaHotmart,
    },
    hotmart: {
      disponivel: Boolean(hotmartOk),
      porProduto: [...porProduto.values()].sort((a, b) => b.liquido - a.liquido),
      porSck: [...porSck.values()].sort((a, b) => b.vendas - a.vendas),
      reembolsos: {
        reembolsos: reemb.filter(ehPedido).length,
        chargebacks: cb.filter(ehPedido).length,
        cancelados: canc.filter(ehPedido).length,
        valorReembolsos: reemb.reduce((s, v) => s + valor(v), 0),
        valorChargebacks: cb.reduce((s, v) => s + valor(v), 0),
        taxa: div(reemb.filter(ehPedido).length + cb.filter(ehPedido).length, totalReemb),
        total: totalReemb,
      },
      bump: {
        principais: principais.length,
        comBump: principais.filter((v) => v.hasBump).length,
        taxa: div(principais.filter((v) => v.hasBump).length, principais.length),
        receitaExtra: bumps.reduce((s, v) => s + liquido(v), 0),
      },
      recompra: calcularRecompra(dados.hotmart),
    },
    google: {
      estado: fontes.find((f) => f.fonte === 'google')!.estado,
      totais: {
        ...gTot,
        ctr: div(gTot.cliques, gTot.impressoes),
        cpc: div(gTot.custo, gTot.cliques),
      },
      diario: gDiario,
      termos,
      moedaConta: moedaG,
    },
  };
}
