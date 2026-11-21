/** Cotação USD→BRL (dados vêm do coletor). Funções puras, usadas no coletor e no navegador. */

export interface Cambio {
  atual: number;
  porDia: Record<string, number>;
  fonte: 'awesomeapi' | 'er-api' | 'fallback' | string;
}

export function cotacaoDoDia(c: Cambio, dia: string): number {
  if (c.porDia[dia]) return c.porDia[dia];
  // Fim de semana/feriado: usa o último dia útil anterior conhecido.
  const anteriores = Object.keys(c.porDia).filter((d) => d <= dia).sort();
  const ultimo = anteriores[anteriores.length - 1];
  return ultimo ? c.porDia[ultimo] : c.atual;
}
