import { describe, expect, it } from 'vitest';
import { blocos, interpretarErroMeta, motivoDoErro, normalizarLinha } from '@/coletor/meta';
import { cotacaoDoDia } from '@/lib/cambio';

const cambio = { atual: 5.5, porDia: { '2026-11-14': 5.3, '2026-11-15': 5.4 }, fonte: 'awesomeapi' as const };

describe('Meta — normalização', () => {
  const linha = {
    date_start: '2026-11-15',
    campaign_id: 'c1',
    campaign_name: 'MM | US | F1-QUIZ | SALES | QUIZ-EN',
    adset_id: 's1',
    adset_name: 'BROAD',
    ad_id: 'a1',
    ad_name: 'VID | DOCTOR | V1',
    spend: '100.00',
    impressions: '5000',
    reach: '4000',
    frequency: '1.25',
    inline_link_clicks: '80',
    actions: [
      { action_type: 'landing_page_view', value: '60' },
      { action_type: 'omni_landing_page_view', value: '61' },
      { action_type: 'offsite_conversion.fb_pixel_initiate_checkout', value: '6' },
      { action_type: 'offsite_conversion.fb_pixel_purchase', value: '2' },
      { action_type: 'purchase', value: '2' },
      { action_type: 'video_view', value: '1500' },
      { action_type: 'offsite_conversion.fb_pixel_custom.QuizStart', value: '40' },
      { action_type: 'offsite_conversion.fb_pixel_custom.QuizComplete', value: '30' },
    ],
    action_values: [{ action_type: 'offsite_conversion.fb_pixel_purchase', value: '394' }],
    video_thruplay_watched_actions: [{ action_type: 'video_view', value: '300' }],
    quality_ranking: 'BELOW_AVERAGE_20',
  };

  it('extrai ações sem contar o mesmo evento duas vezes e converte USD→BRL pela cotação do dia', () => {
    const l = normalizarLinha(linha, 'US', 'USD', cambio, new Map([['a1', { status: 'ACTIVE', thumbnailUrl: 'x' }]]));
    expect(l.funnelKey).toBe('us-f1-quiz');
    expect(l.country).toBe('US');
    expect(l.lpv).toBe(60);
    expect(l.purchases).toBe(2);
    expect(l.initiateCheckout).toBe(6);
    expect(l.spendBrl).toBeCloseTo(540);
    expect(l.spendUsd).toBe(100);
    expect(l.purchaseValueBrl).toBeCloseTo(394 * 5.4);
    expect(l.video3s).toBe(1500);
    expect(l.thruplays).toBe(300);
    expect(l.quizStart).toBe(40);
    expect(l.quizComplete).toBe(30);
    expect(l.status).toBe('ACTIVE');
  });

  it('conta em BRL não converte', () => {
    const l = normalizarLinha({ ...linha, campaign_name: 'MM | BR | F1-LP | VENDAS' }, 'BR', 'BRL', cambio, new Map());
    expect(l.spendBrl).toBe(100);
    expect(l.spendUsd).toBeCloseTo(100 / 5.4);
    expect(l.status).toBe('UNKNOWN');
  });

  it('fim de semana usa a última cotação conhecida', () => {
    expect(cotacaoDoDia(cambio, '2026-11-16')).toBe(5.4);
    expect(cotacaoDoDia(cambio, '2026-11-01')).toBe(5.5);
  });
});

describe('Meta — erros', () => {
  it('código 190 → TOKEN_INVALIDO', () => {
    const e = interpretarErroMeta(400, { error: { code: 190, message: 'Error validating access token' } });
    expect(e.tipo).toBe('token');
    expect(motivoDoErro(e)).toBe('TOKEN_INVALIDO');
  });
  it('sem permissão na conta → SEM_ACESSO_A_CONTA', () => {
    expect(motivoDoErro(interpretarErroMeta(400, { error: { code: 200, message: 'Permissions error' } }))).toBe('SEM_ACESSO_A_CONTA');
    expect(motivoDoErro(interpretarErroMeta(400, { error: { code: 100, message: 'Object with ID does not exist' } }))).toBe('SEM_ACESSO_A_CONTA');
  });
  it.each([4, 17, 32, 613, 80004])('limite de chamadas (código %s) → retry', (code) => {
    expect(interpretarErroMeta(400, { error: { code, message: 'User request limit reached' } }).tipo).toBe('limite');
  });
  it('mensagem do erro nunca repete o texto da API (pode conter IDs)', () => {
    expect(interpretarErroMeta(400, { error: { code: 2, message: 'Account act_999 something' } }).message).not.toContain('act_999');
  });
  it('90 dias viram 3 blocos de 30', () => {
    expect(blocos({ de: '2026-08-24', ate: '2026-11-21' })).toEqual([
      { de: '2026-08-24', ate: '2026-09-22' },
      { de: '2026-09-23', ate: '2026-10-22' },
      { de: '2026-10-23', ate: '2026-11-21' },
    ]);
  });
  it('erro genérico', () => {
    const e = interpretarErroMeta(500, { error: { code: 1, message: 'Please reduce the amount of data' } });
    expect(e.tipo).toBe('api');
    expect(e.codigo).toBe(1);
  });
});
