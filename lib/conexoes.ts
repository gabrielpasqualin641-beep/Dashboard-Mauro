import type { ChaveFonte, StatusColeta } from './dados';

/** O que fazer para cada motivo de falha (tela de Conexões). */
export function oQueFazer(chave: ChaveFonte, f: StatusColeta): string | null {
  if (f.ok && f.motivo !== 'EXEMPLO') return f.detalhe ?? null;
  switch (f.motivo) {
    case 'TOKEN_INVALIDO':
      return chave === 'hotmart'
        ? 'Gere novas credenciais em Hotmart › Ferramentas › Credenciais Hotmart e atualize os Secrets HOTMART_CLIENT_ID, HOTMART_CLIENT_SECRET e HOTMART_BASIC.'
        : 'Gere um novo token no Business Manager › Usuários do sistema › dashboard-leitura e atualize o Secret META_ACCESS_TOKEN.';
    case 'SEM_ACESSO_A_CONTA':
      return "Atribua esta conta ao usuário do sistema com 'Ver desempenho'.";
    case 'NAO_CONFIGURADO':
      return chave === 'google'
        ? 'Google Ads ainda não entra na coleta (fase 2).'
        : `Cadastre o Secret ${f.secret ?? 'correspondente'} no repositório.`;
    case 'LIMITE_DE_CHAMADAS':
      return 'A API limitou as chamadas. Normalmente se resolve sozinho na próxima execução (15 min).';
    case 'EXEMPLO':
      return 'Dados fictícios gerados localmente com --exemplo. Nunca publicados pelo Action.';
    default:
      return 'Erro inesperado na API. Veja o log da última execução em Actions e rode de novo.';
  }
}
