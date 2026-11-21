/**
 * Criptografia no coletor (Node, módulo crypto nativo — implementação
 * independente da do navegador, para o teste cruzado valer).
 * PBKDF2-SHA-256 600.000 iterações, salt aleatório de 16 bytes, IV aleatório
 * de 12 bytes a cada execução, AES-256-GCM. O JSON é comprimido com gzip antes.
 */
import { createCipheriv, pbkdf2Sync, randomBytes } from 'node:crypto';
import { gzipSync } from 'node:zlib';
import { ITERACOES_PBKDF2, type DadosColetados, type Envelope } from '../lib/dados';

export function criptografar(dados: DadosColetados, senha: string, iteracoes = ITERACOES_PBKDF2): Envelope {
  if (!senha) throw new Error('DASHBOARD_PASSWORD vazio: não é possível publicar os dados');
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const chave = pbkdf2Sync(senha, salt, iteracoes, 32, 'sha256');
  const cifra = createCipheriv('aes-256-gcm', chave, iv);
  const claro = gzipSync(Buffer.from(JSON.stringify(dados), 'utf8'), { level: 9 });
  const ct = Buffer.concat([cifra.update(claro), cifra.final(), cifra.getAuthTag()]);
  chave.fill(0);
  return {
    v: 1,
    kdf: 'PBKDF2-SHA256',
    iter: iteracoes,
    z: 'gzip',
    salt: salt.toString('base64'),
    iv: iv.toString('base64'),
    ct: ct.toString('base64'),
    gerado_em: dados.gerado_em,
  };
}
