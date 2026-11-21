import { describe, expect, it } from 'vitest';
import { conceitoDoAnuncio, funilDaCampanha, funilDaVenda, paisDaCampanha, produtoDaVenda } from '@/lib/classificar';
import { periodoAnterior, periodoDoPreset, diasEntre } from '@/lib/datas';

describe('funil pela campanha', () => {
  it.each([
    ['MM | BR | F1-LP | VENDAS | LP1', 'br-f1-lp'],
    ['MM | BR | F2-QUIZ | VENDAS | QUIZ', 'br-f2-quiz'],
    ['MM | BR | F3-EXPRESS | VENDAS | EXPRESS', 'br-f3-express'],
    ['MM | BR | RMK | VENDAS | LP1', 'br-rmk'],
    ['MM | BR | F1-LP | REMARKETING | LP1', 'br-rmk'],
    ['MM | US | F1-QUIZ | SALES | QUIZ-EN', 'us-f1-quiz'],
    ['MM | US | F2-LP | SALES | LP1-EN', 'us-f2-lp'],
    ['mm|br|f2-quiz|vendas', 'br-f2-quiz'],
    ['MM  |  BR  |  F1-LP', 'br-f1-lp'],
    ['Teste novo criativo', 'nao-classificada'],
    ['MM | AR | F1-LP | VENDAS', 'nao-classificada'],
    ['MM | US | F2-QUIZ | SALES', 'nao-classificada'],
  ])('%s → %s', (nome, chave) => {
    expect(funilDaCampanha(nome)).toBe(chave);
  });

  it('país pelo nome, com fallback para a conta', () => {
    expect(paisDaCampanha('MM | US | F1-QUIZ', 'BR')).toBe('US');
    expect(paisDaCampanha('qualquer', 'BR')).toBe('BR');
  });

  it('conceito é o 2º campo do nome do anúncio', () => {
    expect(conceitoDoAnuncio('VID | notas-23-anos | V1')).toBe('NOTAS-23-ANOS');
    expect(conceitoDoAnuncio('Anúncio solto')).toBe('ANÚNCIO SOLTO');
  });
});

describe('funil pela venda', () => {
  const v = (o: Partial<{ sck: string; utmSource: string; utmCampaign: string; src: string }>) => ({
    sck: '',
    utmSource: '',
    utmCampaign: '',
    src: '',
    ...o,
  });
  it.each([
    ['f1-lp', 'br-f1-lp'],
    ['f6-quiz', 'br-f2-quiz'],
    ['F3-EXPRESS', 'br-f3-express'],
    ['rmk', 'br-rmk'],
    ['us-f1-quiz', 'us-f1-quiz'],
    ['us-f2-lp', 'us-f2-lp'],
  ])('sck %s → %s', (sck, chave) => {
    expect(funilDaVenda(v({ sck }), 'BR')).toBe(chave);
  });
  it('sck desconhecido → origem não identificada', () => {
    expect(funilDaVenda(v({ sck: 'instagram-bio' }), 'BR')).toBeNull();
  });
  it('sem sck + utm_source google → us-google', () => {
    expect(funilDaVenda(v({ utmSource: 'google' }), 'US')).toBe('us-google');
  });
  it('sem sck + utm_campaign f1 → br-f1-lp (só para produto BR)', () => {
    expect(funilDaVenda(v({ utmCampaign: 'mm-f1-lp1' }), 'BR')).toBe('br-f1-lp');
    expect(funilDaVenda(v({ utmCampaign: 'f12-teste' }), 'BR')).toBeNull();
    expect(funilDaVenda(v({ utmCampaign: 'f1' }), 'US')).toBeNull();
  });
  it('sem nada → null', () => {
    expect(funilDaVenda(v({}), 'BR')).toBeNull();
  });
});

describe('produto', () => {
  it('por código e por nome', () => {
    expect(produtoDaVenda('F10074400O', undefined, '')?.chave).toBe('controle-20');
    expect(produtoDaVenda(123, 'R96183253Y', '')?.chave).toBe('control-20-us');
    expect(produtoDaVenda(999, undefined, 'Controle Express - Acesso')?.chave).toBe('controle-express');
    expect(produtoDaVenda(999, undefined, 'CONTROLE 2.0')?.chave).toBe('controle-20');
    expect(produtoDaVenda(999, undefined, 'Outro curso')).toBeUndefined();
  });
});

describe('períodos', () => {
  it('7 dias termina hoje e o anterior tem o mesmo tamanho', () => {
    const p = periodoDoPreset('7d', '2026-11-21');
    expect(p).toEqual({ de: '2026-11-15', ate: '2026-11-21' });
    expect(periodoAnterior(p)).toEqual({ de: '2026-11-08', ate: '2026-11-14' });
  });
  it('não aceita antes de 22/10/2026 nem depois de hoje', () => {
    expect(periodoDoPreset('personalizado', '2026-11-21', { de: '2026-01-01', ate: '2027-01-01' })).toEqual({
      de: '2026-10-22',
      ate: '2026-11-21',
    });
  });
  it('datas invertidas são corrigidas', () => {
    expect(periodoDoPreset('personalizado', '2026-11-21', { de: '2026-11-17', ate: '2026-10-29' })).toEqual({
      de: '2026-10-29',
      ate: '2026-11-17',
    });
  });
  it('mês atual e 29/10–17/11 (20 dias)', () => {
    expect(periodoDoPreset('mes', '2026-11-21')).toEqual({ de: '2026-11-01', ate: '2026-11-21' });
    expect(diasEntre('2026-10-29', '2026-11-17')).toBe(20);
  });
});
