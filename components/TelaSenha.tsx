'use client';

import { useState } from 'react';
import { SenhaIncorreta } from '@/lib/cripto';
import { horaSP } from '@/lib/datas';
import { usePainel } from './PainelContexto';

export function TelaSenha() {
  const { entrar, geradoEm, erro: erroCarga, carregando } = usePainel();
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <form
        className="w-full max-w-sm rounded-2xl border border-borda/60 bg-superficie p-6 shadow-xl"
        onSubmit={async (e) => {
          e.preventDefault();
          setEnviando(true);
          setErro(null);
          try {
            await entrar(senha);
            setSenha('');
          } catch (err) {
            setErro(err instanceof SenhaIncorreta ? 'Senha incorreta' : err instanceof Error ? err.message : 'Não foi possível abrir os dados');
          } finally {
            setEnviando(false);
          }
        }}
      >
        <p className="font-titulo text-[11px] uppercase tracking-[0.18em] text-destaque">CONTROLE 2.0 · Performance</p>
        <h1 className="mt-1 font-titulo text-xl font-semibold">Marlon Mattedi</h1>
        <p className="mt-1 text-sm text-suave">Os dados são criptografados. A senha abre os números só neste navegador.</p>
        <label className="mt-5 block text-sm text-suave" htmlFor="senha">
          Senha
        </label>
        <input
          id="senha"
          type="password"
          autoComplete="current-password"
          autoFocus
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          className="mt-1 w-full rounded-lg border border-borda bg-fundo px-3 py-2 text-texto outline-none focus:border-destaque"
        />
        {(erro || erroCarga) && <p className="mt-2 text-sm text-ruim" role="alert">{erro ?? erroCarga}</p>}
        <button
          type="submit"
          disabled={enviando || !senha || (carregando && !geradoEm)}
          className="mt-4 w-full rounded-lg bg-destaque py-2 font-semibold text-fundo disabled:opacity-50"
        >
          {enviando ? 'Abrindo…' : 'Entrar'}
        </button>
        <p className="num mt-3 text-center text-[11px] text-apagado">
          {geradoEm ? `Dados de ${horaSP(geradoEm)}` : carregando ? 'Buscando dados…' : 'Sem dados publicados'}
        </p>
      </form>
    </main>
  );
}
