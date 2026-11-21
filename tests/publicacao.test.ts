/**
 * Varre `out/` (o que vai para o GitHub Pages) depois do build + coleta.
 * Falha se achar token do Meta, o valor de qualquer Secret ou campos de dado
 * pessoal. No Action roda como `npm run verificar` (VERIFICAR_OUT=1: sem `out/`
 * é falha). No `npm test` comum, só roda se `out/` existir.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const OUT = path.resolve(__dirname, '..', 'out');
const obrigatorio = process.env.VERIFICAR_OUT === '1';

const SEGREDOS = [
  'META_ACCESS_TOKEN',
  'META_AD_ACCOUNT_BR',
  'META_AD_ACCOUNT_US',
  'HOTMART_CLIENT_ID',
  'HOTMART_CLIENT_SECRET',
  'HOTMART_BASIC',
  'DASHBOARD_PASSWORD',
  'SALT_HASH',
];

function arquivos(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = path.join(dir, n);
    return statSync(p).isDirectory() ? arquivos(p) : [p];
  });
}

describe.runIf(obrigatorio || existsSync(OUT))('publicação (out/)', () => {
  it('out/ existe', () => {
    expect(existsSync(OUT)).toBe(true);
  });

  it('nenhum token, Secret ou dado pessoal em nenhum arquivo publicado', () => {
    const valores = SEGREDOS.map((n) => [n, process.env[n]?.trim()] as const).filter(
      // Valores curtos demais dariam falso positivo em qualquer texto.
      (x): x is readonly [string, string] => Boolean(x[1] && x[1].length >= 6),
    );
    // O ID da conta também é procurado sem o prefixo act_.
    const extras = valores.filter(([, v]) => v.startsWith('act_')).map(([n, v]) => [`${n} (sem act_)`, v.slice(4)] as const);
    const proibidos: Array<[string, RegExp | string]> = [
      ['token do Meta (EAA…)', /EAA[A-Za-z0-9]{20,}/],
      ...[...valores, ...extras].map(([n, v]) => [`valor do Secret ${n}`, v] as [string, string]),
    ];
    // Campos de dado pessoal. Em HTML/JSON/texto, o literal "email" já reprova.
    // Nos bundles JS do framework, `"document"` aparece como nome de objeto do
    // navegador (polyfill core-js), então lá procuramos a forma de chave: "document":
    const pii = ['email', 'phone', 'document'];
    const achados: string[] = [];
    for (const f of arquivos(OUT)) {
      const conteudo = readFileSync(f).toString('latin1');
      const js = f.endsWith('.js');
      for (const campo of pii) {
        const padrao = js ? new RegExp(`"${campo}"\\s*:`) : `"${campo}"`;
        const achou = typeof padrao === 'string' ? conteudo.includes(padrao) : padrao.test(conteudo);
        if (achou) achados.push(`${path.relative(OUT, f)}: campo "${campo}"`);
      }
      for (const [nome, padrao] of proibidos) {
        const achou = typeof padrao === 'string' ? conteudo.includes(padrao) : padrao.test(conteudo);
        if (achou) achados.push(`${path.relative(OUT, f)}: ${nome}`);
      }
    }
    expect(achados).toEqual([]);
  });

  it('o único arquivo de dados é o envelope criptografado', () => {
    const dados = arquivos(OUT).filter((f) => /\.json$/.test(f) && f.includes(`${path.sep}data${path.sep}`));
    for (const f of dados) {
      expect(path.basename(f)).toBe('dados.enc.json');
      const env = JSON.parse(readFileSync(f, 'utf8'));
      expect(Object.keys(env).sort()).toEqual(['ct', 'gerado_em', 'iter', 'iv', 'kdf', 'salt', 'v', 'z']);
      expect(env.iter).toBeGreaterThanOrEqual(600_000);
    }
    if (obrigatorio) expect(dados.length).toBe(1);
  });
});
