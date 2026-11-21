'use client';

import { usePainel } from '@/components/PainelContexto';
import { Cartao, Carregando } from '@/components/ui';
import type { ChaveFonte } from '@/lib/dados';
import { oQueFazer } from '@/lib/conexoes';
import { horaSP } from '@/lib/datas';
import { dataBR, inteiro } from '@/lib/formato';
import { TEXTO_MOTIVO } from '@/lib/painel';

const REPO = 'gabrielpasqualin641-beep/Dashboard-Mauro';
const URL_ACTIONS = `https://github.com/${REPO}/actions/workflows/atualizar.yml`;
const URL_SECRETS = `https://github.com/${REPO}/settings/secrets/actions`;

const NOMES: Record<ChaveFonte, string> = {
  meta_br: 'Meta Ads · conta BR',
  meta_us: 'Meta Ads · conta US',
  hotmart: 'Hotmart',
  google: 'Google Ads',
};

export default function Conexoes() {
  const { dados, geradoEm } = usePainel();
  if (!dados) return <Carregando />;
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-titulo text-lg font-semibold">Conexões</h2>
        {geradoEm && (
          <p className="num text-xs text-suave">
            Última coleta: {dataBR(geradoEm.slice(0, 10))} às {horaSP(geradoEm)} · dias {dataBR(dados.janela.de)} a {dataBR(dados.janela.ate)}
          </p>
        )}
      </div>
      <ul className="space-y-3">
        {(Object.keys(NOMES) as ChaveFonte[]).map((k) => {
          const f = dados.fontes[k] ?? { ok: false, motivo: 'NAO_CONFIGURADO' as const };
          const cor = f.motivo === 'EXEMPLO' ? 'bg-acao' : f.ok ? 'bg-bom' : k === 'google' ? 'bg-apagado' : 'bg-ruim';
          const acao = oQueFazer(k, f);
          return (
            <li key={k}>
              <Cartao>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="flex items-center gap-2 font-titulo font-semibold">
                    <span className={`h-2.5 w-2.5 rounded-full ${cor}`} aria-hidden />
                    {NOMES[k]}
                  </h3>
                  <span className="num text-sm text-suave">
                    {f.ok ? `ok · ${inteiro(f.linhas ?? 0)} linhas` : TEXTO_MOTIVO[f.motivo ?? 'ERRO_API'] ?? f.motivo}
                  </span>
                </div>
                {f.motivo && !f.ok && <p className="mt-1 text-xs text-apagado">Motivo: {f.motivo}{f.detalhe ? ` — ${f.detalhe}` : ''}</p>}
                {acao && <p className="mt-2 text-sm">{acao}</p>}
              </Cartao>
            </li>
          );
        })}
      </ul>
      <Cartao>
        <h3 className="font-titulo font-semibold">Atualizar agora</h3>
        <p className="mt-1 text-sm text-suave">
          O GitHub Action roda a cada 15 minutos (em horário de pico pode atrasar). Para coletar na hora, abra o workflow e clique em <strong>Run workflow</strong>. Depois de
          corrigir um Secret, rode o workflow para ver o resultado aqui.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <a href={URL_ACTIONS} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-destaque/50 px-3 py-1.5 text-sm text-destaque hover:bg-destaque/10">
            Abrir Actions › Atualizar dashboard ↗
          </a>
          <a href={URL_SECRETS} target="_blank" rel="noopener noreferrer" className="rounded-lg border border-borda px-3 py-1.5 text-sm text-suave hover:text-texto">
            Secrets do repositório ↗
          </a>
        </div>
      </Cartao>
    </div>
  );
}
