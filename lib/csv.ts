/**
 * Geração de CSV no navegador para exportar os dados de cada aba.
 * Formato padrão (vírgula como separador, ponto decimal, UTF-8 com BOM): é o
 * que o Claude, o pandas e planilhas leem sem configuração. Vários blocos de
 * tabela cabem num arquivo só, cada um com um cabeçalho "# nome".
 */

export interface Folha {
  nome: string;
  colunas: string[];
  linhas: Array<Array<string | number | null | undefined>>;
}

function campo(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return '';
  const s = typeof v === 'number' ? (Number.isFinite(v) ? String(v) : '') : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function montarCSV(folhas: Folha[]): string {
  const varias = folhas.length > 1;
  const blocos = folhas.map((f) => {
    const cabecalho = varias ? `# ${f.nome}\n` : '';
    const head = f.colunas.map(campo).join(',');
    const corpo = f.linhas.map((l) => l.map(campo).join(',')).join('\n');
    return cabecalho + head + (corpo ? `\n${corpo}` : '');
  });
  return '﻿' + blocos.join('\n\n') + '\n';
}

export function baixarCSV(arquivo: string, folhas: Folha[]) {
  const nome = `${arquivo}.csv`.replace(/[^\w.\-]+/g, '-');
  const blob = new Blob([montarCSV(folhas)], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Arredonda números para no máximo `casas` casas (evita 0.30000000004 no CSV). */
export function n(v: number | null | undefined, casas = 2): number | null {
  if (v === null || v === undefined || !Number.isFinite(v)) return null;
  const p = 10 ** casas;
  return Math.round(v * p) / p;
}
