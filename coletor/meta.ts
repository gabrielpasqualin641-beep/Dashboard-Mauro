import { EVENTOS_QUIZ, type Pais } from '../config/operacao';
import { funilDaCampanha, paisDaCampanha } from '../lib/classificar';
import { cotacaoDoDia, type Cambio } from '../lib/cambio';
import { minDia, somarDias, type Periodo } from '../lib/datas';
import type { MotivoFonte } from '../lib/dados';
import type { AlcanceMeta, LinhaMeta, Moeda } from '../lib/tipos';
import { ErroFonte, consultaPost, lerJson } from './http';

/**
 * Meta Marketing API — somente leitura (permissão ads_read).
 * GET /act_x (moeda), GET /act_x/insights, GET /act_x/ads e, só quando a chamada
 * síncrona estoura, POST /act_x/insights (relatório assíncrono, não altera nada).
 * O token vai sempre no cabeçalho Authorization, nunca na URL.
 */

const VERSAO = () => process.env.META_API_VERSION?.trim() || 'v27.0';
const BASE = () => `https://graph.facebook.com/${VERSAO()}`;

export function contaMeta(pais: Pais): string | null {
  const v = (pais === 'BR' ? process.env.META_AD_ACCOUNT_BR : process.env.META_AD_ACCOUNT_US)?.trim();
  if (!v || /X{4,}/i.test(v)) return null;
  return v.startsWith('act_') ? v : `act_${v}`;
}

const CAMPOS = [
  'campaign_id',
  'campaign_name',
  'adset_id',
  'adset_name',
  'ad_id',
  'ad_name',
  'spend',
  'impressions',
  'reach',
  'frequency',
  'clicks',
  'inline_link_clicks',
  'ctr',
  'inline_link_click_ctr',
  'cpc',
  'cpm',
  'actions',
  'action_values',
  'video_play_actions',
  'video_thruplay_watched_actions',
  'video_p25_watched_actions',
  'video_p50_watched_actions',
  'video_p75_watched_actions',
  'video_p100_watched_actions',
  'quality_ranking',
  'engagement_rate_ranking',
  'conversion_rate_ranking',
].join(',');

const JANELAS = JSON.stringify(['7d_click', '1d_view']);

type Acao = { action_type: string; value: string };
export interface LinhaApi {
  date_start: string;
  campaign_id?: string;
  campaign_name?: string;
  adset_id?: string;
  adset_name?: string;
  ad_id?: string;
  ad_name?: string;
  spend?: string;
  impressions?: string;
  reach?: string;
  frequency?: string;
  clicks?: string;
  inline_link_clicks?: string;
  actions?: Acao[];
  action_values?: Acao[];
  video_play_actions?: Acao[];
  video_thruplay_watched_actions?: Acao[];
  video_p25_watched_actions?: Acao[];
  video_p50_watched_actions?: Acao[];
  video_p75_watched_actions?: Acao[];
  video_p100_watched_actions?: Acao[];
  quality_ranking?: string;
  engagement_rate_ranking?: string;
  conversion_rate_ranking?: string;
}

interface Pagina<T> {
  data?: T[];
  paging?: { next?: string };
}

/** Códigos do Meta que significam "espere e tente de novo" (backoff exponencial). */
export const CODIGOS_RETRY = new Set([4, 17, 32, 613, 80004]);

export function interpretarErroMeta(status: number, corpo: unknown): ErroFonte {
  const e = (corpo as { error?: { message?: string; code?: number } })?.error;
  const codigo = e?.code;
  const msg = e?.message || `HTTP ${status}`;
  if (codigo === 190 || codigo === 102) {
    return new ErroFonte('Token do Meta expirado ou inválido', status, codigo, 'token');
  }
  if (codigo === 10 || codigo === 200 || codigo === 270 || (codigo === 100 && /permission|does not exist|cannot be loaded/i.test(msg))) {
    return new ErroFonte('Token sem acesso a esta conta de anúncios', status, codigo, 'credencial');
  }
  if (codigo !== undefined && CODIGOS_RETRY.has(codigo)) {
    return new ErroFonte('Limite de chamadas do Meta atingido', status, codigo, 'limite');
  }
  return new ErroFonte('Erro na API do Meta', status, codigo, 'api');
}

/** Traduz o erro para o motivo mostrado na tela de Conexões. */
export function motivoDoErro(e: unknown): MotivoFonte {
  if (!(e instanceof ErroFonte)) return 'ERRO_API';
  if (e.tipo === 'token') return 'TOKEN_INVALIDO';
  if (e.tipo === 'credencial') return e.codigo === 'sem-credencial' ? 'NAO_CONFIGURADO' : 'SEM_ACESSO_A_CONTA';
  if (e.tipo === 'limite') return 'LIMITE_DE_CHAMADAS';
  return 'ERRO_API';
}

const opcoesMeta = () => ({
  headers: { Authorization: `Bearer ${process.env.META_ACCESS_TOKEN?.trim() ?? ''}` },
  interpretarErro: interpretarErroMeta,
  // 190 (token) nunca é retentado; só limite de chamadas, rede e 5xx.
  deveRetentar: (e: ErroFonte) => e.tipo === 'limite' || e.tipo === 'rede' || (e.tipo === 'api' && e.status >= 500),
  tentativas: 5,
  timeoutMs: 60_000,
});

async function todasAsPaginas<T>(primeira: string): Promise<T[]> {
  const out: T[] = [];
  let url: string | undefined = primeira;
  let guarda = 0;
  while (url && guarda++ < 500) {
    const pagina: Pagina<T> = await lerJson<Pagina<T>>(url, opcoesMeta());
    out.push(...(pagina.data ?? []));
    url = pagina.paging?.next;
  }
  return out;
}

function precisaAssincrono(e: unknown): boolean {
  if (!(e instanceof ErroFonte)) return false;
  if (e.tipo !== 'api' && e.tipo !== 'rede') return false;
  return e.codigo === 1 || e.codigo === 'timeout' || e.status >= 500;
}

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function insightsAssincrono<T>(conta: string, params: URLSearchParams): Promise<T[]> {
  const job = await consultaPost<{ report_run_id?: string }>(`${BASE()}/${conta}/insights`, params, {
    ...opcoesMeta(),
    headers: { ...opcoesMeta().headers, 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  const id = job.report_run_id;
  if (!id) throw new ErroFonte('Meta não devolveu o relatório assíncrono', 0, 'async');
  const limite = Date.now() + 8 * 60_000;
  while (Date.now() < limite) {
    const st = await lerJson<{ async_status?: string }>(`${BASE()}/${id}?fields=async_status`, opcoesMeta());
    if (st.async_status === 'Job Completed') return todasAsPaginas<T>(`${BASE()}/${id}/insights?limit=500`);
    if (st.async_status === 'Job Failed' || st.async_status === 'Job Skipped') {
      throw new ErroFonte('Relatório assíncrono do Meta falhou', 0, 'async');
    }
    await espera(5000);
  }
  throw new ErroFonte('Relatório assíncrono do Meta demorou demais', 0, 'timeout', 'rede');
}

async function insights<T>(conta: string, extra: Record<string, string>): Promise<T[]> {
  const params = new URLSearchParams({ limit: '500', action_attribution_windows: JANELAS, ...extra });
  try {
    return await todasAsPaginas<T>(`${BASE()}/${conta}/insights?${params}`);
  } catch (e) {
    if (precisaAssincrono(e)) return insightsAssincrono<T>(conta, params);
    throw e;
  }
}

const num = (s: string | undefined) => {
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
};

function somaAcao(lista: Acao[] | undefined, tipos: string[]): number {
  if (!lista) return 0;
  let total = 0;
  for (const a of lista) if (tipos.includes(a.action_type)) total += num(a.value);
  return total;
}

/** Primeiro tipo presente (evita somar o mesmo evento em dois nomes). */
function primeiraAcao(lista: Acao[] | undefined, tipos: string[]): number {
  if (!lista) return 0;
  for (const t of tipos) {
    const a = lista.find((x) => x.action_type === t);
    if (a) return num(a.value);
  }
  return 0;
}

function acaoQuiz(lista: Acao[] | undefined, tipos: string[]): number {
  if (!lista) return 0;
  return lista
    .filter((a) => tipos.some((t) => a.action_type === t || a.action_type.endsWith(`.${t}`)))
    .reduce((s, a) => s + num(a.value), 0);
}

export interface InfoAnuncio {
  status: string;
  thumbnailUrl: string | null;
}

export function normalizarLinha(
  l: LinhaApi,
  paisConta: Pais,
  moeda: Moeda,
  cambio: Cambio,
  info: Map<string, InfoAnuncio>,
): LinhaMeta {
  const taxa = cotacaoDoDia(cambio, l.date_start);
  const brl = (v: number) => (moeda === 'USD' ? v * taxa : v);
  const usd = (v: number) => (moeda === 'USD' ? v : v / taxa);
  const spend = num(l.spend);
  const valorCompra = primeiraAcao(l.action_values, ['offsite_conversion.fb_pixel_purchase', 'purchase', 'omni_purchase']);
  const nomeCampanha = l.campaign_name ?? '';
  const ad = info.get(l.ad_id ?? '');
  return {
    date: l.date_start,
    account: paisConta, // nunca o ID da conta: os dados publicados não levam o act_
    country: paisDaCampanha(nomeCampanha, paisConta),
    campaignId: l.campaign_id ?? '',
    campaignName: nomeCampanha,
    adsetId: l.adset_id ?? '',
    adsetName: l.adset_name ?? '',
    adId: l.ad_id ?? '',
    adName: l.ad_name ?? '',
    funnelKey: funilDaCampanha(nomeCampanha),
    spend,
    spendBrl: brl(spend),
    spendUsd: usd(spend),
    currency: moeda,
    impressions: num(l.impressions),
    reach: num(l.reach),
    frequency: num(l.frequency),
    clicks: num(l.clicks),
    linkClicks: num(l.inline_link_clicks),
    lpv: primeiraAcao(l.actions, ['landing_page_view', 'omni_landing_page_view']),
    viewContent: primeiraAcao(l.actions, ['offsite_conversion.fb_pixel_view_content', 'view_content']),
    initiateCheckout: primeiraAcao(l.actions, ['offsite_conversion.fb_pixel_initiate_checkout', 'initiate_checkout']),
    purchases: primeiraAcao(l.actions, ['offsite_conversion.fb_pixel_purchase', 'purchase', 'omni_purchase']),
    purchaseValue: valorCompra,
    purchaseValueBrl: brl(valorCompra),
    purchaseValueUsd: usd(valorCompra),
    // Gancho = reproduções de 3s (action "video_view"); fallback: video_play_actions.
    video3s: primeiraAcao(l.actions, ['video_view']) || somaAcao(l.video_play_actions, ['video_view']),
    thruplays: somaAcao(l.video_thruplay_watched_actions, ['video_view']),
    p25: somaAcao(l.video_p25_watched_actions, ['video_view']),
    p50: somaAcao(l.video_p50_watched_actions, ['video_view']),
    p75: somaAcao(l.video_p75_watched_actions, ['video_view']),
    p100: somaAcao(l.video_p100_watched_actions, ['video_view']),
    qualityRanking: l.quality_ranking ?? 'UNKNOWN',
    engagementRanking: l.engagement_rate_ranking ?? 'UNKNOWN',
    conversionRanking: l.conversion_rate_ranking ?? 'UNKNOWN',
    quizStart: acaoQuiz(l.actions, EVENTOS_QUIZ.inicio),
    quizComplete: acaoQuiz(l.actions, EVENTOS_QUIZ.conclusao),
    status: ad?.status ?? 'UNKNOWN',
    thumbnailUrl: ad?.thumbnailUrl ?? null,
  };
}

async function moedaDaConta(conta: string): Promise<Moeda> {
  const r = await lerJson<{ currency?: string }>(`${BASE()}/${conta}?fields=currency`, opcoesMeta());
  return r.currency === 'USD' ? 'USD' : 'BRL';
}

async function infoAnuncios(conta: string): Promise<Map<string, InfoAnuncio>> {
  const lista = await todasAsPaginas<{
    id: string;
    effective_status?: string;
    creative?: { thumbnail_url?: string };
  }>(`${BASE()}/${conta}/ads?fields=id,name,effective_status,creative{thumbnail_url}&limit=500`);
  return new Map(lista.map((a) => [a.id, { status: a.effective_status ?? 'UNKNOWN', thumbnailUrl: a.creative?.thumbnail_url ?? null }]));
}

export interface DadosMetaConta {
  linhas: LinhaMeta[];
  ad7d: AlcanceMeta[];
  ad7dAnterior: AlcanceMeta[];
  adset7d: AlcanceMeta[];
}

const tr = (p: Periodo) => JSON.stringify({ since: p.de, until: p.ate });

/** Divide a janela em blocos de até 30 dias (chamadas menores estouram menos). */
export function blocos(p: Periodo, tamanho = 30): Periodo[] {
  const out: Periodo[] = [];
  let de = p.de;
  while (de <= p.ate) {
    const ate = minDia(somarDias(de, tamanho - 1), p.ate);
    out.push({ de, ate });
    de = somarDias(ate, 1);
  }
  return out;
}

export async function buscarMeta(pais: Pais, janela: Periodo, ult7: Periodo, ant7: Periodo, cambio: Cambio): Promise<DadosMetaConta> {
  const conta = contaMeta(pais);
  if (!process.env.META_ACCESS_TOKEN?.trim() || !conta) {
    throw new ErroFonte(`Credencial do Meta ${pais} ausente`, 0, 'sem-credencial', 'credencial');
  }
  const [moeda, info] = await Promise.all([moedaDaConta(conta), infoAnuncios(conta)]);

  const diario: LinhaApi[] = [];
  for (const b of blocos(janela)) {
    diario.push(...(await insights<LinhaApi>(conta, { level: 'ad', time_increment: '1', fields: CAMPOS, time_range: tr(b) })));
  }

  const camposAlcance = 'ad_id,ad_name,adset_id,adset_name,campaign_name,impressions,reach,frequency,inline_link_clicks';
  const [a7, aAnt, aConj] = await Promise.all([
    insights<LinhaApi>(conta, { level: 'ad', fields: camposAlcance, time_range: tr(ult7) }),
    insights<LinhaApi>(conta, { level: 'ad', fields: camposAlcance, time_range: tr(ant7) }),
    insights<LinhaApi>(conta, { level: 'adset', fields: camposAlcance.replace('ad_id,ad_name,', ''), time_range: tr(ult7) }),
  ]);

  const alc = (l: LinhaApi, nivel: 'ad' | 'adset'): AlcanceMeta => ({
    id: (nivel === 'ad' ? l.ad_id : l.adset_id) ?? '',
    nome: (nivel === 'ad' ? l.ad_name : l.adset_name) ?? '',
    funnelKey: funilDaCampanha(l.campaign_name ?? ''),
    country: paisDaCampanha(l.campaign_name ?? '', pais),
    impressions: num(l.impressions),
    reach: num(l.reach),
    frequency: num(l.frequency),
    linkClicks: num(l.inline_link_clicks),
  });

  return {
    linhas: diario.filter((l) => l.date_start >= janela.de && l.date_start <= janela.ate).map((l) => normalizarLinha(l, pais, moeda, cambio, info)),
    ad7d: a7.map((l) => alc(l, 'ad')),
    ad7dAnterior: aAnt.map((l) => alc(l, 'ad')),
    adset7d: aConj.map((l) => alc(l, 'adset')),
  };
}

/**
 * Conferência com o Gerenciador de Anúncios: soma gasto e impressões de um
 * período no nível da conta e no nível de anúncio (o que a dashboard usa).
 */
export async function conferirPeriodo(pais: Pais, periodo: Periodo) {
  const conta = contaMeta(pais);
  if (!process.env.META_ACCESS_TOKEN?.trim() || !conta) {
    throw new ErroFonte(`Credencial do Meta ${pais} ausente`, 0, 'sem-credencial', 'credencial');
  }
  const [porConta, porAnuncio] = await Promise.all([
    insights<LinhaApi>(conta, { level: 'account', fields: 'spend,impressions', time_range: tr(periodo) }),
    insights<LinhaApi>(conta, { level: 'ad', time_increment: '1', fields: 'spend,impressions', time_range: tr(periodo) }),
  ]);
  const soma = (ls: LinhaApi[], k: 'spend' | 'impressions') => ls.reduce((s, l) => s + num(l[k]), 0);
  return {
    contaGasto: soma(porConta, 'spend'),
    contaImpressoes: soma(porConta, 'impressions'),
    anunciosGasto: soma(porAnuncio, 'spend'),
    anunciosImpressoes: soma(porAnuncio, 'impressions'),
  };
}
