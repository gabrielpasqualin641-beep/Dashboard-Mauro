import { METAS } from '@/config/metas';
import { DATA_INICIO_OPERACAO } from '@/config/operacao';
import type { DadosColetados } from './dados';
import { diaEmSP, fimDoMes, maxDia, minDia, type Periodo } from './datas';
import type { VendaHotmart } from './tipos';

export interface LinhaCalculo {
  rotulo: string;
  valor: number;
  sinal: '+' | '−' | '=' | '×' | '';
  nota?: string;
}

export interface Bonificacao {
  mes: string; // YYYY-MM
  meses: string[];
  periodo: Periodo;
  /** O mês começa antes dos 90 dias coletados: faltam dias no cálculo. */
  parcial: boolean;
  exemplo: boolean;
  faltando: string[];
  linhas: LinhaCalculo[];
  bonus: number;
}

/** Meses com pelo menos um dia dentro da janela coletada (mais recente primeiro). */
export function mesesDisponiveis(hoje: string, desde: string = DATA_INICIO_OPERACAO): string[] {
  const out: string[] = [];
  let [a, m] = maxDia(desde, DATA_INICIO_OPERACAO).split('-').map(Number);
  const [ah, mh] = hoje.split('-').map(Number);
  while (a < ah || (a === ah && m <= mh)) {
    out.push(`${a}-${String(m).padStart(2, '0')}`);
    m++;
    if (m > 12) {
      m = 1;
      a++;
    }
  }
  return out.reverse();
}

/** Cálculo puro (testável): recebe vendas e investimento já em R$. */
export function calcularBonificacao(vendas: VendaHotmart[], investimento: { meta: number; google: number }, metas = METAS) {
  const comOrigem = vendas.filter((v) => v.funnelKey !== null);
  const soma = (st: VendaHotmart['status'][]) => comOrigem.filter((v) => st.includes(v.status)).reduce((s, v) => s + v.grossBrl, 0);
  const brutoPago = soma(['aprovada', 'reembolsada', 'chargeback']);
  const reembolsos = soma(['reembolsada']);
  const chargebacks = soma(['chargeback']);
  const faturamento = brutoPago - reembolsos - chargebacks;
  const invest = investimento.meta + investimento.google;
  const resultado = faturamento - invest;
  const acimaDaBase = Math.max(0, resultado - metas.bonusBaseMensal);
  const bonus = acimaDaBase * metas.bonusPercentual;
  const linhas: LinhaCalculo[] = [
    { rotulo: 'Vendas brutas com origem identificada (aprovadas + depois reembolsadas)', valor: brutoPago, sinal: '+', nota: 'Hotmart, valor bruto, convertido para R$' },
    { rotulo: 'Reembolsos', valor: reembolsos, sinal: '−', nota: 'Hotmart' },
    { rotulo: 'Chargebacks', valor: chargebacks, sinal: '−', nota: 'Hotmart' },
    { rotulo: 'Faturamento de anúncios', valor: faturamento, sinal: '=' },
    { rotulo: 'Investimento Meta (BR + US)', valor: investimento.meta, sinal: '−', nota: 'Meta, convertido para R$' },
    { rotulo: 'Investimento Google Ads', valor: investimento.google, sinal: '−', nota: 'Google, convertido para R$' },
    { rotulo: 'Resultado líquido', valor: resultado, sinal: '=' },
    { rotulo: 'Base mensal do contrato', valor: metas.bonusBaseMensal, sinal: '−' },
    { rotulo: 'Resultado acima da base', valor: acimaDaBase, sinal: '=' },
    { rotulo: `Bonificação (${(metas.bonusPercentual * 100).toFixed(1).replace('.', ',')}%)`, valor: bonus, sinal: '×' },
  ];
  return { linhas, bonus };
}

/** Bonificação de um mês, calculada no navegador sobre os dados coletados. */
export function bonificacaoDoMes(dados: DadosColetados, mesPedido: string | null): Bonificacao {
  const hoje = diaEmSP(new Date(dados.gerado_em));
  const meses = mesesDisponiveis(hoje, dados.janela.de);
  const mes = mesPedido && meses.includes(mesPedido) ? mesPedido : meses[0];
  const inicioMes = mes === DATA_INICIO_OPERACAO.slice(0, 7) ? DATA_INICIO_OPERACAO : `${mes}-01`;
  const de = maxDia(inicioMes, dados.janela.de);
  const periodo: Periodo = { de, ate: minDia(fimDoMes(`${mes}-01`), hoje) };
  const dentro = (d: string) => d >= periodo.de && d <= periodo.ate;

  const faltando: string[] = [];
  if (!dados.fontes.meta_br?.ok) faltando.push('Meta BR');
  if (!dados.fontes.meta_us?.ok && dados.fontes.meta_us?.motivo !== 'NAO_CONFIGURADO') faltando.push('Meta US');
  if (!dados.fontes.hotmart?.ok) faltando.push('Hotmart');

  const meta = dados.meta.filter((l) => dentro(l.date)).reduce((s, l) => s + l.spendBrl, 0);
  const google = dados.google.filter((l) => dentro(l.date)).reduce((s, l) => s + l.costBrl, 0);
  const vendas = dados.hotmart.filter((v) => dentro(v.date));
  const { linhas, bonus } = calcularBonificacao(vendas, { meta, google });
  return { mes, meses, periodo, parcial: inicioMes < dados.janela.de, exemplo: Boolean(dados.exemplo), faltando, linhas, bonus };
}
