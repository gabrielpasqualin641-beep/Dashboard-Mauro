import { createHash } from 'node:crypto';
import { funilDaVenda, produtoDaVenda } from '../lib/classificar';
import { cotacaoDoDia, type Cambio } from '../lib/cambio';
import { diaEmSP, fimDiaSPms, inicioDiaSPms, type Periodo } from '../lib/datas';
import type { StatusVenda, VendaHotmart } from '../lib/tipos';
import { ErroFonte, consultaPost, lerJson } from './http';

/**
 * Hotmart — API de vendas (somente leitura).
 *
 * PRIVACIDADE: o nicho é saúde sexual. Nome, e-mail, telefone e documento do
 * comprador NUNCA saem desta função: `normalizarVenda` copia só os campos
 * permitidos. O e-mail vira `sha256(email normalizado + SALT_HASH)`, usado só
 * para cruzar Express → 2.0. Sem SALT_HASH, nenhum hash é gerado. O ID da
 * transação serve só para ligar o order bump e é descartado. Nada daqui é logado.
 */

export function hotmartConfigurado(): string | null {
  for (const v of ['HOTMART_CLIENT_ID', 'HOTMART_CLIENT_SECRET', 'HOTMART_BASIC']) {
    if (!process.env[v]?.trim()) return v;
  }
  return null;
}

/** Token OAuth em memória durante a execução; mascarado no log do Action. */
async function token(): Promise<string> {
  const id = process.env.HOTMART_CLIENT_ID!.trim();
  const segredo = process.env.HOTMART_CLIENT_SECRET!.trim();
  const basic = process.env.HOTMART_BASIC!.trim().replace(/^Basic\s+/i, '');
  const url = `https://api-sec-vlc.hotmart.com/security/oauth/token?grant_type=client_credentials&client_id=${encodeURIComponent(
    id,
  )}&client_secret=${encodeURIComponent(segredo)}`;
  const r = await consultaPost<{ access_token?: string }>(url, undefined, {
    headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/json' },
    tentativas: 2,
    interpretarErro: (status) =>
      new ErroFonte(
        status === 401 || status === 400 || status === 403 ? 'Credenciais da Hotmart inválidas' : `Hotmart OAuth HTTP ${status}`,
        status,
        status,
        status === 401 || status === 400 || status === 403 ? 'token' : 'api',
      ),
  });
  if (!r.access_token) throw new ErroFonte('Hotmart não devolveu token', 0, 'oauth', 'token');
  if (process.env.GITHUB_ACTIONS) console.log(`::add-mask::${r.access_token}`);
  return r.access_token;
}

/** Formato (parcial) do item devolvido por /sales/history. */
export interface ItemHotmart {
  product?: { id?: number | string; ucode?: string; name?: string };
  buyer?: { name?: string; email?: string; ucode?: string; phone?: string; document?: string };
  purchase?: {
    transaction?: string;
    order_date?: number;
    approved_date?: number;
    status?: string;
    price?: { value?: number; currency_code?: string };
    hotmart_fee?: { total?: number; currency_code?: string };
    offer?: { code?: string; payment_mode?: string };
    tracking?: {
      source_sck?: string;
      source?: string;
      external_code?: string;
      utm_source?: string;
      utm_campaign?: string;
      utm_content?: string;
      utm_medium?: string;
    };
    is_order_bump?: boolean;
    order_bump?: { is_order_bump?: boolean; parent_purchase_transaction?: string };
  };
}

export function statusVenda(s: string | undefined): StatusVenda {
  switch ((s || '').toUpperCase()) {
    case 'APPROVED':
    case 'COMPLETE':
    case 'COMPLETED':
      return 'aprovada';
    case 'REFUNDED':
    case 'PARTIALLY_REFUNDED':
      return 'reembolsada';
    case 'CHARGEBACK':
    case 'DISPUTE':
    case 'PROTESTED':
      return 'chargeback';
    case 'CANCELLED':
    case 'CANCELED':
      return 'cancelada';
    default:
      return 'outra';
  }
}

/** Extrai utm_* de um `src`/`external_code` no formato query string, se houver. */
function utmDe(texto: string | undefined, chave: string): string {
  if (!texto || !texto.includes('=')) return '';
  try {
    return new URLSearchParams(texto.replace(/^\?/, '')).get(chave) ?? '';
  } catch {
    return '';
  }
}

export function hashComprador(email: string | undefined, salt: string | undefined): string | null {
  if (!email || !salt) return null;
  return createHash('sha256').update(email.trim().toLowerCase() + salt).digest('hex');
}

export function normalizarVenda(item: ItemHotmart, cambio: Cambio, taxaHotmart: number, salt: string | undefined): VendaHotmart {
  const p = item.purchase ?? {};
  const produto = produtoDaVenda(item.product?.id, item.product?.ucode, item.product?.name);
  const quando = p.order_date ?? p.approved_date ?? Date.now();
  const date = diaEmSP(quando);
  const gross = Number(p.price?.value ?? 0) || 0;
  const currency = (p.price?.currency_code || produto?.moeda || 'BRL').toUpperCase();
  const fee = p.hotmart_fee?.total;
  const net = typeof fee === 'number' && fee >= 0 && fee < gross ? gross - fee : gross * (1 - taxaHotmart);
  const taxa = cotacaoDoDia(cambio, date);
  const brl = (v: number) => (currency === 'USD' ? v * taxa : v);
  const usd = (v: number) => (currency === 'USD' ? v : v / taxa);
  const t = p.tracking ?? {};
  const src = t.source ?? '';
  const base = {
    sck: (t.source_sck ?? '').trim(),
    src,
    utmSource: (t.utm_source || utmDe(src, 'utm_source') || utmDe(t.external_code, 'utm_source')).toLowerCase(),
    utmCampaign: t.utm_campaign || utmDe(src, 'utm_campaign') || utmDe(t.external_code, 'utm_campaign'),
    utmContent: t.utm_content || utmDe(src, 'utm_content') || utmDe(t.external_code, 'utm_content'),
  };
  const pais = produto?.mercado ?? (currency === 'USD' ? 'US' : 'BR');
  return {
    date,
    ts: quando,
    productId: String(item.product?.id ?? item.product?.ucode ?? ''),
    productKey: produto?.chave ?? 'outro',
    productName: produto?.nome ?? item.product?.name ?? 'Outro',
    offer: p.offer?.code ?? '',
    gross,
    net,
    currency,
    grossBrl: brl(gross),
    netBrl: brl(net),
    grossUsd: usd(gross),
    netUsd: usd(net),
    status: statusVenda(p.status),
    ...base,
    hasBump: false, // preenchido em marcarBumps
    isBump: Boolean(p.is_order_bump ?? p.order_bump?.is_order_bump),
    funnelKey: funilDaVenda(base, pais),
    country: pais,
    buyerHash: hashComprador(item.buyer?.email, salt),
  };
}

/** Liga o order bump à venda principal (pelo parent_purchase_transaction). */
function marcarBumps(itens: ItemHotmart[], vendas: VendaHotmart[]) {
  const idx = new Map<string, number>();
  itens.forEach((it, i) => it.purchase?.transaction && idx.set(it.purchase.transaction, i));
  itens.forEach((it, i) => {
    const pai = it.purchase?.order_bump?.parent_purchase_transaction;
    if (vendas[i].isBump && pai && idx.has(pai)) {
      const j = idx.get(pai)!;
      vendas[j].hasBump = true;
      // O bump herda a origem da venda principal.
      if (!vendas[i].funnelKey) {
        vendas[i].funnelKey = vendas[j].funnelKey;
        vendas[i].sck = vendas[j].sck;
      }
    }
  });
}

/** Converte itens crus em vendas sem PII. Separado para ser testável. */
export function processarItens(itens: ItemHotmart[], cambio: Cambio, taxaHotmart: number, salt: string | undefined): VendaHotmart[] {
  // Remove duplicadas (mesma transação devolvida em dois filtros de status).
  const vistos = new Set<string>();
  const unicos = itens.filter((it) => {
    const id = it.purchase?.transaction;
    if (!id) return true;
    if (vistos.has(id)) return false;
    vistos.add(id);
    return true;
  });
  const vendas = unicos.map((it) => normalizarVenda(it, cambio, taxaHotmart, salt));
  marcarBumps(unicos, vendas);
  return vendas;
}

// Sem filtro, a API devolve só aprovadas/completas; pedimos cada status.
const STATUS_BUSCA = ['APPROVED', 'COMPLETE', 'REFUNDED', 'PARTIALLY_REFUNDED', 'CHARGEBACK', 'DISPUTE', 'PROTESTED', 'CANCELLED'];

async function historico(janela: Periodo, status: string, tk: string): Promise<ItemHotmart[]> {
  const out: ItemHotmart[] = [];
  let pageToken: string | undefined;
  let guarda = 0;
  do {
    const params = new URLSearchParams({
      start_date: String(inicioDiaSPms(janela.de)),
      end_date: String(fimDiaSPms(janela.ate)),
      max_results: '500',
      transaction_status: status,
    });
    if (pageToken) params.set('page_token', pageToken);
    const r = await lerJson<{ items?: ItemHotmart[]; page_info?: { next_page_token?: string } }>(
      `https://developers.hotmart.com/payments/api/v1/sales/history?${params}`,
      {
        headers: { Authorization: `Bearer ${tk}`, 'Content-Type': 'application/json' },
        interpretarErro: (st) =>
          new ErroFonte(
            st === 401 ? 'Token da Hotmart expirado' : st === 429 ? 'Limite de chamadas da Hotmart' : `Hotmart HTTP ${st}`,
            st,
            st,
            st === 401 || st === 403 ? 'token' : st === 429 ? 'limite' : 'api',
          ),
        deveRetentar: (e) => e.tipo === 'limite' || e.tipo === 'rede' || e.status >= 500,
      },
    );
    out.push(...(r.items ?? []));
    pageToken = r.page_info?.next_page_token;
  } while (pageToken && guarda++ < 200);
  return out;
}

export async function buscarHotmart(janela: Periodo, cambio: Cambio, taxaHotmart: number): Promise<VendaHotmart[]> {
  const falta = hotmartConfigurado();
  if (falta) throw new ErroFonte(`${falta} ausente`, 0, 'sem-credencial', 'credencial');
  const tk = await token();
  const listas: ItemHotmart[][] = [];
  for (const s of STATUS_BUSCA) listas.push(await historico(janela, s, tk));
  return processarItens(listas.flat(), cambio, taxaHotmart, process.env.SALT_HASH?.trim() || undefined);
}
