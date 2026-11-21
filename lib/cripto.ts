/**
 * Descriptografia no navegador (WebCrypto): PBKDF2-SHA-256 (600.000 iterações)
 * → AES-256-GCM. O texto decifrado é JSON comprimido com gzip.
 * A senha e a chave ficam só em memória.
 */
import type { DadosColetados, Envelope } from './dados';

export class SenhaIncorreta extends Error {
  constructor() {
    super('Senha incorreta');
    this.name = 'SenhaIncorreta';
  }
}

function deBase64(s: string): Uint8Array<ArrayBuffer> {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function derivarChave(senha: string, salt: Uint8Array<ArrayBuffer>, iteracoes: number): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(senha), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: iteracoes },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt'],
  );
}

async function gunzip(bytes: Uint8Array<ArrayBuffer>): Promise<string> {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return new Response(stream).text();
}

/** Guarda a chave derivada por salt, para não refazer o PBKDF2 se o arquivo não mudou. */
const cacheChaves = new Map<string, CryptoKey>();

export async function descriptografar(env: Envelope, senha: string): Promise<DadosColetados> {
  if (env.v !== 1 || env.kdf !== 'PBKDF2-SHA256') throw new Error('Formato de dados desconhecido');
  const k = `${env.salt}|${env.iter}|${senha.length}|${senha}`;
  let chave = cacheChaves.get(k);
  if (!chave) {
    chave = await derivarChave(senha, deBase64(env.salt), env.iter);
    cacheChaves.clear();
    cacheChaves.set(k, chave);
  }
  let claro: ArrayBuffer;
  try {
    claro = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: deBase64(env.iv) }, chave, deBase64(env.ct));
  } catch {
    cacheChaves.clear();
    throw new SenhaIncorreta();
  }
  const dados = JSON.parse(await gunzip(new Uint8Array(claro))) as DadosColetados;
  if (dados.v !== 1) throw new Error('Versão de dados desconhecida');
  return dados;
}
