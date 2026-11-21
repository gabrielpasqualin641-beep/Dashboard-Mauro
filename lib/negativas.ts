import type { TermoBusca } from './tipos';

const PALAVRAS_NEGATIVAS = ['pills', 'viagra', 'cialis', 'spray', 'porn', 'reddit', 'jobs'];

/** Sugere negativa: custo > US$10 sem conversão, ou termo com palavra proibida. */
export function sugerirNegativa(t: TermoBusca, custoUsd: number): string | null {
  const termo = t.term.toLowerCase();
  const palavra = PALAVRAS_NEGATIVAS.find((p) => new RegExp(`\\b${p}\\b`).test(termo));
  if (palavra) return `contém "${palavra}"`;
  if (custoUsd > 10 && t.conversions === 0) return 'custo > US$10 sem conversão';
  return null;
}
