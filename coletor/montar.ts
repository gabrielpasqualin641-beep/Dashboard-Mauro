import { METAS } from '../config/metas';
import type { Pais } from '../config/operacao';
import type { Cambio } from '../lib/cambio';
import { DIAS_COLETADOS, type ChaveFonte, type DadosColetados, type StatusColeta } from '../lib/dados';
import { hojeSP, somarDias, type Periodo } from '../lib/datas';
import type { AlcanceMeta, LinhaMeta, VendaHotmart } from '../lib/tipos';
import { obterCambio } from './cambio';
import { hotmartExemplo, metaExemplo } from './exemplo';
import { buscarHotmart, hotmartConfigurado } from './hotmart';
import { buscarMeta, contaMeta, motivoDoErro, type DadosMetaConta } from './meta';

export interface OpcoesColeta {
  agora?: Date;
  exemplo?: boolean;
  /** Injetáveis para teste. */
  buscarMetaFn?: typeof buscarMeta;
  buscarHotmartFn?: typeof buscarHotmart;
  obterCambioFn?: () => Promise<Cambio>;
}

export function janelas(agora: Date) {
  const hoje = hojeSP(agora);
  const janela: Periodo = { de: somarDias(hoje, -(DIAS_COLETADOS - 1)), ate: hoje };
  const ult7: Periodo = { de: somarDias(hoje, -6), ate: hoje };
  const ant7: Periodo = { de: somarDias(hoje, -13), ate: somarDias(hoje, -7) };
  return { hoje, janela, ult7, ant7 };
}

/**
 * Coleta todas as fontes. Uma fonte com erro vira `{ ok: false, motivo }` e as
 * outras seguem normalmente — nunca lança por causa de uma fonte.
 */
export async function coletarTudo(op: OpcoesColeta = {}): Promise<DadosColetados> {
  const agora = op.agora ?? new Date();
  const { janela, ult7, ant7 } = janelas(agora);
  const cambio = await (op.obterCambioFn ?? obterCambio)();
  const fMeta = op.buscarMetaFn ?? buscarMeta;
  const fHotmart = op.buscarHotmartFn ?? buscarHotmart;

  const fontes = {} as Record<ChaveFonte, StatusColeta>;
  const meta: LinhaMeta[] = [];
  const alcance = { ad7d: [] as AlcanceMeta[], ad7dAnterior: [] as AlcanceMeta[], adset7d: [] as AlcanceMeta[] };

  for (const pais of ['BR', 'US'] as Pais[]) {
    const chave: ChaveFonte = pais === 'BR' ? 'meta_br' : 'meta_us';
    const secretConta = `META_AD_ACCOUNT_${pais}`;
    let dados: DadosMetaConta | null = null;
    if (op.exemplo) {
      dados = metaExemplo(pais, janela, ult7, ant7, cambio);
      fontes[chave] = { ok: true, motivo: 'EXEMPLO', linhas: dados.linhas.length };
    } else if (!process.env.META_ACCESS_TOKEN?.trim() || !contaMeta(pais)) {
      const secret = !process.env.META_ACCESS_TOKEN?.trim() ? 'META_ACCESS_TOKEN' : secretConta;
      fontes[chave] = { ok: false, motivo: 'NAO_CONFIGURADO', secret };
    } else {
      try {
        dados = await fMeta(pais, janela, ult7, ant7, cambio);
        fontes[chave] = { ok: true, linhas: dados.linhas.length };
      } catch (e) {
        const motivo = motivoDoErro(e);
        fontes[chave] = {
          ok: false,
          motivo,
          secret: motivo === 'TOKEN_INVALIDO' ? 'META_ACCESS_TOKEN' : motivo === 'SEM_ACESSO_A_CONTA' ? secretConta : undefined,
          detalhe: e instanceof Error ? e.message : 'erro',
        };
      }
    }
    if (dados) {
      meta.push(...dados.linhas);
      alcance.ad7d.push(...dados.ad7d);
      alcance.ad7dAnterior.push(...dados.ad7dAnterior);
      alcance.adset7d.push(...dados.adset7d);
    }
  }

  let hotmart: VendaHotmart[] = [];
  const faltaHotmart = hotmartConfigurado();
  if (op.exemplo) {
    hotmart = hotmartExemplo(janela, cambio, meta);
    fontes.hotmart = { ok: true, motivo: 'EXEMPLO', linhas: hotmart.length };
  } else if (faltaHotmart) {
    fontes.hotmart = { ok: false, motivo: 'NAO_CONFIGURADO', secret: faltaHotmart };
  } else {
    try {
      hotmart = await fHotmart(janela, cambio, METAS.taxaHotmart);
      fontes.hotmart = { ok: true, linhas: hotmart.length };
      if (!process.env.SALT_HASH?.trim()) fontes.hotmart.detalhe = 'SALT_HASH vazio: cruzamento Express → 2.0 desligado';
    } catch (e) {
      const motivo = motivoDoErro(e);
      fontes.hotmart = {
        ok: false,
        motivo,
        secret: motivo === 'TOKEN_INVALIDO' ? 'HOTMART_CLIENT_SECRET' : undefined,
        detalhe: e instanceof Error ? e.message : 'erro',
      };
    }
  }

  // Google Ads ainda não entra no coletor (fase 2).
  fontes.google = { ok: false, motivo: 'NAO_CONFIGURADO', secret: 'GOOGLE_ADS_*' };

  return {
    v: 1,
    gerado_em: agora.toISOString(),
    janela,
    exemplo: op.exemplo || undefined,
    fontes,
    meta,
    alcance,
    hotmart,
    google: [],
    termos: [],
    cambio: { usd_brl: cambio.atual, fonte: cambio.fonte, por_dia: cambio.porDia },
  };
}
