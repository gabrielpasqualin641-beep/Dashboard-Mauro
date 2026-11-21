'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { Dica, Rolagem } from './ui';

export interface Coluna<T> {
  chave: string;
  titulo: string;
  dica?: string;
  valor?: (l: T) => number | string | null;
  render: (l: T) => ReactNode;
  alinhar?: 'esq' | 'dir';
  classe?: (l: T) => string;
  fixa?: boolean;
}

export function Tabela<T>({
  linhas,
  colunas,
  chaveLinha,
  ordemInicial,
  vazio = 'Sem dados no período.',
  agrupar,
}: {
  linhas: T[];
  colunas: Coluna<T>[];
  chaveLinha: (l: T) => string;
  ordemInicial?: { chave: string; desc: boolean };
  vazio?: string;
  agrupar?: (l: T) => string;
}) {
  const [ordem, setOrdem] = useState(ordemInicial ?? { chave: '', desc: true });

  const ordenadas = useMemo(() => {
    const col = colunas.find((c) => c.chave === ordem.chave);
    if (!col?.valor) return linhas;
    const v = col.valor;
    return [...linhas].sort((a, b) => {
      const va = v(a);
      const vb = v(b);
      if (va === null || va === undefined) return 1;
      if (vb === null || vb === undefined) return -1;
      const c = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb), 'pt-BR');
      return ordem.desc ? -c : c;
    });
  }, [linhas, colunas, ordem]);

  const grupos = useMemo(() => {
    if (!agrupar) return [{ nome: '', linhas: ordenadas }];
    const m = new Map<string, T[]>();
    for (const l of ordenadas) {
      const g = agrupar(l);
      m.set(g, [...(m.get(g) ?? []), l]);
    }
    return [...m].map(([nome, ls]) => ({ nome, linhas: ls }));
  }, [ordenadas, agrupar]);

  if (!linhas.length) return <p className="py-6 text-center text-sm text-suave">{vazio}</p>;

  return (
    <Rolagem>
      <table className="w-full min-w-max border-collapse text-sm">
        <thead>
          <tr className="border-b border-borda text-xs uppercase tracking-wide text-apagado">
            {colunas.map((c) => {
              const ativa = ordem.chave === c.chave;
              const conteudo = (
                <button
                  type="button"
                  disabled={!c.valor}
                  onClick={() => setOrdem({ chave: c.chave, desc: ativa ? !ordem.desc : true })}
                  className={`inline-flex items-center gap-1 font-medium ${c.valor ? 'hover:text-texto' : 'cursor-default'} ${ativa ? 'text-destaque' : ''}`}
                >
                  {c.titulo}
                  {ativa && <span aria-hidden>{ordem.desc ? '↓' : '↑'}</span>}
                </button>
              );
              return (
                <th
                  key={c.chave}
                  scope="col"
                  aria-sort={ativa ? (ordem.desc ? 'descending' : 'ascending') : undefined}
                  className={`whitespace-nowrap px-3 py-2 ${c.alinhar === 'dir' ? 'text-right' : 'text-left'} ${
                    c.fixa ? 'sticky left-0 z-10 bg-superficie' : ''
                  }`}
                >
                  {c.dica ? <Dica texto={c.dica}>{conteudo}</Dica> : conteudo}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {grupos.map((g) => (
            <GrupoLinhas key={g.nome || '_'} nome={g.nome} linhas={g.linhas} colunas={colunas} chaveLinha={chaveLinha} />
          ))}
        </tbody>
      </table>
    </Rolagem>
  );
}

function GrupoLinhas<T>({
  nome,
  linhas,
  colunas,
  chaveLinha,
}: {
  nome: string;
  linhas: T[];
  colunas: Coluna<T>[];
  chaveLinha: (l: T) => string;
}) {
  return (
    <>
      {nome && (
        <tr className="bg-superficie2/60">
          <td colSpan={colunas.length} className="sticky left-0 px-3 py-1.5 font-titulo text-xs font-semibold uppercase tracking-wide text-destaque">
            {nome} <span className="font-sans font-normal normal-case text-apagado">· {linhas.length} anúncio(s)</span>
          </td>
        </tr>
      )}
      {linhas.map((l) => (
        <tr key={chaveLinha(l)} className="border-b border-borda/40 hover:bg-superficie2/50">
          {colunas.map((c) => (
            <td
              key={c.chave}
              className={`whitespace-nowrap px-3 py-2 ${c.alinhar === 'dir' ? 'num text-right' : ''} ${
                c.fixa ? 'sticky left-0 z-10 bg-superficie' : ''
              } ${c.classe?.(l) ?? ''}`}
            >
              {c.render(l)}
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
