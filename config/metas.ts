/**
 * Números de referência da operação. Edite à vontade: tudo na dashboard
 * (status dos funis, alertas, bonificação) lê daqui.
 * Valores em reais (R$) salvo indicação.
 */
export const METAS = {
  verbaMensalBR: 10000, // R$
  ticketMedioBR: 300, // R$, atualizar com o real da Hotmart
  taxaHotmart: 0.099, // aproximado; conferir no contrato da Hotmart
  roasEmpate: 1.15, // abaixo disso a operação perde dinheiro
  roasEscala: 1.3, // 3 dias seguidos acima disso → escalar 20%
  cpaCorteMultiplicador: 1.2, // anúncio com gasto > 1,2 × CPA médio e 0 vendas → pausar
  expressCorteGasto: 100, // R$ gastos sem venda e sem checkout → pausar
  frequenciaMaxRmk7d: 4,
  frequenciaMaxAberto7d: 3,
  lpvPorCliqueMin: 0.7, // abaixo disso: página lenta ou clique ruim
  bonusPercentual: 0.03, // bonificação da gestão sobre o resultado líquido
  bonusBaseMensal: 0, // Base do contrato (preencher quando definida)

  // Limiares auxiliares das regras de diagnóstico (seção 6)
  quedaCtrMax: 0.3, // regra 6: queda > 30%
  checkoutVsReferenciaMin: 0.5, // regra 8: < 50% do F1
  compraPorCheckoutMin: 0.25, // regra 9
  quizConclusaoMin: 0.6, // regra 10
  pixelCapturaMin: 0.8, // regra 11
  semSckMax: 0.15, // regra 12
  prejuizoGastoMin: 700, // regra 15 (R$, 7 dias)
  ritmoVerbaMax: 1.1, // regra 16
  ritmoVerbaMin: 0.8, // regra 16
  reembolsoMax: 0.1, // regra 17
  divergenciaMetaHotmart: 0.2, // selo da Visão geral

  // Volume mínimo para uma regra de taxa disparar (evita alarme com 3 cliques)
  minCliques: 50,
  minLpv: 50,
  minCheckouts: 8,
  minQuizInicios: 30,
  minImpressoesCtr: 1000,
  minVendasRastreio: 5,
  minVendasReembolso: 10,
};

export type Metas = typeof METAS;
