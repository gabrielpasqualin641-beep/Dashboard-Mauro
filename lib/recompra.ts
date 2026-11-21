import type { RecompraExpress, VendaHotmart } from './tipos';

/**
 * Compradores do Express que compraram o CONTROLE 2.0 depois, pelo hash do
 * comprador (sha256 do e-mail + SALT_HASH, gerado no coletor). Sem hash
 * (SALT_HASH não configurado), devolve zeros.
 */
export function calcularRecompra(vendas: VendaHotmart[]): RecompraExpress & { disponivel: boolean } {
  const express = new Map<string, number>();
  const controle = new Map<string, number>();
  let comHash = 0;
  for (const v of vendas) {
    if (v.status !== 'aprovada' || !v.buyerHash) continue;
    comHash++;
    const alvo = v.productKey === 'controle-express' ? express : v.productKey === 'controle-20' ? controle : null;
    if (!alvo) continue;
    const atual = alvo.get(v.buyerHash);
    if (atual === undefined || v.ts < atual) alvo.set(v.buyerHash, v.ts);
  }
  let depois = 0;
  let somaDias = 0;
  for (const [h, t] of express) {
    const t2 = controle.get(h);
    if (t2 !== undefined && t2 >= t) {
      depois++;
      somaDias += (t2 - t) / 86_400_000;
    }
  }
  return {
    disponivel: comHash > 0,
    compradoresExpress: express.size,
    compraram20Depois: depois,
    taxa: express.size ? depois / express.size : 0,
    diasMedios: depois ? somaDias / depois : null,
  };
}
