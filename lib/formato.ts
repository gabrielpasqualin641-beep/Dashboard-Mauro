import type { Moeda } from './tipos';

const cacheFmt = new Map<string, Intl.NumberFormat>();
function fmt(chave: string, op: Intl.NumberFormatOptions) {
  let f = cacheFmt.get(chave);
  if (!f) {
    f = new Intl.NumberFormat('pt-BR', op);
    cacheFmt.set(chave, f);
  }
  return f;
}

export function dinheiro(v: number | null | undefined, moeda: Moeda = 'BRL', compacto = false): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—';
  const s = fmt(`m${moeda}${compacto}`, {
    style: 'currency',
    currency: moeda,
    maximumFractionDigits: compacto ? 0 : 2,
    minimumFractionDigits: compacto ? 0 : 2,
  }).format(v);
  // pt-BR formata USD como "US$ 1.234,56" — é o que queremos.
  return s;
}

export function inteiro(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—';
  return fmt('i', { maximumFractionDigits: 0 }).format(v);
}

export function decimal(v: number | null | undefined, casas = 2): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—';
  return fmt(`d${casas}`, { minimumFractionDigits: casas, maximumFractionDigits: casas }).format(v);
}

export function pct(v: number | null | undefined, casas = 1): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—';
  return fmt(`p${casas}`, { style: 'percent', minimumFractionDigits: casas, maximumFractionDigits: casas }).format(v);
}

export function roas(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—';
  return `${decimal(v, 2)}×`;
}

/** Variação relativa entre atual e anterior (null quando não dá para comparar). */
export function variacao(atual: number, anterior: number): number | null {
  if (!Number.isFinite(atual) || !Number.isFinite(anterior) || anterior === 0) return null;
  return (atual - anterior) / Math.abs(anterior);
}

export function diaCurto(d: string): string {
  const [, m, dia] = d.split('-');
  return `${dia}/${m}`;
}

export function dataBR(d: string): string {
  const [a, m, dia] = d.split('-');
  return `${dia}/${m}/${a}`;
}
