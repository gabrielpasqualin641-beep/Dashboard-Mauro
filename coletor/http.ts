/**
 * Cliente HTTP somente leitura do coletor (roda no GitHub Action).
 *
 * A dashboard nunca cria, edita ou pausa nada. Todas as chamadas externas
 * passam por aqui:
 *  - `lerJson` faz apenas GET.
 *  - `consultaPost` existe só para os POSTs que são LEITURA por definição da API
 *    e está limitado a uma lista fechada de destinos:
 *      · OAuth da Hotmart (obter token de acesso)
 *      · Relatório assíncrono de Insights do Meta (`POST /act_x/insights` gera um
 *        relatório, não altera a conta)
 *  Qualquer outro POST é recusado antes de sair do servidor.
 */

export class ErroFonte extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly codigo?: number | string,
    public readonly tipo: 'token' | 'limite' | 'credencial' | 'rede' | 'api' = 'api',
  ) {
    super(message);
    this.name = 'ErroFonte';
  }
}

const POSTS_DE_LEITURA: RegExp[] = [
  /^https:\/\/api-sec-vlc\.hotmart\.com\/security\/oauth\/token(\?|$)/,
  /^https:\/\/graph\.facebook\.com\/v[\d.]+\/act_\d+\/insights$/,
];

export function postPermitido(url: string): boolean {
  return POSTS_DE_LEITURA.some((r) => r.test(url));
}

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface OpcoesLeitura {
  headers?: Record<string, string>;
  timeoutMs?: number;
  /** Decide se o erro merece nova tentativa (ex.: limite de taxa do Meta). */
  deveRetentar?: (e: ErroFonte) => boolean;
  tentativas?: number;
  interpretarErro?: (status: number, corpo: unknown) => ErroFonte;
}

async function executar(url: string, init: RequestInit, op: OpcoesLeitura): Promise<unknown> {
  const tentativas = op.tentativas ?? 4;
  let ultimo: ErroFonte | undefined;
  for (let i = 0; i < tentativas; i++) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), op.timeoutMs ?? 25_000);
    try {
      const resp = await fetch(url, { ...init, signal: ctrl.signal });
      const texto = await resp.text();
      let corpo: unknown = texto;
      try {
        corpo = texto ? JSON.parse(texto) : null;
      } catch {
        /* corpo não-JSON */
      }
      if (resp.ok) return corpo;
      ultimo = op.interpretarErro
        ? op.interpretarErro(resp.status, corpo)
        : new ErroFonte(`HTTP ${resp.status}`, resp.status);
    } catch (e) {
      const abort = e instanceof Error && e.name === 'AbortError';
      ultimo = new ErroFonte(abort ? 'Tempo esgotado' : 'Falha de rede', 0, abort ? 'timeout' : 'rede', 'rede');
    } finally {
      clearTimeout(t);
    }
    const retentar = op.deveRetentar ? op.deveRetentar(ultimo) : ultimo.status === 0 || ultimo.status >= 500;
    if (!retentar || i === tentativas - 1) break;
    // Backoff exponencial com jitter: 1s, 2s, 4s…
    await espera(1000 * 2 ** i + Math.random() * 300);
  }
  throw ultimo!;
}

export function lerJson<T = unknown>(url: string, op: OpcoesLeitura = {}): Promise<T> {
  return executar(
    url,
    { method: 'GET', headers: op.headers, cache: 'no-store' },
    op,
  ) as Promise<T>;
}

export function consultaPost<T = unknown>(
  url: string,
  corpo: string | URLSearchParams | undefined,
  op: OpcoesLeitura = {},
): Promise<T> {
  if (!postPermitido(url)) {
    return Promise.reject(new ErroFonte('POST bloqueado: a dashboard é somente leitura', 0, 'bloqueado'));
  }
  return executar(url, { method: 'POST', headers: op.headers, body: corpo, cache: 'no-store' }, op) as Promise<T>;
}
