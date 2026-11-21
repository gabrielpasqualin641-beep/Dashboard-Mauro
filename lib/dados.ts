/**
 * Formato do arquivo que o coletor (GitHub Action) gera e a página lê.
 * O arquivo publicado é sempre o Envelope criptografado; DadosColetados só
 * existe em memória (no Action antes de cifrar, no navegador depois de decifrar).
 */
import type { AlcanceMeta, LinhaGoogle, LinhaMeta, TermoBusca, VendaHotmart } from './tipos';

export type MotivoFonte =
  | 'NAO_CONFIGURADO'
  | 'TOKEN_INVALIDO'
  | 'SEM_ACESSO_A_CONTA'
  | 'LIMITE_DE_CHAMADAS'
  | 'ERRO_API'
  | 'EXEMPLO';

export interface StatusColeta {
  ok: boolean;
  motivo?: MotivoFonte;
  /** Texto curto, sem segredo (ex.: "Secret META_AD_ACCOUNT_US vazio"). */
  detalhe?: string;
  /** Secret envolvido, para a tela de Conexões dizer o que cadastrar. */
  secret?: string;
  linhas?: number;
}

export type ChaveFonte = 'meta_br' | 'meta_us' | 'hotmart' | 'google';

export interface DadosColetados {
  v: 1;
  gerado_em: string; // ISO
  janela: { de: string; ate: string }; // dias coletados (America/Sao_Paulo)
  exemplo?: boolean;
  fontes: Record<ChaveFonte, StatusColeta>;
  meta: LinhaMeta[];
  /** Alcance/frequência reais (sem time_increment), relativos ao dia da coleta. */
  alcance: { ad7d: AlcanceMeta[]; ad7dAnterior: AlcanceMeta[]; adset7d: AlcanceMeta[] };
  hotmart: VendaHotmart[];
  google: LinhaGoogle[];
  termos: TermoBusca[];
  cambio: { usd_brl: number; fonte: string; por_dia: Record<string, number> };
}

export interface Envelope {
  v: 1;
  kdf: 'PBKDF2-SHA256';
  iter: number;
  z: 'gzip';
  salt: string; // base64
  iv: string; // base64
  ct: string; // base64 (texto cifrado + tag GCM de 16 bytes)
  gerado_em: string; // fora do texto cifrado: a página mostra a hora sem senha
}

export const ITERACOES_PBKDF2 = 600_000;
export const DIAS_COLETADOS = 90;
