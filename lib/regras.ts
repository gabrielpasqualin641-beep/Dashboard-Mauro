/**
 * Regras de diagnóstico — "Onde estamos errando".
 *
 * Funções puras: recebem números já agregados e devolvem sempre um Alerta
 * (`nivel: 'ok'` quando a regra não dispara). Todos os valores em R$.
 * Cada regra tem teste em tests/regras.test.ts.
 */
import { METAS, type Metas } from '@/config/metas';
import type { Alerta, StatusFonte } from './tipos';

const brl = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 });
const pct = (v: number, casas = 0) => `${(v * 100).toFixed(casas).replace('.', ',')}%`;
const x2 = (v: number) => v.toFixed(2).replace('.', ',');

function ok(regra: number, titulo: string, onde = ''): Alerta {
  return { regra, nivel: 'ok', titulo, onde, numero: '', acao: '', verbaEmRisco: 0 };
}

const div = (a: number, b: number) => (b > 0 ? a / b : 0);

// ───────────────────────────── Anúncios ─────────────────────────────

export interface StatsAnuncio {
  adId: string;
  adName: string;
  adsetName: string;
  funilNome: string;
  gasto: number;
  vendas: number;
  checkouts: number;
  qualityRanking: string;
}

/** 1. Gasto > multiplicador × CPA médio do funil e 0 vendas → Pausar. */
export function regra1AnuncioSemVenda(ad: StatsAnuncio, cpaMedioFunil: number, m: Metas = METAS): Alerta {
  const limite = m.cpaCorteMultiplicador * cpaMedioFunil;
  if (cpaMedioFunil > 0 && ad.vendas === 0 && ad.gasto > limite) {
    return {
      regra: 1,
      nivel: 'critico',
      titulo: 'Pausar anúncio: gastou acima do CPA sem vender',
      onde: `${ad.funilNome} › ${ad.adsetName} › ${ad.adName}`,
      numero: `${brl(ad.gasto)} gastos, 0 vendas (limite ${brl(limite)} = ${x2(m.cpaCorteMultiplicador)} × CPA ${brl(cpaMedioFunil)})`,
      acao: 'Pausar o anúncio e redistribuir a verba para os anúncios que vendem no mesmo conjunto.',
      verbaEmRisco: ad.gasto,
    };
  }
  return ok(1, 'Anúncio dentro do CPA', ad.adName);
}

/** 2. Express: gasto ≥ corte, 0 vendas e 0 checkouts → Pausar. */
export function regra2ExpressSemCheckout(ad: StatsAnuncio, m: Metas = METAS): Alerta {
  if (ad.gasto >= m.expressCorteGasto && ad.vendas === 0 && ad.checkouts === 0) {
    return {
      regra: 2,
      nivel: 'critico',
      titulo: 'Pausar anúncio do Express: gasto sem checkout nem venda',
      onde: `${ad.funilNome} › ${ad.adsetName} › ${ad.adName}`,
      numero: `${brl(ad.gasto)} gastos, 0 checkouts, 0 vendas (corte ${brl(m.expressCorteGasto)})`,
      acao: 'Pausar. Um produto de R$47 que não gera nem checkout com esse gasto não vai se pagar.',
      verbaEmRisco: ad.gasto,
    };
  }
  return ok(2, 'Express dentro do corte', ad.adName);
}

export interface StatsAnuncio3d {
  adName: string;
  adsetName: string;
  funilNome: string;
  gasto: number;
  receita: number;
  vendas: number;
}

/** 3. ROAS real > escala nos últimos 3 dias e ≥ 2 vendas → Escalar 20% no conjunto. */
export function regra3Escalar(ad: StatsAnuncio3d, m: Metas = METAS): Alerta {
  const roas = div(ad.receita, ad.gasto);
  if (ad.gasto > 0 && roas > m.roasEscala && ad.vendas >= 2) {
    return {
      regra: 3,
      nivel: 'atencao',
      titulo: 'Escalar 20%: anúncio com ROAS acima da meta',
      onde: `${ad.funilNome} › ${ad.adsetName} › ${ad.adName}`,
      numero: `ROAS ${x2(roas)} em 3 dias com ${ad.vendas} vendas (meta ${x2(m.roasEscala)})`,
      acao: `Aumentar 20% o orçamento do conjunto "${ad.adsetName}" e reavaliar em 3 dias.`,
      verbaEmRisco: 0,
    };
  }
  return ok(3, 'Sem sinal de escala', ad.adName);
}

/** 4. Ranking de qualidade "abaixo da média" (10% ou 20% mais baixos) → trocar criativo. */
export function regra4QualidadeBaixa(ad: StatsAnuncio): Alerta {
  if (ad.gasto > 0 && (ad.qualityRanking === 'BELOW_AVERAGE_10' || ad.qualityRanking === 'BELOW_AVERAGE_20')) {
    const faixa = ad.qualityRanking === 'BELOW_AVERAGE_10' ? '10%' : '20%';
    return {
      regra: 4,
      nivel: 'atencao',
      titulo: 'Trocar criativo: qualidade abaixo da média',
      onde: `${ad.funilNome} › ${ad.adName}`,
      numero: `Ranking de qualidade entre os ${faixa} mais baixos (${brl(ad.gasto)} no período)`,
      acao: 'Substituir por nova variação do conceito (gancho e primeiros 3s diferentes).',
      verbaEmRisco: ad.gasto,
    };
  }
  return ok(4, 'Qualidade ok', ad.adName);
}

export interface StatsConjunto {
  adsetName: string;
  funilNome: string;
  remarketing: boolean;
  frequencia7d: number;
  gasto7d: number;
}

/** 5. Frequência 7d acima do limite (remarketing ou público aberto) → público saturado. */
export function regra5Frequencia(c: StatsConjunto, m: Metas = METAS): Alerta {
  const limite = c.remarketing ? m.frequenciaMaxRmk7d : m.frequenciaMaxAberto7d;
  if (c.frequencia7d > limite) {
    return {
      regra: 5,
      nivel: 'atencao',
      titulo: 'Público saturado: frequência alta',
      onde: `${c.funilNome} › ${c.adsetName}`,
      numero: `Frequência 7d ${x2(c.frequencia7d)} (limite ${x2(limite)}${c.remarketing ? ', remarketing' : ', público aberto'})`,
      acao: c.remarketing
        ? 'Ampliar a janela do remarketing ou reduzir verba; renovar os criativos.'
        : 'Abrir o público (mais idades/interesses ou Advantage+) ou reduzir verba.',
      verbaEmRisco: c.gasto7d,
    };
  }
  return ok(5, 'Frequência ok', c.adsetName);
}

export interface StatsCtr {
  adName: string;
  funilNome: string;
  ctrAtual: number;
  ctrAnterior: number;
  freqAtual: number;
  freqAnterior: number;
  impressoesAtual: number;
  impressoesAnterior: number;
  gasto7d: number;
}

/** 6. CTR do link caiu > 30% vs 7 dias anteriores, com frequência subindo → criativo cansando. */
export function regra6CriativoCansando(s: StatsCtr, m: Metas = METAS): Alerta {
  const volume = s.impressoesAtual >= m.minImpressoesCtr && s.impressoesAnterior >= m.minImpressoesCtr;
  const queda = s.ctrAnterior > 0 ? 1 - s.ctrAtual / s.ctrAnterior : 0;
  // Tolerância de ponto flutuante: queda de exatamente 30% não dispara.
  if (volume && queda - m.quedaCtrMax > 1e-9 && s.freqAtual > s.freqAnterior) {
    return {
      regra: 6,
      nivel: 'atencao',
      titulo: 'Criativo cansando: CTR caiu com frequência subindo',
      onde: `${s.funilNome} › ${s.adName}`,
      numero: `CTR do link ${pct(s.ctrAnterior, 2)} → ${pct(s.ctrAtual, 2)} (−${pct(queda)}); frequência ${x2(s.freqAnterior)} → ${x2(s.freqAtual)}`,
      acao: 'Subir nova variação do criativo antes que o CPA suba.',
      verbaEmRisco: s.gasto7d * queda,
    };
  }
  return ok(6, 'CTR estável', s.adName);
}

// ─────────────────────────── Página e checkout ───────────────────────────

export interface StatsFunil {
  chave: string;
  nome: string;
  gasto: number;
  impressoes: number;
  cliquesLink: number;
  lpv: number;
  checkouts: number;
  vendas: number; // Hotmart (real)
  comprasMeta: number;
  receita: number; // líquido Hotmart, R$
  temQuiz: boolean;
  quizInicio: number;
  quizFim: number;
}

/** 7. LPV ÷ cliques < mínimo → página lenta ou carregando mal. */
export function regra7PaginaLenta(f: StatsFunil, m: Metas = METAS): Alerta {
  const taxa = div(f.lpv, f.cliquesLink);
  if (f.cliquesLink >= m.minCliques && taxa < m.lpvPorCliqueMin) {
    return {
      regra: 7,
      nivel: 'atencao',
      titulo: 'Página lenta ou carregando mal',
      onde: f.nome,
      numero: `${pct(taxa)} dos cliques viram visualização da página (mínimo ${pct(m.lpvPorCliqueMin)})`,
      acao: 'Testar a página no celular em 4G (PageSpeed), reduzir imagens/scripts e conferir o link do anúncio.',
      verbaEmRisco: f.gasto * (1 - taxa),
    };
  }
  return ok(7, 'Carregamento ok', f.nome);
}

/** 8. Checkout ÷ LPV < 50% do mesmo indicador do F1 → problema na página. */
export function regra8PaginaNaoConverte(f: StatsFunil, referencia: StatsFunil, m: Metas = METAS): Alerta {
  const taxa = div(f.checkouts, f.lpv);
  const ref = div(referencia.checkouts, referencia.lpv);
  if (f.chave !== referencia.chave && f.lpv >= m.minLpv && ref > 0 && taxa < ref * m.checkoutVsReferenciaMin) {
    return {
      regra: 8,
      nivel: 'critico',
      titulo: 'Problema na página: pouca gente vai para o checkout',
      onde: f.nome,
      numero: `Checkout ÷ visualização ${pct(taxa, 1)} vs ${pct(ref, 1)} no ${referencia.nome} (< ${pct(m.checkoutVsReferenciaMin)} dele)`,
      acao: 'Revisar oferta, prova (depoimentos), clareza do preço e o botão/CTA acima da dobra.',
      verbaEmRisco: f.gasto * (1 - taxa / ref),
    };
  }
  return ok(8, 'Página converte', f.nome);
}

/** 9. Compras ÷ checkout < 25% → problema no checkout. */
export function regra9Checkout(f: StatsFunil, m: Metas = METAS): Alerta {
  const taxa = div(f.vendas, f.checkouts);
  if (f.checkouts >= m.minCheckouts && taxa < m.compraPorCheckoutMin) {
    return {
      regra: 9,
      nivel: 'critico',
      titulo: 'Problema no checkout',
      onde: f.nome,
      numero: `${pct(taxa)} dos checkouts viram compra (${f.vendas} de ${f.checkouts}; mínimo ${pct(m.compraPorCheckoutMin)})`,
      acao: 'Conferir preço/parcelamento, meios de pagamento (Pix, cartão), link do checkout e o order bump.',
      verbaEmRisco: f.gasto * (1 - taxa / m.compraPorCheckoutMin),
    };
  }
  return ok(9, 'Checkout ok', f.nome);
}

/** 10. Quiz: conclusão ÷ início < 60% → abandono dentro do quiz. */
export function regra10Quiz(f: StatsFunil, m: Metas = METAS): Alerta {
  const taxa = div(f.quizFim, f.quizInicio);
  if (f.temQuiz && f.quizInicio >= m.minQuizInicios && taxa < m.quizConclusaoMin) {
    return {
      regra: 10,
      nivel: 'atencao',
      titulo: 'Abandono dentro do quiz',
      onde: f.nome,
      numero: `${pct(taxa)} concluem o quiz (${f.quizFim} de ${f.quizInicio}; mínimo ${pct(m.quizConclusaoMin)})`,
      acao: 'Cortar perguntas, encurtar textos e mostrar a barra de progresso.',
      verbaEmRisco: f.gasto * (1 - taxa),
    };
  }
  return ok(10, 'Quiz ok', f.nome);
}

// ─────────────────────────────── Rastreamento ───────────────────────────────

export interface StatsRastreio {
  onde: string;
  vendasHotmart: number; // vendas com origem paga (funis do Meta)
  comprasMeta: number;
  gasto: number;
}

/** 11. Meta registra < 80% das vendas pagas da Hotmart → pixel/CAPI perdendo compras. */
export function regra11Pixel(s: StatsRastreio, m: Metas = METAS): Alerta {
  const captura = div(s.comprasMeta, s.vendasHotmart);
  if (s.vendasHotmart >= m.minVendasRastreio && captura < m.pixelCapturaMin) {
    return {
      regra: 11,
      nivel: 'critico',
      titulo: 'Pixel/CAPI perdendo compras',
      onde: s.onde,
      numero: `Meta registrou ${s.comprasMeta} de ${s.vendasHotmart} vendas da Hotmart (${pct(captura)}; mínimo ${pct(m.pixelCapturaMin)})`,
      acao: 'Conferir a integração Hotmart → Pixel/API de Conversões e a deduplicação do evento Purchase.',
      verbaEmRisco: s.gasto * (1 - captura),
    };
  }
  return ok(11, 'Rastreamento ok', s.onde);
}

export interface StatsSck {
  vendas: number;
  semSck: number;
  gasto: number;
}

/** 12. Vendas sem sck > 15% → links de checkout sem parâmetro. */
export function regra12SemSck(s: StatsSck, m: Metas = METAS): Alerta {
  const fr = div(s.semSck, s.vendas);
  if (s.vendas >= m.minVendasRastreio && fr > m.semSckMax) {
    return {
      regra: 12,
      nivel: 'atencao',
      titulo: 'Links de checkout sem parâmetro sck',
      onde: 'Hotmart',
      numero: `${s.semSck} de ${s.vendas} vendas sem sck (${pct(fr)}; máximo ${pct(m.semSckMax)})`,
      acao: 'Revisar os botões das páginas: todo link para o checkout precisa do ?sck= do funil.',
      verbaEmRisco: s.gasto * fr,
    };
  }
  return ok(12, 'Origem das vendas identificada', 'Hotmart');
}

/** 13. Campanha fora do padrão de nome → nao-classificada. */
export function regra13Nomenclatura(campanhas: Array<{ nome: string; gasto: number }>): Alerta {
  const comGasto = campanhas.filter((c) => c.gasto > 0);
  if (comGasto.length) {
    const total = comGasto.reduce((s, c) => s + c.gasto, 0);
    return {
      regra: 13,
      nivel: 'atencao',
      titulo: 'Nomenclatura fora do padrão',
      onde: comGasto.map((c) => `"${c.nome}"`).join(', '),
      numero: `${comGasto.length} campanha(s) não classificadas, ${brl(total)} sem funil`,
      acao: 'Renomear no padrão "MM | PAÍS | FUNIL | OBJETIVO | PÁGINA" para entrar no funil certo.',
      verbaEmRisco: total,
    };
  }
  return ok(13, 'Todas as campanhas classificadas');
}

/** 14. Fonte sem resposta → fonte de dados fora do ar (diz qual). */
export function regra14Fontes(fontes: StatusFonte[]): Alerta {
  const fora = fontes.filter((f) => f.estado === 'erro' || f.estado === 'exemplo');
  if (fora.length) {
    return {
      regra: 14,
      nivel: 'critico',
      titulo: 'Fonte de dados fora do ar',
      onde: fora.map((f) => f.rotulo).join(', '),
      numero: fora.map((f) => `${f.rotulo}: ${f.mensagem ?? f.estado}`).join(' · '),
      acao: 'Renovar o token/credencial indicada nas variáveis de ambiente. Os números dessa fonte estão faltando.',
      verbaEmRisco: 0,
    };
  }
  return ok(14, 'Todas as fontes respondendo');
}

// ─────────────────────────────── Funil / negócio ───────────────────────────────

/** 15. ROAS real do funil < empate em 7 dias com gasto > R$700 → funil dando prejuízo. */
export function regra15Prejuizo(f: { nome: string; gasto7d: number; receita7d: number }, m: Metas = METAS): Alerta {
  const roas = div(f.receita7d, f.gasto7d);
  if (f.gasto7d > m.prejuizoGastoMin && roas < m.roasEmpate) {
    return {
      regra: 15,
      nivel: 'critico',
      titulo: 'Funil dando prejuízo',
      onde: f.nome,
      numero: `ROAS real ${x2(roas)} em 7 dias com ${brl(f.gasto7d)} gastos (empate ${x2(m.roasEmpate)})`,
      acao: 'Reduzir a verba do funil e revisar criativos, página e checkout (veja os alertas acima).',
      verbaEmRisco: Math.max(0, f.gasto7d * m.roasEmpate - f.receita7d),
    };
  }
  return ok(15, 'Funil no azul', f.nome);
}

/** 16. Ritmo da verba > 110% ou < 80% do esperado para o dia do mês. */
export function regra16Ritmo(
  s: { gastoMes: number; verbaMensal: number; diaDoMes: number; diasNoMes: number },
  m: Metas = METAS,
): Alerta {
  const esperado = (s.verbaMensal * s.diaDoMes) / s.diasNoMes;
  const ritmo = div(s.gastoMes, esperado);
  if (esperado > 0 && (ritmo > m.ritmoVerbaMax || ritmo < m.ritmoVerbaMin)) {
    const acima = ritmo > m.ritmoVerbaMax;
    return {
      regra: 16,
      nivel: 'atencao',
      titulo: acima ? 'Verba acima do planejado' : 'Verba abaixo do planejado',
      onde: 'Meta BR · mês atual',
      numero: `${brl(s.gastoMes)} gastos vs ${brl(esperado)} esperados no dia ${s.diaDoMes} (${pct(ritmo)} do ritmo)`,
      acao: acima
        ? `Reduzir orçamentos diários: a verba de ${brl(s.verbaMensal)} acaba antes do fim do mês.`
        : 'Subir orçamentos nos funis com ROAS acima do empate para usar a verba planejada.',
      verbaEmRisco: Math.abs(s.gastoMes - esperado),
    };
  }
  return ok(16, 'Verba no ritmo');
}

/** 17. Taxa de reembolso > 10% → reembolso alto. */
export function regra17Reembolso(
  s: { aprovadas: number; reembolsos: number; chargebacks: number; valorPerdido: number },
  m: Metas = METAS,
): Alerta {
  const total = s.aprovadas + s.reembolsos + s.chargebacks;
  const taxa = div(s.reembolsos + s.chargebacks, total);
  if (total >= m.minVendasReembolso && taxa > m.reembolsoMax) {
    return {
      regra: 17,
      nivel: 'critico',
      titulo: 'Reembolso alto',
      onde: 'Hotmart',
      numero: `${s.reembolsos + s.chargebacks} de ${total} vendas reembolsadas/chargeback (${pct(taxa, 1)}; máximo ${pct(m.reembolsoMax)})`,
      acao: 'Comparar a promessa dos anúncios com o que o produto entrega; revisar a página de obrigado e o onboarding.',
      verbaEmRisco: s.valorPerdido,
    };
  }
  return ok(17, 'Reembolso sob controle');
}

/** Ordena por impacto em reais; fonte fora do ar vem sempre primeiro (invalida o resto). */
export function ordenarAlertas(alertas: Alerta[]): Alerta[] {
  return alertas
    .filter((a) => a.nivel !== 'ok')
    .sort((a, b) => {
      if (a.regra === 14 && b.regra !== 14) return -1;
      if (b.regra === 14 && a.regra !== 14) return 1;
      if (b.verbaEmRisco !== a.verbaEmRisco) return b.verbaEmRisco - a.verbaEmRisco;
      if (a.nivel !== b.nivel) return a.nivel === 'critico' ? -1 : 1;
      return a.regra - b.regra;
    });
}

export type PillStatus = 'Escalar' | 'Manter' | 'Atenção' | 'Pausar' | '—';

/** Status do funil na tabela da Visão geral. */
export function statusDoFunil(
  s: { gasto: number; receita: number; roasUltimos3Dias: number[] },
  m: Metas = METAS,
): PillStatus {
  if (s.gasto <= 0) return '—';
  const roas = s.receita / s.gasto;
  const tresDias = s.roasUltimos3Dias.length === 3 && s.roasUltimos3Dias.every((r) => r > m.roasEscala);
  if (roas >= m.roasEscala && tresDias) return 'Escalar';
  if (roas >= m.roasEmpate) return 'Manter';
  if (roas >= m.roasEmpate * 0.8 || s.gasto < m.expressCorteGasto) return 'Atenção';
  return 'Pausar';
}
