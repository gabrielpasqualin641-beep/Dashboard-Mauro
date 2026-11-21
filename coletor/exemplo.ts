import type { Pais } from '../config/operacao';
import { METAS } from '../config/metas';
import { funilDaCampanha, paisDaCampanha } from '../lib/classificar';
import { cotacaoDoDia, type Cambio } from '../lib/cambio';
import { inicioDiaSPms, listaDias, type Periodo } from '../lib/datas';
import type { AlcanceMeta, LinhaMeta, VendaHotmart } from '../lib/tipos';
import { processarItens, type ItemHotmart } from './hotmart';
import type { DadosMetaConta } from './meta';

/**
 * DADOS DE EXEMPLO — só para rodar a dashboard localmente sem credenciais
 * (`npm run coletar -- --exemplo`). O coletor recusa este modo dentro do
 * GitHub Actions. Determinísticos e marcados em toda a interface.
 */

function rng(semente: string) {
  let h = 2166136261;
  for (let i = 0; i < semente.length; i++) h = Math.imul(h ^ semente.charCodeAt(i), 16777619);
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface AnuncioEx {
  campanha: string;
  conjunto: string;
  nome: string;
  gastoDia: number; // moeda da conta
  ctr: number; // link CTR
  cpm: number;
  lpvClique: number;
  checkoutLpv: number;
  compraCheckout: number;
  ticket: number;
  freq: number;
  qualidade: string;
  quiz?: { inicio: number; conclusao: number };
  video?: { gancho: number; retencao: number };
  status?: string;
}

const BR: AnuncioEx[] = [
  { campanha: 'MM | BR | F1-LP | VENDAS | LP1', conjunto: 'ABERTO 30-55', nome: 'VID | NOTAS-23-ANOS | V1', gastoDia: 120, ctr: 0.016, cpm: 32, lpvClique: 0.82, checkoutLpv: 0.07, compraCheckout: 0.36, ticket: 397, freq: 1.4, qualidade: 'ABOVE_AVERAGE', video: { gancho: 0.34, retencao: 0.22 } },
  { campanha: 'MM | BR | F1-LP | VENDAS | LP1', conjunto: 'ABERTO 30-55', nome: 'VID | MEDICO-EXPLICA | V2', gastoDia: 85, ctr: 0.012, cpm: 35, lpvClique: 0.78, checkoutLpv: 0.05, compraCheckout: 0.33, ticket: 397, freq: 1.6, qualidade: 'AVERAGE', video: { gancho: 0.27, retencao: 0.18 } },
  { campanha: 'MM | BR | F1-LP | VENDAS | LP1', conjunto: 'INTERESSES', nome: 'IMG | DEPOIMENTO-JOAO | V1', gastoDia: 55, ctr: 0.007, cpm: 41, lpvClique: 0.74, checkoutLpv: 0.02, compraCheckout: 0.0, ticket: 397, freq: 2.1, qualidade: 'BELOW_AVERAGE_20' },
  { campanha: 'MM | BR | F2-QUIZ | VENDAS | QUIZ', conjunto: 'ABERTO 30-55', nome: 'VID | NOTAS-23-ANOS | QUIZ', gastoDia: 95, ctr: 0.019, cpm: 30, lpvClique: 0.61, checkoutLpv: 0.04, compraCheckout: 0.3, ticket: 397, freq: 1.5, qualidade: 'AVERAGE', quiz: { inicio: 0.7, conclusao: 0.52 }, video: { gancho: 0.31, retencao: 0.2 } },
  { campanha: 'MM | BR | F2-QUIZ | VENDAS | QUIZ', conjunto: 'ABERTO 30-55', nome: 'IMG | PERGUNTA-DIRETA | V1', gastoDia: 45, ctr: 0.014, cpm: 33, lpvClique: 0.64, checkoutLpv: 0.035, compraCheckout: 0.28, ticket: 397, freq: 1.7, qualidade: 'AVERAGE', quiz: { inicio: 0.66, conclusao: 0.55 } },
  { campanha: 'MM | BR | F3-EXPRESS | VENDAS | EXPRESS', conjunto: 'ABERTO 25-55', nome: 'VID | EXPRESS-5-MIN | V1', gastoDia: 60, ctr: 0.021, cpm: 26, lpvClique: 0.8, checkoutLpv: 0.12, compraCheckout: 0.18, ticket: 47, freq: 1.3, qualidade: 'AVERAGE', video: { gancho: 0.36, retencao: 0.24 } },
  { campanha: 'MM | BR | F3-EXPRESS | VENDAS | EXPRESS', conjunto: 'ABERTO 25-55', nome: 'IMG | EXPRESS-OFERTA | V2', gastoDia: 22, ctr: 0.006, cpm: 29, lpvClique: 0.75, checkoutLpv: 0.0, compraCheckout: 0, ticket: 47, freq: 1.4, qualidade: 'BELOW_AVERAGE_10' },
  { campanha: 'MM | BR | RMK | VENDAS | LP1', conjunto: 'VISITANTES 30D', nome: 'VID | NOTAS-23-ANOS | RMK', gastoDia: 40, ctr: 0.022, cpm: 55, lpvClique: 0.85, checkoutLpv: 0.11, compraCheckout: 0.4, ticket: 397, freq: 4.8, qualidade: 'ABOVE_AVERAGE', video: { gancho: 0.4, retencao: 0.3 } },
  { campanha: 'Teste novo criativo julho', conjunto: 'Conjunto 1', nome: 'Anúncio 1', gastoDia: 12, ctr: 0.01, cpm: 30, lpvClique: 0.7, checkoutLpv: 0.03, compraCheckout: 0.2, ticket: 397, freq: 1.2, qualidade: 'UNKNOWN' },
];

const US: AnuncioEx[] = [
  { campanha: 'MM | US | F1-QUIZ | SALES | QUIZ-EN', conjunto: 'BROAD 35-65', nome: 'VID | DOCTOR-EXPLAINS | V1', gastoDia: 45, ctr: 0.015, cpm: 22, lpvClique: 0.8, checkoutLpv: 0.09, compraCheckout: 0.38, ticket: 197, freq: 1.5, qualidade: 'AVERAGE', quiz: { inicio: 0.72, conclusao: 0.66 }, video: { gancho: 0.29, retencao: 0.19 } },
  { campanha: 'MM | US | F2-LP | SALES | LP1-EN', conjunto: 'BROAD 35-65', nome: 'VID | NOTAS-23-ANOS | EN', gastoDia: 30, ctr: 0.011, cpm: 24, lpvClique: 0.76, checkoutLpv: 0.035, compraCheckout: 0.3, ticket: 197, freq: 1.8, qualidade: 'AVERAGE', video: { gancho: 0.25, retencao: 0.16 } },
];

function gerarLinhas(
  pais: Pais,
  anuncios: AnuncioEx[],
  faixa: Periodo,
  cambio: Cambio,
): LinhaMeta[] {
  const moeda = pais === 'US' ? 'USD' : 'BRL';
    const out: LinhaMeta[] = [];
  anuncios.forEach((a, i) => {
    const adId = `${pais}${100 + i}`;
    const adsetId = `${pais}S${a.conjunto.length}${a.campanha.length}`;
    for (const dia of listaDias(faixa.de, faixa.ate)) {
      if (dia < '2026-10-22') continue;
      const r = rng(`${adId}|${dia}`);
      const ruido = () => 0.75 + r() * 0.5;
      // Arredondamento estocástico: 0,4 compra/dia vira 1 compra em ~40% dos dias.
      const est = (v: number) => Math.floor(v + r());
      const spend = +(a.gastoDia * ruido()).toFixed(2);
      const impressions = Math.round((spend / a.cpm) * 1000);
      // Criativo "cansando": CTR cai nos últimos dias no conjunto de interesses.
      const idade = listaDias('2026-10-22', dia).length;
      const cansaco = a.conjunto === 'INTERESSES' ? Math.max(0.5, 1 - idade * 0.02) : 1;
      const linkClicks = Math.round(impressions * a.ctr * ruido() * cansaco);
      const lpv = Math.round(linkClicks * a.lpvClique * (0.95 + r() * 0.1));
      const quizStart = a.quiz ? Math.round(lpv * a.quiz.inicio) : 0;
      const quizComplete = a.quiz ? Math.round(quizStart * a.quiz.conclusao) : 0;
      const ic = est(lpv * a.checkoutLpv * ruido());
      const compras = Math.min(ic, est(ic * a.compraCheckout * ruido()));
      const valor = compras * a.ticket;
      const taxa = cotacaoDoDia(cambio, dia);
      const brl = (v: number) => (moeda === 'USD' ? v * taxa : v);
      const usd = (v: number) => (moeda === 'USD' ? v : v / taxa);
      const v3 = a.video ? Math.round(impressions * a.video.gancho) : 0;
      const tp = a.video ? Math.round(v3 * a.video.retencao) : 0;
      out.push({
        date: dia,
        account: pais,
        country: paisDaCampanha(a.campanha, pais),
        campaignId: `${pais}C${a.campanha.length}`,
        campaignName: a.campanha,
        adsetId,
        adsetName: a.conjunto,
        adId,
        adName: a.nome,
        funnelKey: funilDaCampanha(a.campanha),
        spend,
        spendBrl: brl(spend),
        spendUsd: usd(spend),
        currency: moeda,
        impressions,
        reach: Math.round(impressions / Math.max(1, a.freq * 0.6)),
        frequency: a.freq * 0.6,
        clicks: Math.round(linkClicks * 1.6),
        linkClicks,
        lpv,
        viewContent: lpv,
        initiateCheckout: ic,
        purchases: compras,
        purchaseValue: valor,
        purchaseValueBrl: brl(valor),
        purchaseValueUsd: usd(valor),
        video3s: v3,
        thruplays: tp,
        p25: Math.round(v3 * 0.55),
        p50: Math.round(v3 * 0.35),
        p75: Math.round(v3 * 0.25),
        p100: Math.round(v3 * a.video?.retencao! * 0.8 || 0),
        qualityRanking: a.qualidade,
        engagementRanking: a.qualidade,
        conversionRanking: 'AVERAGE',
        quizStart,
        quizComplete,
        status: a.status ?? 'ACTIVE',
        thumbnailUrl: null,
      });
    }
  });
  return out;
}

function alcance(linhas: LinhaMeta[], p: Periodo, nivel: 'ad' | 'adset', anuncios: AnuncioEx[]): AlcanceMeta[] {
  const m = new Map<string, AlcanceMeta>();
  for (const l of linhas) {
    if (l.date < p.de || l.date > p.ate) continue;
    const id = nivel === 'ad' ? l.adId : l.adsetId;
    const a = m.get(id) ?? {
      id,
      nome: nivel === 'ad' ? l.adName : l.adsetName,
      funnelKey: l.funnelKey,
      country: l.country,
      impressions: 0,
      reach: 0,
      frequency: 0,
      linkClicks: 0,
    };
    a.impressions += l.impressions;
    a.linkClicks += l.linkClicks;
    m.set(id, a);
  }
  for (const a of m.values()) {
    const base = anuncios.find((x) => (nivel === 'ad' ? x.nome === a.nome : x.conjunto === a.nome))?.freq ?? 1.5;
    // Semana mais recente com frequência um pouco maior.
    const f = base * (p.ate >= '2026-11-15' ? 1.1 : 0.9);
    a.frequency = f;
    a.reach = Math.round(a.impressions / f);
  }
  return [...m.values()];
}

export function metaExemplo(pais: Pais, janela: Periodo, ult7: Periodo, ant7: Periodo, cambio: Cambio): DadosMetaConta {
  const anuncios = pais === 'BR' ? BR : US;
  const linhas = gerarLinhas(pais, anuncios, janela, cambio);
  return {
    linhas,
    ad7d: alcance(linhas, ult7, 'ad', anuncios),
    ad7dAnterior: alcance(linhas, ant7, 'ad', anuncios),
    adset7d: alcance(linhas, ult7, 'adset', anuncios),
  };
}

const SCK_DO_FUNIL: Record<string, string> = {
  'br-f1-lp': 'f1-lp',
  'br-f2-quiz': 'f6-quiz',
  'br-f3-express': 'f3-express',
  'br-rmk': 'rmk',
  'us-f1-quiz': 'us-f1-quiz',
  'us-f2-lp': 'us-f2-lp',
};

/**
 * Vendas de exemplo coerentes com as compras do Meta de exemplo: a Hotmart
 * registra um pouco mais (o pixel perde parte), algumas sem sck, alguns
 * reembolsos e order bumps. E-mails são fictícios (@exemplo.invalid) e passam
 * pelo mesmo `processarItens` real, que os descarta.
 */
export function hotmartExemplo(faixa: Periodo, cambio: Cambio, linhasMeta: LinhaMeta[]): VendaHotmart[] {
  const itens: ItemHotmart[] = [];
  let seq = 0;
  const porDiaFunil = new Map<string, number>();
  for (const l of linhasMeta) {
    if (l.date < faixa.de || l.date > faixa.ate || l.funnelKey === 'nao-classificada') continue;
    const k = `${l.date}|${l.funnelKey}`;
    porDiaFunil.set(k, (porDiaFunil.get(k) ?? 0) + l.purchases);
  }
  for (const [k, compras] of porDiaFunil) {
    const [dia, funil] = k.split('|');
    const r = rng(`hot|${k}`);
    const qtd = Math.floor(compras * (1.05 + r() * 0.3) + r());
    for (let i = 0; i < qtd; i++) {
      seq++;
      const express = funil === 'br-f3-express';
      const us = funil.startsWith('us-');
      const produto = express
        ? { id: 'EXPRESS_ID', name: 'Controle Express' }
        : us
          ? { id: 'R96183253Y', name: 'CONTROL 2.0 Protocol' }
          : { id: 'F10074400O', name: 'CONTROLE 2.0' };
      const preco = express ? 47 : us ? 197 : r() < 0.3 ? 297 : 397;
      const sorte = r();
      const status = sorte < 0.06 ? 'REFUNDED' : sorte < 0.075 ? 'CHARGEBACK' : 'APPROVED';
      const semSck = r() < 0.1;
      const transacao = `HP${seq}`;
      const quando = inicioDiaSPms(dia) + Math.floor(r() * 20) * 3_600_000;
      itens.push({
        product: produto,
        buyer: { email: express ? `express${seq}@exemplo.invalid` : `cliente${seq}@exemplo.invalid`, name: "Exemplo" },
        purchase: {
          transaction: transacao,
          order_date: quando,
          status,
          price: { value: preco, currency_code: us ? 'USD' : 'BRL' },
          hotmart_fee: { total: +(preco * METAS.taxaHotmart).toFixed(2) },
          offer: { code: preco === 297 ? 'OFERTA-297' : 'PADRAO' },
          tracking: { source_sck: semSck ? '' : SCK_DO_FUNIL[funil] },
        },
      });
      // Order bump em ~25% das vendas do 2.0 BR
      if (!express && !us && r() < 0.25) {
        seq++;
        itens.push({
          product: { id: 'BUMP', name: 'Guia de Exercícios (bump)' },
          purchase: {
            transaction: `HP${seq}`,
            order_date: quando,
            status,
            price: { value: 37, currency_code: 'BRL' },
            hotmart_fee: { total: 3.66 },
            is_order_bump: true,
            order_bump: { is_order_bump: true, parent_purchase_transaction: transacao },
            tracking: {},
          },
        });
      }
      // Parte dos compradores do Express volta e compra o 2.0 dias depois.
      if (express && status === 'APPROVED' && r() < 0.12) {
        seq++;
        itens.push({
          product: { id: 'F10074400O', name: 'CONTROLE 2.0' },
          buyer: { email: `express${seq - 1}@exemplo.invalid` },
          purchase: {
            transaction: `HP${seq}`,
            order_date: quando + (2 + Math.floor(r() * 6)) * 86_400_000,
            status: 'APPROVED',
            price: { value: 297, currency_code: 'BRL' },
            hotmart_fee: { total: 29.4 },
            tracking: { source_sck: 'rmk' },
          },
        });
      }
    }
  }
  return processarItens(itens, cambio, METAS.taxaHotmart, 'sal-de-exemplo');
}
