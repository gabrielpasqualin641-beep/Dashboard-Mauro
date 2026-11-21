/**
 * Mapa da operação Marlon Mattedi — fonte de verdade da dashboard.
 *
 * Toda classificação de campanha (pelo nome) e de venda (pelo `sck` da Hotmart)
 * sai daqui. Para adicionar um funil novo: inclua uma entrada em FUNIS com a
 * regra do nome da campanha e os `sck` que a Hotmart recebe nos links desse funil.
 *
 * Padrão de nome de campanha: `MM | PAÍS | FUNIL | OBJETIVO | PÁGINA`
 * Padrão de nome de anúncio:  `<FORMATO> | <CONCEITO> | ...` (o 2º campo é o conceito)
 */

export type Pais = 'BR' | 'US';

export type FunnelKey =
  | 'br-f1-lp'
  | 'br-f2-quiz'
  | 'br-f3-express'
  | 'br-rmk'
  | 'us-f1-quiz'
  | 'us-f2-lp'
  | 'us-google'
  | 'nao-classificada';

export interface Produto {
  chave: 'controle-20' | 'controle-express' | 'control-20-us';
  nome: string;
  mercado: Pais;
  preco: number;
  moeda: 'BRL' | 'USD';
  parcelamento: string;
  /**
   * Códigos que identificam o produto na API da Hotmart. A API devolve
   * `product.id` (numérico) e `product.ucode`; o código do checkout
   * (pay.hotmart.com/XXXX) também é aceito. Coloque aqui qualquer um deles.
   */
  codigosHotmart: string[];
  /** Plano B: trecho do nome do produto na Hotmart (sem acento, minúsculo). */
  nomeContem: string[];
}

export const PRODUTOS: Produto[] = [
  {
    chave: 'controle-20',
    nome: 'CONTROLE 2.0',
    mercado: 'BR',
    preco: 397,
    moeda: 'BRL',
    parcelamento: '12x R$33,08',
    codigosHotmart: ['F10074400O'],
    nomeContem: ['controle 2.0', 'controle 2'],
  },
  {
    chave: 'controle-express',
    nome: 'Controle Express',
    mercado: 'BR',
    preco: 47,
    moeda: 'BRL',
    parcelamento: 'à vista',
    codigosHotmart: ['EXPRESS_ID'], // ← preencher com o ID/código real do Express
    nomeContem: ['express'],
  },
  {
    chave: 'control-20-us',
    nome: 'CONTROL 2.0 Protocol',
    mercado: 'US',
    preco: 197,
    moeda: 'USD',
    parcelamento: '4x US$54,34',
    codigosHotmart: ['R96183253Y'],
    nomeContem: ['control 2.0 protocol', 'protocol'],
  },
];

export interface Funil {
  chave: Exclude<FunnelKey, 'nao-classificada'>;
  pais: Pais;
  nome: string;
  plataforma: 'meta' | 'google';
  /** Página de destino (só informativo). */
  pagina: string;
  /** Funil com quiz: mostra as etapas QuizStart → QuizComplete. */
  temQuiz: boolean;
  /** Remarketing usa limite de frequência próprio. */
  remarketing: boolean;
  /** Todos os trechos precisam aparecer no nome da campanha (sem diferenciar maiúsculas). */
  nomeContemTodos: string[];
  /** Pelo menos um destes trechos precisa aparecer (vazio = não exige). */
  nomeContemAlgum: string[];
  /** Valores de `sck` da Hotmart que pertencem a este funil. */
  sck: string[];
  /** Venda sem sck: aceita se o utm_campaign/src contiver algum destes trechos. */
  utmCampaignContem: string[];
  /** Venda sem sck: aceita se utm_source for um destes. */
  utmSource: string[];
}

export const FUNIS: Funil[] = [
  {
    chave: 'br-f1-lp',
    pais: 'BR',
    nome: 'F1 · LP direta',
    plataforma: 'meta',
    pagina: '/controle-20-lp1/',
    temQuiz: false,
    remarketing: false,
    nomeContemTodos: ['| BR |', 'F1-'],
    nomeContemAlgum: [],
    sck: ['f1-lp'],
    utmCampaignContem: ['f1'],
    utmSource: [],
  },
  {
    chave: 'br-f2-quiz',
    pais: 'BR',
    nome: 'F2 · Quiz',
    plataforma: 'meta',
    pagina: '/quiz/',
    temQuiz: true,
    remarketing: false,
    nomeContemTodos: ['| BR |', 'F2-QUIZ'],
    nomeContemAlgum: [],
    sck: ['f6-quiz'],
    utmCampaignContem: [],
    utmSource: [],
  },
  {
    chave: 'br-f3-express',
    pais: 'BR',
    nome: 'F3 · Express R$47',
    plataforma: 'meta',
    pagina: '/controle-express/',
    temQuiz: false,
    remarketing: false,
    nomeContemTodos: ['| BR |', 'F3-EXPRESS'],
    nomeContemAlgum: [],
    sck: ['f3-express'],
    utmCampaignContem: [],
    utmSource: [],
  },
  {
    chave: 'br-rmk',
    pais: 'BR',
    nome: 'Remarketing',
    plataforma: 'meta',
    pagina: '/controle-20-lp1/',
    temQuiz: false,
    remarketing: true,
    nomeContemTodos: ['| BR |'],
    nomeContemAlgum: ['RMK', 'REMARKETING'],
    sck: ['rmk'],
    utmCampaignContem: [],
    utmSource: [],
  },
  {
    chave: 'us-f1-quiz',
    pais: 'US',
    nome: 'F1 · Quiz',
    plataforma: 'meta',
    pagina: '/quiz-en/',
    temQuiz: true,
    remarketing: false,
    nomeContemTodos: ['| US |', 'F1-QUIZ'],
    nomeContemAlgum: [],
    sck: ['us-f1-quiz'],
    utmCampaignContem: [],
    utmSource: [],
  },
  {
    chave: 'us-f2-lp',
    pais: 'US',
    nome: 'F2 · LP',
    plataforma: 'meta',
    pagina: 'LP1 em inglês',
    temQuiz: false,
    remarketing: false,
    nomeContemTodos: ['| US |', 'F2-LP'],
    nomeContemAlgum: [],
    sck: ['us-f2-lp'],
    utmCampaignContem: [],
    utmSource: [],
  },
  {
    chave: 'us-google',
    pais: 'US',
    nome: 'Google Pesquisa',
    plataforma: 'google',
    pagina: '/control-exercises',
    temQuiz: false,
    remarketing: false,
    nomeContemTodos: [],
    nomeContemAlgum: [],
    sck: [],
    utmCampaignContem: [],
    utmSource: ['google'],
  },
];

/** Funil de referência de cada país para a regra 8 (checkout ÷ LPV). */
export const FUNIL_REFERENCIA: Record<Pais, FunnelKey> = {
  BR: 'br-f1-lp',
  US: 'us-f1-quiz',
};

/**
 * Eventos personalizados do quiz. O Meta devolve conversões personalizadas como
 * `offsite_conversion.custom.<ID>` e eventos de pixel personalizados como
 * `offsite_conversion.fb_pixel_custom.<Nome>`. Liste aqui todos os tipos que
 * representam cada etapa (inclua o ID da conversão personalizada, se houver).
 */
export const EVENTOS_QUIZ = {
  inicio: ['offsite_conversion.fb_pixel_custom.QuizStart', 'QuizStart'],
  etapa: ['offsite_conversion.fb_pixel_custom.QuizStep', 'QuizStep'],
  conclusao: ['offsite_conversion.fb_pixel_custom.QuizComplete', 'QuizComplete'],
};

/** Primeiro dia aceito no seletor de datas (início das campanhas atuais). */
export const DATA_INICIO_OPERACAO = '2026-10-22';

export const FUSO = 'America/Sao_Paulo';

/** Link para o relatório de abandono de carrinho no painel da Hotmart. */
export const LINK_ABANDONO_HOTMART = 'https://app.hotmart.com/';

export const NOME_FUNIL: Record<FunnelKey, string> = {
  ...(Object.fromEntries(FUNIS.map((f) => [f.chave, `${f.pais} · ${f.nome}`])) as Record<
    Exclude<FunnelKey, 'nao-classificada'>,
    string
  >),
  'nao-classificada': 'Não classificada',
};

export function funilPorChave(chave: FunnelKey): Funil | undefined {
  return FUNIS.find((f) => f.chave === chave);
}
