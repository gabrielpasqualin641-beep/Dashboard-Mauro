import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { processarItens, type ItemHotmart } from '@/coletor/hotmart';
import { consultaPost, postPermitido } from '@/coletor/http';
import { calcularBonificacao } from '@/lib/bonificacao';
import { calcularRecompra } from '@/lib/recompra';
import type { VendaHotmart } from '@/lib/tipos';

const raiz = path.resolve(__dirname, '..');
const cambio = { atual: 5, porDia: {}, fonte: 'fallback' as const };

function arquivos(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = path.join(dir, n);
    if (statSync(p).isDirectory()) return arquivos(p);
    return /\.(ts|tsx|mjs|yml)$/.test(n) ? [p] : [];
  });
}

const codigo = () =>
  ['lib', 'app', 'components', 'coletor', 'scripts', 'config', '.github'].flatMap((d) => arquivos(path.join(raiz, d)));

describe('privacidade — nenhum dado pessoal sai do coletor', () => {
  const itens: ItemHotmart[] = [
    {
      product: { id: 'EXPRESS_ID', name: 'Controle Express' },
      buyer: { name: 'João da Silva', email: 'joao.silva@gmail.com', phone: '+5511999998888', document: '123.456.789-00' },
      purchase: { transaction: 'HP-T1', order_date: Date.parse('2026-11-01T12:00:00-03:00'), status: 'APPROVED', price: { value: 47, currency_code: 'BRL' }, tracking: { source_sck: 'f3-express' } },
    },
    {
      product: { id: 'F10074400O', name: 'CONTROLE 2.0' },
      buyer: { name: 'João da Silva', email: 'JOAO.SILVA@gmail.com ' },
      purchase: { transaction: 'HP-T2', order_date: Date.parse('2026-11-04T12:00:00-03:00'), status: 'APPROVED', price: { value: 397, currency_code: 'BRL' }, hotmart_fee: { total: 39.3 }, tracking: { source_sck: 'rmk' } },
    },
    {
      product: { id: 'BUMP', name: 'Bump' },
      buyer: { name: 'João da Silva', email: 'joao.silva@gmail.com' },
      purchase: { transaction: 'HP-T3', order_date: Date.parse('2026-11-04T12:00:00-03:00'), status: 'APPROVED', price: { value: 37, currency_code: 'BRL' }, order_bump: { is_order_bump: true, parent_purchase_transaction: 'HP-T2' } },
    },
  ];

  it('a saída não contém nome, e-mail, telefone, documento nem ID de transação', () => {
    const saida = JSON.stringify(processarItens(itens, cambio, 0.099, 'sal-secreto'));
    for (const proibido of ['João', 'Silva', 'joao', 'gmail', '5511999998888', '998888', '123.456', 'HP-T1', 'HP-T2', 'sal-secreto']) {
      expect(saida.toLowerCase()).not.toContain(proibido.toLowerCase());
    }
    expect(saida).not.toMatch(/"(buyer|email|phone|document|name|transaction)"/i);
  });

  it('o hash usa o SALT_HASH: sem salt, nenhum hash é gerado', () => {
    const com = processarItens(itens, cambio, 0.099, 'sal-a');
    const outro = processarItens(itens, cambio, 0.099, 'sal-b');
    const sem = processarItens(itens, cambio, 0.099, undefined);
    expect(com[0].buyerHash).toMatch(/^[0-9a-f]{64}$/);
    expect(com[0].buyerHash).toBe(com[1].buyerHash); // e-mail normalizado (caixa e espaço)
    expect(com[0].buyerHash).not.toBe(outro[0].buyerHash);
    expect(sem.every((v) => v.buyerHash === null)).toBe(true);
  });

  it('recompra Express → 2.0 e order bump', () => {
    const vendas = processarItens(itens, cambio, 0.099, 'sal');
    expect(calcularRecompra(vendas)).toEqual({ disponivel: true, compradoresExpress: 1, compraram20Depois: 1, taxa: 1, diasMedios: 3 });
    expect(vendas[1].hasBump).toBe(true);
    expect(vendas[2].funnelKey).toBe('br-rmk'); // bump herda a origem
    expect(vendas[1].net).toBeCloseTo(357.7);
    expect(calcularRecompra(processarItens(itens, cambio, 0.099, undefined)).disponivel).toBe(false);
  });

  it('nenhum console.* registra objetos de venda, comprador ou resposta de API', () => {
    for (const f of [...arquivos(path.join(raiz, 'coletor')), ...arquivos(path.join(raiz, 'scripts'))]) {
      const src = readFileSync(f, 'utf8');
      for (const m of src.matchAll(/console\.\w+\(([^;]*)\);/g)) {
        expect(m[1], f).not.toMatch(/buyer|email|item|vendas|corpo|headers|process\.env\.(?!GITHUB)/i);
      }
    }
  });
});

describe('somente leitura — nenhuma chamada de escrita para Meta ou Hotmart', () => {
  it('fetch só aparece no cliente HTTP do coletor e no navegador (arquivo de dados)', () => {
    const permitidos = ['coletor/http.ts', 'components/PainelContexto.tsx'];
    for (const f of codigo()) {
      const rel = path.relative(raiz, f);
      const src = readFileSync(f, 'utf8');
      if (/\bfetch\(/.test(src)) expect(permitidos, rel).toContain(rel);
      expect(src, rel).not.toMatch(/method:\s*['"](PUT|PATCH|DELETE)['"]/);
    }
  });

  it('POST só para OAuth da Hotmart e relatório assíncrono de Insights', () => {
    expect(postPermitido('https://api-sec-vlc.hotmart.com/security/oauth/token?grant_type=client_credentials')).toBe(true);
    expect(postPermitido('https://graph.facebook.com/v27.0/act_123/insights')).toBe(true);
    expect(postPermitido('https://graph.facebook.com/v27.0/123456')).toBe(false); // editar/pausar anúncio
    expect(postPermitido('https://graph.facebook.com/v27.0/act_123/ads')).toBe(false);
    expect(postPermitido('https://graph.facebook.com/v27.0/act_123/campaigns')).toBe(false);
    expect(postPermitido('https://graph.facebook.com/v27.0/act_123/insights/extra')).toBe(false);
    expect(postPermitido('https://developers.hotmart.com/payments/api/v1/sales/refund')).toBe(false);
    expect(postPermitido('https://oauth2.googleapis.com/token')).toBe(false); // Google fora do coletor
  });

  it('consultaPost recusa destino fora da lista sem chamar a rede', async () => {
    const espiao = vi.spyOn(globalThis, 'fetch');
    await expect(consultaPost('https://graph.facebook.com/v27.0/act_1/campaigns', 'status=PAUSED')).rejects.toThrow(/somente leitura/);
    expect(espiao).not.toHaveBeenCalled();
    espiao.mockRestore();
  });
});

describe('nada de segredo, servidor ou banco no projeto', () => {
  it('sem token, ID de conta ou senha em arquivo do repositório', () => {
    for (const f of [...codigo(), path.join(raiz, '.env.example'), path.join(raiz, 'README.md')]) {
      const src = readFileSync(f, 'utf8');
      const rel = path.relative(raiz, f);
      expect(src, rel).not.toMatch(/EAA[A-Za-z0-9]{20,}/); // token do Meta
      expect(src, rel).not.toMatch(/act_\d{6,}/); // ID real de conta de anúncios
    }
    for (const linha of readFileSync(path.join(raiz, '.env.example'), 'utf8').split('\n')) {
      if (/^(META_ACCESS_TOKEN|META_AD_ACCOUNT_\w+|HOTMART_\w+|DASHBOARD_PASSWORD|SALT_HASH)=/.test(linha)) {
        expect(linha.split('=')[1], linha).toBe('');
      }
    }
  });

  it('sem rotas de servidor, middleware, next/headers ou revalidate', () => {
    for (const f of codigo()) {
      const rel = path.relative(raiz, f);
      const src = readFileSync(f, 'utf8');
      expect(rel).not.toMatch(/^app\/api\/|^(proxy|middleware)\.ts$/);
      expect(src, rel).not.toMatch(/from ['"]next\/headers['"]|revalidate:|['"]server-only['"]/);
    }
  });

  it('sem banco de dados nem serviço pago nas dependências', () => {
    const pkg = JSON.parse(readFileSync(path.join(raiz, 'package.json'), 'utf8'));
    const deps = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies }).join(' ');
    expect(deps).not.toMatch(/prisma|mongoose|mongodb|pg\b|mysql|sqlite|redis|supabase|firebase|@vercel\/kv|@vercel\/postgres|upstash|drizzle/);
  });

  it('o site é exportado estático', () => {
    expect(readFileSync(path.join(raiz, 'next.config.ts'), 'utf8')).toMatch(/output:\s*'export'/);
  });
});

describe('bonificação', () => {
  const v = (status: VendaHotmart['status'], grossBrl: number, funnelKey: VendaHotmart['funnelKey'] = 'br-f1-lp') =>
    ({ status, grossBrl, funnelKey }) as VendaHotmart;
  it('memória de cálculo do contrato', () => {
    const r = calcularBonificacao(
      [v('aprovada', 10000), v('reembolsada', 397), v('chargeback', 397), v('aprovada', 5000, null), v('cancelada', 397)],
      { meta: 6000, google: 1000 },
      { bonusPercentual: 0.03, bonusBaseMensal: 1000 } as never,
    );
    const linha = (rotulo: RegExp) => r.linhas.find((l) => rotulo.test(l.rotulo))!.valor;
    expect(linha(/^Vendas brutas/)).toBe(10794);
    expect(linha(/^Faturamento de anúncios/)).toBe(10000);
    expect(linha(/^Resultado líquido/)).toBe(3000);
    expect(linha(/acima da base/)).toBe(2000);
    expect(r.bonus).toBeCloseTo(60);
  });
  it('resultado negativo → bonificação zero', () => {
    const r = calcularBonificacao([v('aprovada', 1000)], { meta: 5000, google: 0 }, { bonusPercentual: 0.03, bonusBaseMensal: 0 } as never);
    expect(r.bonus).toBe(0);
  });
});
