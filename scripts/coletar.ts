/**
 * Coletor: busca Meta e Hotmart com os Secrets, monta os dados, criptografa e
 * grava `<saida>/data/dados.enc.json`. Roda no GitHub Action (a cada 15 min)
 * ou localmente com `npm run coletar` (lê .env.local).
 *
 * Saída: `out/` se existir (depois do `npm run build`), senão `public/`
 * (modo `npm run dev`). `--saida=<pasta>` força outra pasta.
 * `--exemplo` gera dados fictícios para testar a tela (recusado no Action).
 *
 * Nunca loga valores: só contagens e motivos.
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { config as carregarEnv } from 'dotenv';
import { coletarTudo } from '../coletor/montar';
import { criptografar } from '../coletor/cripto';

carregarEnv({ path: ['.env.local', '.env'], quiet: true });

export const SEGREDOS = [
  'META_ACCESS_TOKEN',
  'META_AD_ACCOUNT_BR',
  'META_AD_ACCOUNT_US',
  'HOTMART_CLIENT_ID',
  'HOTMART_CLIENT_SECRET',
  'HOTMART_BASIC',
  'DASHBOARD_PASSWORD',
  'SALT_HASH',
] as const;

function mascarar() {
  if (!process.env.GITHUB_ACTIONS) return;
  for (const nome of SEGREDOS) {
    const v = process.env[nome]?.trim();
    if (v) {
      console.log(`::add-mask::${v}`);
      // O ID da conta também aparece sem o prefixo act_.
      if (v.startsWith('act_')) console.log(`::add-mask::${v.slice(4)}`);
    }
  }
}

async function main() {
  mascarar();
  const args = process.argv.slice(2);
  const exemplo = args.includes('--exemplo');
  if (exemplo && process.env.GITHUB_ACTIONS) {
    console.error('--exemplo não é permitido no GitHub Actions');
    process.exit(1);
  }
  const senha = process.env.DASHBOARD_PASSWORD ?? '';
  if (!senha) {
    console.error('DASHBOARD_PASSWORD não definido: sem senha não há como publicar os dados.');
    process.exit(1);
  }
  const argSaida = args.find((a) => a.startsWith('--saida='))?.slice(8);
  const base = argSaida ?? (existsSync('out') ? 'out' : 'public');

  const inicio = Date.now();
  const dados = await coletarTudo({ exemplo });
  const fmt = new Intl.NumberFormat('pt-BR');
  for (const [k, f] of Object.entries(dados.fontes)) {
    console.log(f.ok ? `${k}: ${fmt.format(f.linhas ?? 0)} linhas${f.motivo === 'EXEMPLO' ? ' (EXEMPLO)' : ''}` : `${k}: sem dados (${f.motivo})`);
  }
  console.log(`câmbio: ${dados.cambio.fonte}`);

  const envelope = criptografar(dados, senha);
  const destino = path.join(base, 'data', 'dados.enc.json');
  mkdirSync(path.dirname(destino), { recursive: true });
  writeFileSync(destino, JSON.stringify(envelope));
  console.log(`gravado ${destino} (${fmt.format(Math.round(envelope.ct.length / 1024))} KB cifrados) em ${((Date.now() - inicio) / 1000).toFixed(1)} s`);
}

main().catch((e) => {
  // Só a mensagem (nossa); nunca o objeto inteiro, que pode carregar cabeçalhos.
  console.error('Falha no coletor:', e instanceof Error ? e.message : 'erro');
  process.exit(1);
});
