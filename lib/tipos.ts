import type { FunnelKey, Pais } from '@/config/operacao';

export type Moeda = 'BRL' | 'USD';
export type FiltroPais = Pais | 'TODOS';

/** Uma linha diária por anúncio, já normalizada. */
export interface LinhaMeta {
  date: string; // YYYY-MM-DD (fuso da conta)
  account: string;
  country: Pais;
  campaignId: string;
  campaignName: string;
  adsetId: string;
  adsetName: string;
  adId: string;
  adName: string;
  funnelKey: FunnelKey;
  spend: number; // moeda original
  spendBrl: number;
  spendUsd: number;
  currency: Moeda;
  impressions: number;
  reach: number;
  frequency: number;
  clicks: number;
  linkClicks: number;
  lpv: number;
  viewContent: number;
  initiateCheckout: number;
  purchases: number;
  purchaseValue: number;
  purchaseValueBrl: number;
  purchaseValueUsd: number;
  video3s: number;
  thruplays: number;
  p25: number;
  p50: number;
  p75: number;
  p100: number;
  qualityRanking: string;
  engagementRanking: string;
  conversionRanking: string;
  quizStart: number;
  quizComplete: number;
  status: string;
  thumbnailUrl: string | null;
}

/** Agregado (sem time_increment) — usado para alcance/frequência reais. */
export interface AlcanceMeta {
  id: string; // ad_id ou adset_id
  nome: string;
  funnelKey: FunnelKey;
  country: Pais;
  impressions: number;
  reach: number;
  frequency: number;
  linkClicks: number;
}

export type StatusVenda = 'aprovada' | 'reembolsada' | 'chargeback' | 'cancelada' | 'outra';

/** Venda Hotmart — SEM nenhum dado pessoal do comprador. */
export interface VendaHotmart {
  date: string;
  ts: number; // momento do pedido (ms), para medir o tempo até a recompra
  productId: string;
  productKey: 'controle-20' | 'controle-express' | 'control-20-us' | 'outro';
  productName: string;
  offer: string;
  gross: number;
  net: number;
  currency: Moeda | string;
  grossBrl: number;
  netBrl: number;
  netUsd: number;
  grossUsd: number;
  status: StatusVenda;
  sck: string;
  src: string;
  utmSource: string;
  utmCampaign: string;
  utmContent: string;
  hasBump: boolean;
  isBump: boolean;
  funnelKey: FunnelKey | null; // null = origem não identificada
  country: Pais;
  /** sha256(e-mail normalizado + SALT_HASH). Só serve para cruzar Express → 2.0. */
  buyerHash: string | null;
  /** Quantidade de pedidos que a linha representa (padrão 1; >1 só nas vendas do pixel). */
  qtd?: number;
}

export interface LinhaGoogle {
  date: string;
  campaign: string;
  adGroup: string;
  cost: number; // moeda da conta
  costBrl: number;
  costUsd: number;
  clicks: number;
  impressions: number;
  conversions: number;
  value: number;
}

export interface TermoBusca {
  term: string;
  campaign: string;
  cost: number;
  clicks: number;
  conversions: number;
}

/** Recompra Express → 2.0, calculada pelo hash do comprador (nunca o e-mail). */
export interface RecompraExpress {
  compradoresExpress: number;
  compraram20Depois: number;
  taxa: number;
  diasMedios: number | null;
}

export type NomeFonte = 'metaBR' | 'metaUS' | 'hotmart' | 'google';
export type EstadoFonte = 'ok' | 'erro' | 'exemplo' | 'nao-configurado';

export interface StatusFonte {
  fonte: NomeFonte;
  rotulo: string;
  estado: EstadoFonte;
  /** Motivo técnico vindo do coletor (NAO_CONFIGURADO, TOKEN_INVALIDO, …). */
  motivo?: string;
  mensagem?: string;
  atualizadoEm: string | null; // ISO
}

export type NivelAlerta = 'critico' | 'atencao' | 'ok';

export interface Alerta {
  regra: number;
  nivel: NivelAlerta;
  titulo: string;
  onde: string;
  numero: string;
  acao: string;
  verbaEmRisco: number; // R$
}
