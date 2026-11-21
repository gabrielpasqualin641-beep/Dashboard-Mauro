import { describe, expect, it } from 'vitest';
import { criptografar } from '@/coletor/cripto';
import { SenhaIncorreta, descriptografar } from '@/lib/cripto';
import type { DadosColetados } from '@/lib/dados';

// Iterações reduzidas só para o teste rodar rápido; o formato é o mesmo.
const ITER = 2_000;

const dados: DadosColetados = {
  v: 1,
  gerado_em: '2026-11-21T17:00:00.000Z',
  janela: { de: '2026-08-24', ate: '2026-11-21' },
  fontes: {
    meta_br: { ok: true, linhas: 1 },
    meta_us: { ok: false, motivo: 'NAO_CONFIGURADO', secret: 'META_AD_ACCOUNT_US' },
    hotmart: { ok: true, linhas: 0 },
    google: { ok: false, motivo: 'NAO_CONFIGURADO' },
  },
  meta: [{ date: '2026-11-20', spend: 123.45, campaignName: 'MM | BR | F1-LP | VENDAS | Ação ✓' } as never],
  alcance: { ad7d: [], ad7dAnterior: [], adset7d: [] },
  hotmart: [],
  google: [],
  termos: [],
  cambio: { usd_brl: 5.4, fonte: 'fallback', por_dia: {} },
};

describe('criptografia Node (coletor) → WebCrypto (navegador)', () => {
  it('descriptografa exatamente o mesmo objeto', async () => {
    const env = criptografar(dados, 'senha-correta', ITER);
    expect(await descriptografar(env, 'senha-correta')).toEqual(dados);
  });

  it('envelope: v1, salt de 16 bytes, IV de 12, gerado_em em claro e nada mais em claro', () => {
    const env = criptografar(dados, 'senha-correta', ITER);
    expect(env.v).toBe(1);
    expect(Buffer.from(env.salt, 'base64')).toHaveLength(16);
    expect(Buffer.from(env.iv, 'base64')).toHaveLength(12);
    expect(env.gerado_em).toBe(dados.gerado_em);
    const bruto = JSON.stringify(env);
    expect(bruto).not.toContain('123.45');
    expect(bruto).not.toContain('MM | BR');
    expect(bruto).not.toContain('NAO_CONFIGURADO');
  });

  it('salt e IV mudam a cada execução', () => {
    const a = criptografar(dados, 'x', ITER);
    const b = criptografar(dados, 'x', ITER);
    expect(a.salt).not.toBe(b.salt);
    expect(a.iv).not.toBe(b.iv);
    expect(a.ct).not.toBe(b.ct);
  });

  it('senha errada falha com SenhaIncorreta e não devolve dado nenhum', async () => {
    const env = criptografar(dados, 'senha-correta', ITER);
    await expect(descriptografar(env, 'senha-errada')).rejects.toBeInstanceOf(SenhaIncorreta);
    await expect(descriptografar(env, '')).rejects.toBeInstanceOf(SenhaIncorreta);
  });

  it('texto cifrado adulterado falha (GCM autentica)', async () => {
    const env = criptografar(dados, 'k', ITER);
    const ct = Buffer.from(env.ct, 'base64');
    ct[5] ^= 1;
    await expect(descriptografar({ ...env, ct: ct.toString('base64') }, 'k')).rejects.toBeInstanceOf(SenhaIncorreta);
  });

  it('padrão de produção: 600.000 iterações', () => {
    // Só confere o parâmetro (derivar 600 mil vezes de verdade é lento no teste).
    expect(criptografar.length).toBeGreaterThanOrEqual(2);
    return import('@/lib/dados').then((m) => expect(m.ITERACOES_PBKDF2).toBe(600_000));
  });

  it('sem senha, o coletor se recusa a publicar', () => {
    expect(() => criptografar(dados, '')).toThrow(/DASHBOARD_PASSWORD/);
  });
});
