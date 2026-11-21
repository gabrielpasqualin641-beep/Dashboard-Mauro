import { lerJson } from './http';
import { diaEmSP } from '../lib/datas';
import type { Cambio } from '../lib/cambio';

/**
 * Cotação USD→BRL de fontes públicas gratuitas, sem chave:
 *  1) AwesomeAPI (histórico diário, para converter cada dia pela sua cotação)
 *  2) open.er-api.com (só a cotação atual)
 *  3) USD_BRL_FALLBACK
 */

export function cotacaoFallback(): number {
  const v = Number(process.env.USD_BRL_FALLBACK);
  return Number.isFinite(v) && v > 0 ? v : 5.4;
}

export async function obterCambio(): Promise<Cambio> {
  try {
    const lista = await lerJson<Array<{ bid: string; timestamp: string }>>(
      'https://economia.awesomeapi.com.br/json/daily/USD-BRL/120',
      { tentativas: 1, timeoutMs: 8000 },
    );
    const porDia: Record<string, number> = {};
    for (const item of Array.isArray(lista) ? lista : []) {
      const bid = Number(item.bid);
      if (bid > 0) {
        const dia = diaEmSP(Number(item.timestamp) * 1000);
        if (!porDia[dia]) porDia[dia] = bid;
      }
    }
    const dias = Object.keys(porDia).sort();
    if (dias.length) return { atual: porDia[dias[dias.length - 1]], porDia, fonte: 'awesomeapi' };
  } catch {
    /* tenta a próxima */
  }
  try {
    const er = await lerJson<{ rates?: { BRL?: number } }>('https://open.er-api.com/v6/latest/USD', {
      tentativas: 1,
      timeoutMs: 8000,
    });
    const brl = er?.rates?.BRL;
    if (brl && brl > 0) return { atual: brl, porDia: {}, fonte: 'er-api' };
  } catch {
    /* usa o fallback */
  }
  return { atual: cotacaoFallback(), porDia: {}, fonte: 'fallback' };
}
