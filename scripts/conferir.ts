/**
 * Conferência com o Gerenciador de Anúncios (somente leitura).
 * Uso: npm run conferir -- 2026-11-14 2026-11-20 [BR|US]
 * Lê META_ACCESS_TOKEN e META_AD_ACCOUNT_* do .env.local. Mostra só totais.
 */
import { config as carregarEnv } from 'dotenv';
import { conferirPeriodo } from '../coletor/meta';

carregarEnv({ path: ['.env.local', '.env'], quiet: true });

const [de = '2026-11-14', ate = '2026-11-20', pais = 'BR'] = process.argv.slice(2);
const REFERENCIA: Record<string, { gasto: number; impressoes: number }> = {
  'BR|2026-11-14|2026-11-20': { gasto: 2942.78, impressoes: 62926 },
};

conferirPeriodo(pais === 'US' ? 'US' : 'BR', { de, ate })
  .then((r) => {
    const fmt = (v: number, c = 2) => v.toLocaleString('pt-BR', { minimumFractionDigits: c, maximumFractionDigits: c });
    console.log(`Meta ${pais} ${de} a ${ate}`);
    console.log(`  conta:            gasto ${fmt(r.contaGasto)} · impressões ${fmt(r.contaImpressoes, 0)}`);
    console.log(`  soma de anúncios: gasto ${fmt(r.anunciosGasto)} · impressões ${fmt(r.anunciosImpressoes, 0)}  (o que a dashboard soma)`);
    const ref = REFERENCIA[`${pais}|${de}|${ate}`];
    if (ref) {
      const dg = ((r.anunciosGasto - ref.gasto) / ref.gasto) * 100;
      const di = ((r.anunciosImpressoes - ref.impressoes) / ref.impressoes) * 100;
      console.log(`  referência:       gasto ${fmt(ref.gasto)} · impressões ${fmt(ref.impressoes, 0)}`);
      console.log(`  diferença:        gasto ${fmt(dg)}% · impressões ${fmt(di)}%  → ${Math.abs(dg) < 1 && Math.abs(di) < 1 ? 'OK' : 'CONFERIR'}`);
    }
  })
  .catch((e) => {
    console.error('Falha:', e instanceof Error ? e.message : 'erro');
    process.exit(1);
  });
