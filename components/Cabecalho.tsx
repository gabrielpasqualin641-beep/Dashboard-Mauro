'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { horaSP } from '@/lib/datas';
import { dataBR } from '@/lib/formato';
import type { StatusFonte } from '@/lib/tipos';
import { usePainel, type Filtros } from './PainelContexto';
import { Dica } from './ui';

const ABAS = [
  { href: '/', rotulo: 'Visão geral' },
  { href: '/funis', rotulo: 'Funis' },
  { href: '/criativos', rotulo: 'Criativos' },
  { href: '/diagnostico', rotulo: 'Diagnóstico' },
  { href: '/hotmart', rotulo: 'Hotmart' },
  { href: '/google', rotulo: 'Google Ads' },
  { href: '/bonificacao', rotulo: 'Bonificação' },
  { href: '/conexoes', rotulo: 'Conexões' },
];

const PRESETS: Array<{ v: Filtros['periodo']; r: string }> = [
  { v: 'hoje', r: 'Hoje' },
  { v: '7d', r: '7 dias' },
  { v: '14d', r: '14 dias' },
  { v: '30d', r: '30 dias' },
  { v: 'mes', r: 'Mês atual' },
  { v: 'personalizado', r: 'Personalizado' },
];

const COR_ESTADO: Record<StatusFonte['estado'], string> = {
  ok: 'bg-bom',
  erro: 'bg-ruim',
  exemplo: 'bg-ruim',
  'nao-configurado': 'bg-apagado',
};
const TXT_ESTADO: Record<StatusFonte['estado'], string> = {
  ok: 'ok',
  erro: 'sem dados',
  exemplo: 'sem credencial — exemplo',
  'nao-configurado': 'não configurado',
};

function Fontes({ fontes }: { fontes: StatusFonte[] }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-suave">
      {fontes.map((f) => (
        <li key={f.fonte}>
          <Dica texto={`${f.rotulo}: ${TXT_ESTADO[f.estado]}${f.mensagem ? ` — ${f.mensagem}` : ''}${f.atualizadoEm ? ` · coletado às ${horaSP(f.atualizadoEm)}` : ''}`}>
            <span className="inline-flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${COR_ESTADO[f.estado]}`} aria-hidden />
              {f.rotulo}
              <span className="sr-only">: {TXT_ESTADO[f.estado]}</span>
            </span>
          </Dica>
        </li>
      ))}
    </ul>
  );
}

/** Idade dos dados: > 1 h amarelo, > 3 h vermelho (o Action pode ter falhado). */
function Idade({ geradoEm }: { geradoEm: string }) {
  const [agora, setAgora] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setAgora(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);
  const horas = (agora - new Date(geradoEm).getTime()) / 3_600_000;
  const cor = horas > 3 ? 'text-ruim font-semibold' : horas > 1 ? 'text-alerta font-semibold' : 'text-suave';
  const texto =
    horas > 3
      ? `Dados de ${horaSP(geradoEm)} — há mais de 3 h: o Action pode ter falhado`
      : horas > 1
        ? `Dados de ${horaSP(geradoEm)} — há mais de 1 h`
        : `Dados de ${horaSP(geradoEm)}`;
  return (
    <Dica texto="Hora em que o GitHub Action coletou os dados (roda a cada 15 min; em horário de pico pode atrasar). O Meta leva alguns minutos para consolidar conversões: números de hoje ainda podem subir.">
      <span className={`num text-xs ${cor}`}>{texto}</span>
    </Dica>
  );
}

export function Cabecalho() {
  const pathname = usePathname();
  const { filtros, setFiltros, painel, atualizando, atualizarAgora, query, carregando, sair, minimo, geradoEm } = usePainel();
  const [de, setDe] = useState(filtros.de ?? '');
  const [ate, setAte] = useState(filtros.ate ?? '');
  const [erroAtualizar, setErroAtualizar] = useState<string | null>(null);

  useEffect(() => {
    setDe(filtros.de ?? painel?.periodo.de ?? '');
    setAte(filtros.ate ?? painel?.periodo.ate ?? '');
  }, [filtros.de, filtros.ate, painel?.periodo.de, painel?.periodo.ate]);

  const naBonificacao = pathname.startsWith('/bonificacao') || pathname.startsWith('/conexoes');

  return (
    <header className="border-b border-borda/60 bg-fundo/95 backdrop-blur supports-[backdrop-filter]:bg-fundo/80 sticky top-0 z-40">
      <div className="mx-auto max-w-7xl px-4 pt-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-titulo text-[11px] uppercase tracking-[0.18em] text-destaque">CONTROLE 2.0 · Performance</p>
            <h1 className="font-titulo text-lg font-semibold leading-tight">Marlon Mattedi</h1>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {painel && <Fontes fontes={painel.fontes} />}
            {geradoEm && <Idade geradoEm={geradoEm} />}
            <button
              type="button"
              onClick={async () => {
                setErroAtualizar(null);
                try {
                  await atualizarAgora();
                } catch (e) {
                  setErroAtualizar(e instanceof Error ? e.message : 'falhou');
                }
              }}
              disabled={atualizando}
              className="rounded-lg border border-destaque/50 bg-destaque/10 px-3 py-1.5 text-xs font-medium text-destaque hover:bg-destaque/20 disabled:opacity-60"
            >
              {atualizando ? 'Buscando…' : 'Atualizar agora'}
            </button>
            {erroAtualizar && <span className="text-xs text-ruim">{erroAtualizar}</span>}
            <button type="button" onClick={sair} className="text-xs text-apagado hover:text-texto">
              Sair
            </button>
          </div>
        </div>

        {!naBonificacao && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap gap-1" role="group" aria-label="Período">
              {PRESETS.map((p) => (
                <button
                  key={p.v}
                  type="button"
                  aria-pressed={filtros.periodo === p.v}
                  onClick={() => setFiltros({ periodo: p.v, ...(p.v === 'personalizado' ? { de: de || undefined, ate: ate || undefined } : { de: undefined, ate: undefined }) })}
                  className={`rounded-md px-2.5 py-1 text-xs ${
                    filtros.periodo === p.v ? 'bg-destaque text-fundo font-semibold' : 'bg-superficie text-suave hover:text-texto'
                  }`}
                >
                  {p.r}
                </button>
              ))}
            </div>
            {filtros.periodo === 'personalizado' && (
              <form
                className="flex flex-wrap items-center gap-1 text-xs"
                onSubmit={(e) => {
                  e.preventDefault();
                  setFiltros({ periodo: 'personalizado', de, ate });
                }}
              >
                <input type="date" min={minimo} max={painel?.hoje} value={de} onChange={(e) => setDe(e.target.value)} className="rounded-md border border-borda bg-superficie px-2 py-1 text-texto [color-scheme:dark]" aria-label="De" />
                <span className="text-apagado">até</span>
                <input type="date" min={minimo} max={painel?.hoje} value={ate} onChange={(e) => setAte(e.target.value)} className="rounded-md border border-borda bg-superficie px-2 py-1 text-texto [color-scheme:dark]" aria-label="Até" />
                <button type="submit" className="rounded-md bg-superficie2 px-2 py-1 text-texto hover:bg-borda">
                  Aplicar
                </button>
              </form>
            )}
            <div className="ml-auto flex gap-1" role="group" aria-label="País">
              {(['TODOS', 'BR', 'US'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  aria-pressed={filtros.pais === p}
                  onClick={() => setFiltros({ pais: p })}
                  className={`rounded-md px-2.5 py-1 text-xs ${
                    filtros.pais === p ? 'bg-destaque text-fundo font-semibold' : 'bg-superficie text-suave hover:text-texto'
                  }`}
                >
                  {p === 'TODOS' ? 'Todos' : p}
                </button>
              ))}
            </div>
          </div>
        )}
        {!naBonificacao && painel && (
          <p className="num mt-1.5 text-[11px] text-apagado">
            {dataBR(painel.periodo.de)} a {dataBR(painel.periodo.ate)} · comparado com {dataBR(painel.anterior.de)} a {dataBR(painel.anterior.ate)}
            {painel.moeda === 'USD' ? ' · valores em US$' : ' · valores em R$'}
            {painel.pais === 'TODOS' && ' (US convertido pela cotação do dia)'}
            {carregando && ' · carregando…'}
          </p>
        )}

        <nav className="-mx-4 mt-2 overflow-x-auto px-4" aria-label="Seções">
          <ul className="flex gap-1">
            {ABAS.map((a) => {
              const ativa = a.href === '/' ? pathname === '/' : pathname.startsWith(a.href);
              return (
                <li key={a.href}>
                  <Link
                    href={`${a.href}${query ? `?${query}` : ''}`}
                    aria-current={ativa ? 'page' : undefined}
                    className={`block whitespace-nowrap border-b-2 px-3 py-2 text-sm ${
                      ativa ? 'border-destaque text-texto' : 'border-transparent text-suave hover:text-texto'
                    }`}
                  >
                    {a.rotulo}
                    {a.href === '/diagnostico' && painel && painel.alertas.length > 0 && (
                      <span className="num ml-1.5 rounded-full bg-acao px-1.5 py-0.5 text-[10px] font-semibold text-white">{painel.alertas.length}</span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
      {painel?.exemplo && (
        <div className="bg-acao/90 px-4 py-1.5 text-center text-xs font-semibold text-white">
          DADOS DE EXEMPLO — alguma fonte está sem credencial ({painel.fontes.filter((f) => f.estado === 'exemplo').map((f) => f.rotulo).join(', ')}). Nenhum número dessas fontes é real.
        </div>
      )}
    </header>
  );
}
