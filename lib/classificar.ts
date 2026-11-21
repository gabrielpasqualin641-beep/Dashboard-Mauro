import { FUNIS, PRODUTOS, type FunnelKey, type Pais } from '@/config/operacao';
import type { VendaHotmart } from './tipos';

const norm = (s: string) =>
  (s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim();

/** Normaliza separadores " | " para casar `| BR |` mesmo com espaços diferentes. */
const normNome = (s: string) => ` ${norm(s).replace(/\s*\|\s*/g, ' | ')} `;

/**
 * Funil de uma campanha do Meta pelo nome.
 * A ordem importa: remarketing é checado antes dos funis de topo, porque uma
 * campanha "MM | BR | F1-LP | RMK" é remarketing.
 */
export function funilDaCampanha(nomeCampanha: string): FunnelKey {
  const nome = normNome(nomeCampanha);
  const ordenados = [...FUNIS.filter((f) => f.remarketing), ...FUNIS.filter((f) => !f.remarketing)];
  for (const f of ordenados) {
    if (f.plataforma !== 'meta') continue;
    if (f.nomeContemTodos.length === 0 && f.nomeContemAlgum.length === 0) continue;
    const todos = f.nomeContemTodos.every((t) => nome.includes(normNome(t).trim()));
    const algum =
      f.nomeContemAlgum.length === 0 || f.nomeContemAlgum.some((t) => nome.includes(normNome(t).trim()));
    if (todos && algum) return f.chave;
  }
  return 'nao-classificada';
}

/** País pelo nome da campanha (fallback: país da conta). */
export function paisDaCampanha(nomeCampanha: string, paisConta: Pais): Pais {
  const nome = normNome(nomeCampanha);
  if (nome.includes('| US |')) return 'US';
  if (nome.includes('| BR |')) return 'BR';
  return paisConta;
}

/** Conceito do criativo: segundo campo do nome do anúncio. */
export function conceitoDoAnuncio(nomeAnuncio: string): string {
  const partes = (nomeAnuncio || '').split('|').map((p) => p.trim()).filter(Boolean);
  return (partes[1] || partes[0] || 'SEM-CONCEITO').toUpperCase();
}

export function produtoDaVenda(
  id: string | number | undefined,
  ucode: string | undefined,
  nome: string | undefined,
): (typeof PRODUTOS)[number] | undefined {
  const codigos = [id, ucode].filter((c) => c !== undefined && c !== null && c !== '').map(String);
  const porCodigo = PRODUTOS.find((p) => p.codigosHotmart.some((c) => codigos.includes(c)));
  if (porCodigo) return porCodigo;
  const n = norm(nome || '').toLowerCase();
  if (!n) return undefined;
  // Nomes mais específicos primeiro (Express antes de "controle 2").
  const porNome = [...PRODUTOS]
    .sort((a, b) => Math.max(...b.nomeContem.map((x) => x.length)) - Math.max(...a.nomeContem.map((x) => x.length)))
    .find((p) => p.nomeContem.some((t) => n.includes(t.toLowerCase())));
  return porNome;
}

/**
 * Funil de uma venda Hotmart.
 * 1) `sck` exato; 2) sem sck: utm_source (ex.: google); 3) sem sck: utm_campaign/src
 * contendo o trecho do funil (ex.: f1 → br-f1-lp). Sem nada: origem não identificada.
 */
export function funilDaVenda(
  v: Pick<VendaHotmart, 'sck' | 'utmSource' | 'utmCampaign' | 'src'>,
  paisProduto: Pais,
): FunnelKey | null {
  const sck = (v.sck || '').trim().toLowerCase();
  if (sck) {
    const f = FUNIS.find((x) => x.sck.some((s) => s.toLowerCase() === sck));
    return f ? f.chave : null;
  }
  const src = (v.utmSource || '').trim().toLowerCase();
  if (src) {
    const f = FUNIS.find((x) => x.utmSource.includes(src));
    if (f) return f.chave;
  }
  const camp = `${v.utmCampaign || ''} ${v.src || ''}`.toLowerCase();
  if (camp.trim()) {
    const f = FUNIS.find(
      (x) => x.pais === paisProduto && x.utmCampaignContem.some((t) => new RegExp(`(^|[^a-z0-9])${t}([^0-9]|$)`).test(camp)),
    );
    if (f) return f.chave;
  }
  return null;
}
