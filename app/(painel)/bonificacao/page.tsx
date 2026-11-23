'use client';

import { useMemo, useState } from 'react';
import { usePainel } from '@/components/PainelContexto';
import { Cartao, Carregando } from '@/components/ui';
import { BotaoExportar } from '@/components/Exportar';
import { n } from '@/lib/csv';
import { bonificacaoDoMes } from '@/lib/bonificacao';
import { dataBR, dinheiro } from '@/lib/formato';

const NOME_MES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const rotuloMes = (m: string) => `${NOME_MES[Number(m.slice(5, 7)) - 1]} de ${m.slice(0, 4)}`;

export default function PaginaBonificacao() {
  const [mes, setMes] = useState<string | null>(null);
  const { dados } = usePainel();
  const data = useMemo(() => (dados ? bonificacaoDoMes(dados, mes) : null), [dados, mes]);
  if (!data) return <Carregando />;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-titulo text-lg font-semibold">Bonificação da gestão</h2>
        <div className="flex items-center gap-2">
          <select
            value={data.mes}
            onChange={(e) => setMes(e.target.value)}
            className="rounded-md border border-borda bg-superficie px-2 py-1 text-sm text-texto"
            aria-label="Mês"
          >
            {data.meses.map((m) => (
              <option key={m} value={m}>
                {rotuloMes(m)}
              </option>
            ))}
          </select>
          <BotaoExportar
            arquivo={`bonificacao_${data.mes}`}
            folhas={() => [
              {
                nome: `Bonificacao ${data.mes}`,
                colunas: ['linha', 'operacao', 'valor', 'nota'],
                linhas: [
                  ...data.linhas.map((l) => [l.rotulo, l.sinal, n(l.valor), l.nota ?? '']),
                  ['BONIFICACAO', '=', n(data.bonus), ''],
                ],
              },
            ]}
          />
        </div>
      </div>
      <p className="num text-xs text-apagado">
        {dataBR(data.periodo.de)} a {dataBR(data.periodo.ate)} · tudo em R$ (US convertido pela cotação do dia)
        {data.exemplo && <span className="ml-2 font-semibold text-acao">DADOS DE EXEMPLO</span>}
      </p>
      {data.parcial && (
        <p className="rounded-lg border border-alerta/50 bg-alerta/10 px-3 py-2 text-sm text-alerta">
          Mês parcial: a coleta guarda só os últimos 90 dias, então o cálculo começa em {dataBR(data.periodo.de)}.
        </p>
      )}
      {data.faltando.length > 0 && (
        <p className="rounded-lg border border-ruim/50 bg-ruim/10 px-3 py-2 text-sm text-ruim">
          Cálculo incompleto: faltam dados de {data.faltando.join(', ')}. Não use este valor para pagamento até a fonte voltar.
        </p>
      )}
      <Cartao>
        <h3 className="mb-3 text-xs uppercase tracking-wide text-suave">Memória de cálculo</h3>
        <table className="w-full text-sm">
          <tbody>
            {data.linhas.map((l) => {
              const total = l.sinal === '=' || l.sinal === '×';
              return (
                <tr key={l.rotulo} className={`border-b border-borda/40 ${total ? 'font-semibold' : ''}`}>
                  <td className="w-6 py-2 text-center text-apagado">{l.sinal}</td>
                  <td className="py-2 pr-2">
                    {l.rotulo}
                    {l.nota && <span className="block text-[11px] font-normal text-apagado">{l.nota}</span>}
                  </td>
                  <td className={`num py-2 text-right ${l.sinal === '×' ? 'font-titulo text-lg text-destaque' : ''} ${l.valor < 0 ? 'text-ruim' : ''}`}>
                    {dinheiro(l.valor)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Cartao>
      <p className="text-xs text-apagado">
        Regra do contrato: faturamento de anúncios (bruto aprovado com origem identificada, menos reembolsos e chargebacks) − investimento = resultado
        líquido. Acima da base mensal, aplica-se o percentual. Base e percentual ficam em <code>config/metas.ts</code>.
      </p>
    </div>
  );
}
