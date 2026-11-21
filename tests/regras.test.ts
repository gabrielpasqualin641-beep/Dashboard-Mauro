import { describe, expect, it } from 'vitest';
import { METAS } from '@/config/metas';
import {
  ordenarAlertas,
  regra10Quiz,
  regra11Pixel,
  regra12SemSck,
  regra13Nomenclatura,
  regra14Fontes,
  regra15Prejuizo,
  regra16Ritmo,
  regra17Reembolso,
  regra1AnuncioSemVenda,
  regra2ExpressSemCheckout,
  regra3Escalar,
  regra4QualidadeBaixa,
  regra5Frequencia,
  regra6CriativoCansando,
  regra7PaginaLenta,
  regra8PaginaNaoConverte,
  regra9Checkout,
  statusDoFunil,
  type StatsAnuncio,
  type StatsFunil,
} from '@/lib/regras';
import type { Alerta, StatusFonte } from '@/lib/tipos';

const ad = (o: Partial<StatsAnuncio> = {}): StatsAnuncio => ({
  adId: '1',
  adName: 'VID | NOTAS-23-ANOS | V1',
  adsetName: 'ABERTO',
  funilNome: 'BR · F1 · LP direta',
  gasto: 0,
  vendas: 0,
  checkouts: 0,
  qualityRanking: 'AVERAGE',
  ...o,
});

const funil = (o: Partial<StatsFunil> = {}): StatsFunil => ({
  chave: 'br-f2-quiz',
  nome: 'BR · F2 · Quiz',
  gasto: 1000,
  impressoes: 50000,
  cliquesLink: 1000,
  lpv: 800,
  checkouts: 40,
  vendas: 12,
  comprasMeta: 10,
  receita: 3000,
  temQuiz: true,
  quizInicio: 500,
  quizFim: 400,
  ...o,
});

describe('Regra 1 — anúncio gastou acima do CPA sem vender', () => {
  it('dispara quando gasto > 1,2 × CPA e 0 vendas', () => {
    const a = regra1AnuncioSemVenda(ad({ gasto: 361 }), 300);
    expect(a.nivel).toBe('critico');
    expect(a.verbaEmRisco).toBe(361);
    expect(a.titulo).toMatch(/Pausar/);
  });
  it('não dispara exatamente no limite (gasto = 1,2 × CPA)', () => {
    expect(regra1AnuncioSemVenda(ad({ gasto: 360 }), 300).nivel).toBe('ok');
  });
  it('não dispara se vendeu 1', () => {
    expect(regra1AnuncioSemVenda(ad({ gasto: 2000, vendas: 1 }), 300).nivel).toBe('ok');
  });
  it('não dispara sem CPA de referência', () => {
    expect(regra1AnuncioSemVenda(ad({ gasto: 2000 }), 0).nivel).toBe('ok');
  });
});

describe('Regra 2 — Express sem checkout', () => {
  it('dispara com gasto ≥ R$100, 0 vendas e 0 checkouts', () => {
    expect(regra2ExpressSemCheckout(ad({ gasto: 100 })).nivel).toBe('critico');
  });
  it('não dispara com R$99,99', () => {
    expect(regra2ExpressSemCheckout(ad({ gasto: 99.99 })).nivel).toBe('ok');
  });
  it('não dispara se teve 1 checkout', () => {
    expect(regra2ExpressSemCheckout(ad({ gasto: 500, checkouts: 1 })).nivel).toBe('ok');
  });
  it('não dispara se teve 1 venda', () => {
    expect(regra2ExpressSemCheckout(ad({ gasto: 500, vendas: 1 })).nivel).toBe('ok');
  });
});

describe('Regra 3 — escalar 20%', () => {
  const base = { adName: 'A', adsetName: 'CONJ', funilNome: 'F1' };
  it('dispara com ROAS > 1,3 e 2 vendas em 3 dias', () => {
    const a = regra3Escalar({ ...base, gasto: 300, receita: 400, vendas: 2 });
    expect(a.nivel).toBe('atencao');
    expect(a.acao).toMatch(/20%/);
    expect(a.acao).toMatch(/CONJ/);
  });
  it('não dispara com ROAS exatamente 1,3', () => {
    expect(regra3Escalar({ ...base, gasto: 100, receita: 130, vendas: 3 }).nivel).toBe('ok');
  });
  it('não dispara com 1 venda só', () => {
    expect(regra3Escalar({ ...base, gasto: 100, receita: 400, vendas: 1 }).nivel).toBe('ok');
  });
  it('não dispara sem gasto', () => {
    expect(regra3Escalar({ ...base, gasto: 0, receita: 400, vendas: 3 }).nivel).toBe('ok');
  });
});

describe('Regra 4 — qualidade abaixo da média', () => {
  it.each(['BELOW_AVERAGE_10', 'BELOW_AVERAGE_20'])('dispara com %s', (r) => {
    expect(regra4QualidadeBaixa(ad({ gasto: 50, qualityRanking: r })).nivel).toBe('atencao');
  });
  it.each(['BELOW_AVERAGE_35', 'AVERAGE', 'ABOVE_AVERAGE', 'UNKNOWN'])('não dispara com %s', (r) => {
    expect(regra4QualidadeBaixa(ad({ gasto: 50, qualityRanking: r })).nivel).toBe('ok');
  });
  it('não dispara em anúncio sem gasto', () => {
    expect(regra4QualidadeBaixa(ad({ gasto: 0, qualityRanking: 'BELOW_AVERAGE_10' })).nivel).toBe('ok');
  });
});

describe('Regra 5 — frequência', () => {
  const c = { adsetName: 'C', funilNome: 'F', gasto7d: 300 };
  it('remarketing: dispara acima de 4', () => {
    expect(regra5Frequencia({ ...c, remarketing: true, frequencia7d: 4.01 }).nivel).toBe('atencao');
    expect(regra5Frequencia({ ...c, remarketing: true, frequencia7d: 4 }).nivel).toBe('ok');
  });
  it('público aberto: dispara acima de 3', () => {
    expect(regra5Frequencia({ ...c, remarketing: false, frequencia7d: 3.2 }).nivel).toBe('atencao');
    expect(regra5Frequencia({ ...c, remarketing: false, frequencia7d: 3 }).nivel).toBe('ok');
  });
  it('remarketing com 3,5 não dispara', () => {
    expect(regra5Frequencia({ ...c, remarketing: true, frequencia7d: 3.5 }).nivel).toBe('ok');
  });
});

describe('Regra 6 — criativo cansando', () => {
  const s = {
    adName: 'A',
    funilNome: 'F',
    ctrAtual: 0.006,
    ctrAnterior: 0.01,
    freqAtual: 2.2,
    freqAnterior: 1.8,
    impressoesAtual: 5000,
    impressoesAnterior: 5000,
    gasto7d: 500,
  };
  it('dispara com queda de 40% e frequência subindo', () => {
    const a = regra6CriativoCansando(s);
    expect(a.nivel).toBe('atencao');
    expect(a.verbaEmRisco).toBeCloseTo(200);
  });
  it('não dispara se a frequência não subiu', () => {
    expect(regra6CriativoCansando({ ...s, freqAtual: 1.8 }).nivel).toBe('ok');
  });
  it('não dispara com queda de exatamente 30%', () => {
    expect(regra6CriativoCansando({ ...s, ctrAtual: 0.007 }).nivel).toBe('ok');
  });
  it('não dispara com pouco volume', () => {
    expect(regra6CriativoCansando({ ...s, impressoesAtual: 999 }).nivel).toBe('ok');
  });
  it('não dispara sem CTR anterior', () => {
    expect(regra6CriativoCansando({ ...s, ctrAnterior: 0 }).nivel).toBe('ok');
  });
});

describe('Regra 7 — página lenta', () => {
  it('dispara com LPV/clique < 70%', () => {
    const a = regra7PaginaLenta(funil({ cliquesLink: 100, lpv: 60 }));
    expect(a.nivel).toBe('atencao');
    expect(a.acao).toMatch(/4G/);
  });
  it('não dispara com exatamente 70%', () => {
    expect(regra7PaginaLenta(funil({ cliquesLink: 100, lpv: 70 })).nivel).toBe('ok');
  });
  it('não dispara com menos de 50 cliques', () => {
    expect(regra7PaginaLenta(funil({ cliquesLink: 49, lpv: 10 })).nivel).toBe('ok');
  });
});

describe('Regra 8 — página não converte vs F1', () => {
  const f1 = funil({ chave: 'br-f1-lp', nome: 'F1', lpv: 1000, checkouts: 60 }); // 6%
  it('dispara quando checkout/LPV < 50% do F1', () => {
    expect(regra8PaginaNaoConverte(funil({ lpv: 1000, checkouts: 29 }), f1).nivel).toBe('critico');
  });
  it('não dispara com exatamente 50% do F1', () => {
    expect(regra8PaginaNaoConverte(funil({ lpv: 1000, checkouts: 30 }), f1).nivel).toBe('ok');
  });
  it('não compara o F1 com ele mesmo', () => {
    expect(regra8PaginaNaoConverte(f1, f1).nivel).toBe('ok');
  });
  it('não dispara se o F1 não tem checkout', () => {
    expect(regra8PaginaNaoConverte(funil({ lpv: 1000, checkouts: 0 }), { ...f1, checkouts: 0 }).nivel).toBe('ok');
  });
  it('não dispara com pouco LPV', () => {
    expect(regra8PaginaNaoConverte(funil({ lpv: 49, checkouts: 0 }), f1).nivel).toBe('ok');
  });
});

describe('Regra 9 — checkout', () => {
  it('dispara com compras/checkout < 25%', () => {
    expect(regra9Checkout(funil({ checkouts: 40, vendas: 9 })).nivel).toBe('critico');
  });
  it('não dispara com exatamente 25%', () => {
    expect(regra9Checkout(funil({ checkouts: 40, vendas: 10 })).nivel).toBe('ok');
  });
  it('não dispara com menos de 8 checkouts', () => {
    expect(regra9Checkout(funil({ checkouts: 7, vendas: 0 })).nivel).toBe('ok');
  });
});

describe('Regra 10 — abandono no quiz', () => {
  it('dispara com conclusão < 60%', () => {
    expect(regra10Quiz(funil({ quizInicio: 100, quizFim: 59 })).nivel).toBe('atencao');
  });
  it('não dispara com 60%', () => {
    expect(regra10Quiz(funil({ quizInicio: 100, quizFim: 60 })).nivel).toBe('ok');
  });
  it('não se aplica a funil sem quiz', () => {
    expect(regra10Quiz(funil({ temQuiz: false, quizInicio: 100, quizFim: 0 })).nivel).toBe('ok');
  });
  it('não dispara com menos de 30 inícios', () => {
    expect(regra10Quiz(funil({ quizInicio: 29, quizFim: 0 })).nivel).toBe('ok');
  });
});

describe('Regra 11 — pixel perdendo compras', () => {
  it('dispara quando o Meta registra < 80%', () => {
    expect(regra11Pixel({ onde: 'Meta BR', vendasHotmart: 10, comprasMeta: 7, gasto: 1000 }).nivel).toBe('critico');
  });
  it('não dispara com exatamente 80%', () => {
    expect(regra11Pixel({ onde: 'Meta BR', vendasHotmart: 10, comprasMeta: 8, gasto: 1000 }).nivel).toBe('ok');
  });
  it('não dispara se o Meta registra mais que a Hotmart', () => {
    expect(regra11Pixel({ onde: 'Meta BR', vendasHotmart: 10, comprasMeta: 14, gasto: 1000 }).nivel).toBe('ok');
  });
  it('não dispara com menos de 5 vendas', () => {
    expect(regra11Pixel({ onde: 'Meta BR', vendasHotmart: 4, comprasMeta: 0, gasto: 1000 }).nivel).toBe('ok');
  });
});

describe('Regra 12 — vendas sem sck', () => {
  it('dispara acima de 15%', () => {
    expect(regra12SemSck({ vendas: 100, semSck: 16, gasto: 1000 }).nivel).toBe('atencao');
  });
  it('não dispara com exatamente 15%', () => {
    expect(regra12SemSck({ vendas: 100, semSck: 15, gasto: 1000 }).nivel).toBe('ok');
  });
  it('não dispara com poucas vendas', () => {
    expect(regra12SemSck({ vendas: 4, semSck: 4, gasto: 1000 }).nivel).toBe('ok');
  });
});

describe('Regra 13 — nomenclatura', () => {
  it('dispara e soma o gasto das campanhas fora do padrão', () => {
    const a = regra13Nomenclatura([
      { nome: 'Teste', gasto: 50 },
      { nome: 'Outra', gasto: 25 },
    ]);
    expect(a.nivel).toBe('atencao');
    expect(a.verbaEmRisco).toBe(75);
    expect(a.onde).toContain('"Teste"');
  });
  it('ignora campanha sem gasto', () => {
    expect(regra13Nomenclatura([{ nome: 'Velha', gasto: 0 }]).nivel).toBe('ok');
  });
  it('lista vazia → ok', () => {
    expect(regra13Nomenclatura([]).nivel).toBe('ok');
  });
});

describe('Regra 14 — fonte fora do ar', () => {
  const f = (fonte: StatusFonte['fonte'], estado: StatusFonte['estado'], mensagem?: string): StatusFonte => ({
    fonte,
    rotulo: fonte,
    estado,
    mensagem,
    atualizadoEm: null,
  });
  it('diz qual fonte caiu', () => {
    const a = regra14Fontes([f('metaBR', 'ok'), f('hotmart', 'erro', 'Token da Hotmart expirado')]);
    expect(a.nivel).toBe('critico');
    expect(a.onde).toBe('hotmart');
    expect(a.numero).toMatch(/expirado/);
  });
  it('fonte em exemplo também alerta', () => {
    expect(regra14Fontes([f('metaUS', 'exemplo')]).nivel).toBe('critico');
  });
  it('fonte ok e Google não configurado (fase 2) não alertam', () => {
    expect(regra14Fontes([f('metaBR', 'ok'), f('google', 'nao-configurado'), f('hotmart', 'ok')]).nivel).toBe('ok');
  });
});

describe('Regra 15 — funil dando prejuízo', () => {
  it('dispara com ROAS < 1,15 e gasto > R$700', () => {
    const a = regra15Prejuizo({ nome: 'F2', gasto7d: 1000, receita7d: 1000 });
    expect(a.nivel).toBe('critico');
    expect(a.verbaEmRisco).toBeCloseTo(150);
  });
  it('não dispara com gasto exatamente R$700', () => {
    expect(regra15Prejuizo({ nome: 'F2', gasto7d: 700, receita7d: 0 }).nivel).toBe('ok');
  });
  it('não dispara com ROAS exatamente 1,15', () => {
    expect(regra15Prejuizo({ nome: 'F2', gasto7d: 1000, receita7d: 1150 }).nivel).toBe('ok');
  });
});

describe('Regra 16 — ritmo da verba', () => {
  const base = { verbaMensal: 10000, diaDoMes: 15, diasNoMes: 30 }; // esperado R$5.000
  it('dispara acima de 110%', () => {
    expect(regra16Ritmo({ ...base, gastoMes: 5600 }).titulo).toMatch(/acima/);
  });
  it('dispara abaixo de 80%', () => {
    expect(regra16Ritmo({ ...base, gastoMes: 3900 }).titulo).toMatch(/abaixo/);
  });
  it('não dispara nos limites (80% e 110%)', () => {
    expect(regra16Ritmo({ ...base, gastoMes: 4000 }).nivel).toBe('ok');
    expect(regra16Ritmo({ ...base, gastoMes: 5500 }).nivel).toBe('ok');
  });
  it('dia 1 sem gasto dispara (abaixo)', () => {
    expect(regra16Ritmo({ verbaMensal: 10000, diaDoMes: 1, diasNoMes: 31, gastoMes: 0 }).nivel).toBe('atencao');
  });
  it('sem verba definida não dispara', () => {
    expect(regra16Ritmo({ ...base, verbaMensal: 0, gastoMes: 100 }).nivel).toBe('ok');
  });
});

describe('Regra 17 — reembolso alto', () => {
  it('dispara acima de 10%', () => {
    const a = regra17Reembolso({ aprovadas: 17, reembolsos: 2, chargebacks: 1, valorPerdido: 1191 });
    expect(a.nivel).toBe('critico');
    expect(a.verbaEmRisco).toBe(1191);
  });
  it('não dispara com exatamente 10%', () => {
    expect(regra17Reembolso({ aprovadas: 18, reembolsos: 1, chargebacks: 1, valorPerdido: 0 }).nivel).toBe('ok');
  });
  it('não dispara com menos de 10 vendas', () => {
    expect(regra17Reembolso({ aprovadas: 5, reembolsos: 4, chargebacks: 0, valorPerdido: 0 }).nivel).toBe('ok');
  });
});

describe('Ordenação e status do funil', () => {
  const al = (regra: number, verba: number, nivel: Alerta['nivel'] = 'atencao'): Alerta => ({
    regra,
    nivel,
    titulo: '',
    onde: '',
    numero: '',
    acao: '',
    verbaEmRisco: verba,
  });
  it('ordena por verba em risco, fonte fora do ar primeiro, remove ok', () => {
    const r = ordenarAlertas([al(1, 100, 'critico'), al(14, 0, 'critico'), al(7, 500), al(3, 0, 'ok')]);
    expect(r.map((a) => a.regra)).toEqual([14, 7, 1]);
  });
  it('status: Escalar exige ROAS ≥ 1,3 no período e 3 dias seguidos acima', () => {
    expect(statusDoFunil({ gasto: 100, receita: 140, roasUltimos3Dias: [1.4, 1.5, 1.31] })).toBe('Escalar');
    expect(statusDoFunil({ gasto: 100, receita: 140, roasUltimos3Dias: [1.4, 1.2, 1.5] })).toBe('Manter');
  });
  it('status: Atenção até 20% abaixo do empate, Pausar abaixo disso', () => {
    expect(statusDoFunil({ gasto: 1000, receita: 1000, roasUltimos3Dias: [] })).toBe('Atenção');
    expect(statusDoFunil({ gasto: 1000, receita: 500, roasUltimos3Dias: [] })).toBe('Pausar');
    expect(statusDoFunil({ gasto: 0, receita: 0, roasUltimos3Dias: [] })).toBe('—');
  });
  it('usa os números de config/metas.ts', () => {
    expect(METAS.roasEmpate).toBe(1.15);
    expect(METAS.roasEscala).toBe(1.3);
  });
});
