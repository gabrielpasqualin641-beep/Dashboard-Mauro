'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { DATA_INICIO_OPERACAO } from '@/config/operacao';
import { SenhaIncorreta, descriptografar } from '@/lib/cripto';
import type { DadosColetados, Envelope } from '@/lib/dados';
import { diaEmSP, maxDia, periodoDoPreset, type PresetPeriodo } from '@/lib/datas';
import { calcularPainel, type Painel } from '@/lib/painel';
import type { FiltroPais } from '@/lib/tipos';

export const INTERVALO_ATUALIZACAO = 300_000; // 5 min
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
export const URL_DADOS = `${BASE_PATH}/data/dados.enc.json`;

export interface Filtros {
  periodo: PresetPeriodo;
  de?: string;
  ate?: string;
  pais: FiltroPais;
}

interface Ctx {
  filtros: Filtros;
  setFiltros: (f: Partial<Filtros>) => void;
  /** Envelope buscado (só a hora é legível sem senha). */
  geradoEm: string | null;
  dados: DadosColetados | null;
  painel: Painel | undefined;
  erro: string | null;
  autenticado: boolean;
  carregando: boolean;
  atualizando: boolean;
  entrar: (senha: string) => Promise<void>;
  sair: () => void;
  atualizarAgora: () => Promise<void>;
  query: string;
  /** Dia mínimo do seletor (início dos 90 dias coletados). */
  minimo: string;
}

const Contexto = createContext<Ctx | null>(null);

async function buscarEnvelope(): Promise<Envelope> {
  const r = await fetch(`${URL_DADOS}?t=${Date.now()}`, { cache: 'no-store' });
  if (r.status === 404) throw new Error('Ainda não há dados publicados. Rode o workflow "Atualizar dashboard" no GitHub Actions.');
  if (!r.ok) throw new Error(`Falha ao baixar os dados (HTTP ${r.status})`);
  return (await r.json()) as Envelope;
}

export function lerFiltrosDaUrl(sp: URLSearchParams | ReturnType<typeof useSearchParams>): Filtros {
  const periodo = (sp.get('periodo') as PresetPeriodo) || '7d';
  const pais = (sp.get('pais')?.toUpperCase() as FiltroPais) || 'TODOS';
  return {
    periodo: ['hoje', '7d', '14d', '30d', 'mes', 'personalizado'].includes(periodo) ? periodo : '7d',
    de: sp.get('de') ?? undefined,
    ate: sp.get('ate') ?? undefined,
    pais: pais === 'BR' || pais === 'US' ? pais : 'TODOS',
  };
}

export function queryDosFiltros(f: Filtros): string {
  const p = new URLSearchParams();
  if (f.periodo !== '7d') p.set('periodo', f.periodo);
  if (f.periodo === 'personalizado') {
    if (f.de) p.set('de', f.de);
    if (f.ate) p.set('ate', f.ate);
  }
  if (f.pais !== 'TODOS') p.set('pais', f.pais);
  return p.toString();
}

export function PainelProvider({ children }: { children: ReactNode }) {
  const sp = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const filtros = useMemo(() => lerFiltrosDaUrl(sp), [sp]);
  const query = queryDosFiltros(filtros);

  // A senha fica só em memória (nunca em storage): recarregar a aba pede de novo.
  const senhaRef = useRef<string | null>(null);
  const [envelope, setEnvelope] = useState<Envelope | null>(null);
  const [dados, setDados] = useState<DadosColetados | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);

  const aplicar = useCallback(async (env: Envelope) => {
    setEnvelope(env);
    const senha = senhaRef.current;
    if (!senha) return;
    try {
      setDados(await descriptografar(env, senha));
      setErro(null);
    } catch (e) {
      if (e instanceof SenhaIncorreta) {
        // A senha mudou no Secret: pede de novo e some com os números.
        senhaRef.current = null;
        setDados(null);
        setErro('A senha da dashboard mudou. Entre com a nova senha.');
      } else {
        setErro(e instanceof Error ? e.message : 'Falha ao abrir os dados');
      }
    }
  }, []);

  const buscar = useCallback(async () => {
    const env = await buscarEnvelope();
    // Só descriptografa de novo se o coletor publicou dados novos.
    if (env.gerado_em !== envelope?.gerado_em || env.iv !== envelope?.iv || !dados) await aplicar(env);
    else setEnvelope(env);
  }, [aplicar, envelope, dados]);

  // Primeira carga (mostra a hora dos dados já na tela de senha) e a cada 5 min.
  const buscarRef = useRef(buscar);
  buscarRef.current = buscar;
  useEffect(() => {
    let vivo = true;
    const rodar = () =>
      buscarRef
        .current()
        .catch((e) => vivo && setErro(e instanceof Error ? e.message : 'Falha ao baixar os dados'))
        .finally(() => vivo && setCarregando(false));
    rodar();
    const id = setInterval(rodar, INTERVALO_ATUALIZACAO);
    return () => {
      vivo = false;
      clearInterval(id);
    };
  }, []);

  const entrar = useCallback(async (senha: string) => {
    const env = envelope ?? (await buscarEnvelope());
    const d = await descriptografar(env, senha); // lança SenhaIncorreta
    senhaRef.current = senha;
    setEnvelope(env);
    setDados(d);
    setErro(null);
  }, [envelope]);

  const sair = useCallback(() => {
    senhaRef.current = null;
    setDados(null);
  }, []);

  const atualizarAgora = useCallback(async () => {
    setAtualizando(true);
    try {
      await buscar();
    } finally {
      setAtualizando(false);
    }
  }, [buscar]);

  const setFiltros = useCallback(
    (novo: Partial<Filtros>) => {
      const q = queryDosFiltros({ ...filtros, ...novo });
      router.replace(`${pathname}${q ? `?${q}` : ''}`, { scroll: false });
    },
    [filtros, pathname, router],
  );

  const minimo = dados ? maxDia(dados.janela.de, DATA_INICIO_OPERACAO) : DATA_INICIO_OPERACAO;
  const painel = useMemo(() => {
    if (!dados) return undefined;
    const hoje = diaEmSP(new Date(dados.gerado_em));
    const periodo = periodoDoPreset(filtros.periodo, hoje, { de: filtros.de, ate: filtros.ate }, minimo);
    return calcularPainel(dados, { periodo, pais: filtros.pais });
  }, [dados, filtros, minimo]);

  return (
    <Contexto.Provider
      value={{
        filtros,
        setFiltros,
        geradoEm: envelope?.gerado_em ?? null,
        dados,
        painel,
        erro,
        autenticado: Boolean(dados),
        carregando,
        atualizando,
        entrar,
        sair,
        atualizarAgora,
        query,
        minimo,
      }}
    >
      {children}
    </Contexto.Provider>
  );
}

export function usePainel() {
  const c = useContext(Contexto);
  if (!c) throw new Error('usePainel fora do PainelProvider');
  return c;
}
