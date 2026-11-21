import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ErroFonte } from '@/coletor/http';
import { coletarTudo, janelas } from '@/coletor/montar';
import { calcularPainel } from '@/lib/painel';
import type { Cambio } from '@/lib/cambio';

const VARS = ['META_ACCESS_TOKEN', 'META_AD_ACCOUNT_BR', 'META_AD_ACCOUNT_US', 'HOTMART_CLIENT_ID', 'HOTMART_CLIENT_SECRET', 'HOTMART_BASIC', 'SALT_HASH'];
let salvo: Record<string, string | undefined> = {};
const agora = new Date('2026-11-21T14:00:00-03:00');
const cambio = async (): Promise<Cambio> => ({ atual: 5.4, porDia: {}, fonte: 'fallback' });

beforeEach(() => {
  salvo = Object.fromEntries(VARS.map((v) => [v, process.env[v]]));
  for (const v of VARS) delete process.env[v];
});
afterEach(() => {
  for (const v of VARS) {
    if (salvo[v] === undefined) delete process.env[v];
    else process.env[v] = salvo[v];
  }
});

describe('coletor', () => {
  it('janela de 90 dias terminando hoje (SP)', () => {
    const j = janelas(agora);
    expect(j.janela).toEqual({ de: '2026-08-24', ate: '2026-11-21' });
    expect(j.ult7).toEqual({ de: '2026-11-15', ate: '2026-11-21' });
  });

  it('sem Secrets: tudo NAO_CONFIGURADO dizendo qual Secret falta, sem lançar', async () => {
    const d = await coletarTudo({ agora, obterCambioFn: cambio });
    expect(d.fontes.meta_br).toEqual({ ok: false, motivo: 'NAO_CONFIGURADO', secret: 'META_ACCESS_TOKEN' });
    expect(d.fontes.hotmart).toMatchObject({ ok: false, motivo: 'NAO_CONFIGURADO', secret: 'HOTMART_CLIENT_ID' });
    expect(d.fontes.google).toMatchObject({ ok: false, motivo: 'NAO_CONFIGURADO' });
    expect(d.meta).toEqual([]);
    expect(d.cambio.usd_brl).toBe(5.4);
  });

  it('conta US vazia → só meta_us NAO_CONFIGURADO com o Secret da conta', async () => {
    process.env.META_ACCESS_TOKEN = 'x';
    process.env.META_AD_ACCOUNT_BR = 'act_1';
    const d = await coletarTudo({
      agora,
      obterCambioFn: cambio,
      buscarMetaFn: async () => ({ linhas: [], ad7d: [], ad7dAnterior: [], adset7d: [] }),
    });
    expect(d.fontes.meta_br.ok).toBe(true);
    expect(d.fontes.meta_us).toEqual({ ok: false, motivo: 'NAO_CONFIGURADO', secret: 'META_AD_ACCOUNT_US' });
  });

  it('uma fonte com erro não derruba as outras', async () => {
    process.env.META_ACCESS_TOKEN = 'x';
    process.env.META_AD_ACCOUNT_BR = 'act_1';
    process.env.META_AD_ACCOUNT_US = 'act_2';
    process.env.HOTMART_CLIENT_ID = 'a';
    process.env.HOTMART_CLIENT_SECRET = 'b';
    process.env.HOTMART_BASIC = 'c';
    const zeros = Object.fromEntries(
      ['spend', 'spendBrl', 'spendUsd', 'impressions', 'reach', 'frequency', 'clicks', 'linkClicks', 'lpv', 'viewContent', 'initiateCheckout', 'purchases', 'purchaseValue', 'purchaseValueBrl', 'purchaseValueUsd', 'video3s', 'thruplays', 'p25', 'p50', 'p75', 'p100', 'quizStart', 'quizComplete'].map((k) => [k, 0]),
    );
    const linha = {
      ...zeros,
      date: '2026-11-20',
      account: 'BR',
      country: 'BR',
      campaignId: 'c',
      campaignName: 'MM | BR | F1-LP | VENDAS',
      adsetId: 's',
      adsetName: 'S',
      adId: 'a',
      adName: 'VID | X | V1',
      funnelKey: 'br-f1-lp',
      spend: 10,
      spendBrl: 10,
      spendUsd: 2,
      currency: 'BRL',
      qualityRanking: 'AVERAGE',
      engagementRanking: 'AVERAGE',
      conversionRanking: 'AVERAGE',
      status: 'ACTIVE',
      thumbnailUrl: null,
    } as never;
    const d = await coletarTudo({
      agora,
      obterCambioFn: cambio,
      buscarMetaFn: async (pais) => {
        if (pais === 'US') throw new ErroFonte('Token do Meta expirado ou inválido', 400, 190, 'token');
        return { linhas: [linha], ad7d: [], ad7dAnterior: [], adset7d: [] };
      },
      buscarHotmartFn: async () => {
        throw new ErroFonte('Limite de chamadas da Hotmart', 429, 429, 'limite');
      },
    });
    expect(d.fontes.meta_br).toEqual({ ok: true, linhas: 1 });
    expect(d.fontes.meta_us).toMatchObject({ ok: false, motivo: 'TOKEN_INVALIDO', secret: 'META_ACCESS_TOKEN' });
    expect(d.fontes.hotmart).toMatchObject({ ok: false, motivo: 'LIMITE_DE_CHAMADAS' });
    expect(d.meta).toHaveLength(1);
    // E o painel continua calculável, com o alerta 14 dizendo o que caiu.
    const p = calcularPainel(d, { periodo: { de: '2026-11-15', ate: '2026-11-21' }, pais: 'TODOS' });
    expect(p.alertas[0].regra).toBe(14);
    expect(p.alertas[0].onde).toContain('Meta US');
    expect(p.alertas[0].onde).toContain('Hotmart');
  });

  it('erro inesperado (não ErroFonte) também vira fonte com erro', async () => {
    process.env.META_ACCESS_TOKEN = 'x';
    process.env.META_AD_ACCOUNT_BR = 'act_1';
    const d = await coletarTudo({
      agora,
      obterCambioFn: cambio,
      buscarMetaFn: async () => {
        throw new TypeError('boom');
      },
    });
    expect(d.fontes.meta_br).toMatchObject({ ok: false, motivo: 'ERRO_API' });
  });

  it('modo exemplo gera dados marcados e o painel completo calcula (sem PII)', async () => {
    const d = await coletarTudo({ agora, exemplo: true, obterCambioFn: cambio });
    expect(d.exemplo).toBe(true);
    expect(d.fontes.meta_br.motivo).toBe('EXEMPLO');
    expect(d.meta.length).toBeGreaterThan(100);
    const json = JSON.stringify(d);
    expect(json).not.toContain('exemplo.invalid');
    expect(json).not.toMatch(/"(email|phone|document)"/);
    const p = calcularPainel(d, { periodo: { de: '2026-10-29', ate: '2026-11-17' }, pais: 'BR' });
    expect(p.diario).toHaveLength(20);
    expect(p.funis.map((f) => f.chave)).toEqual(expect.arrayContaining(['br-f1-lp', 'br-f2-quiz', 'br-f3-express', 'br-rmk']));
    expect(p.funis.some((f) => f.chave.startsWith('us-'))).toBe(false);
    expect(p.hotmart.recompra.disponivel).toBe(true);
    expect(p.google.estado).toBe('nao-configurado');
  });
});
