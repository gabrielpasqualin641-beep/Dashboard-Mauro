'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { METAS } from '@/config/metas';
import { decimal, diaCurto, dinheiro, inteiro } from '@/lib/formato';
import type { Moeda } from '@/lib/tipos';

const COR_SERIE = '#52BBF6';
const COR_EIXO = '#6F8798';
const COR_GRADE = '#26435A';
const COR_EMPATE = '#F5B83D';
const COR_ESCALA = '#3DD68C';

interface PontoDia {
  date: string;
  investimento: number;
  faturamento: number;
  roas: number | null;
  vendas: number;
}

function CaixaTooltip({ titulo, linhas }: { titulo: string; linhas: Array<[string, string]> }) {
  return (
    <div className="rounded-md border border-borda bg-[#0B1822] px-3 py-2 text-xs shadow-lg">
      <p className="mb-1 font-medium text-texto">{titulo}</p>
      {linhas.map(([k, v]) => (
        <p key={k} className="flex justify-between gap-4 text-suave">
          <span>{k}</span>
          <span className="num text-texto">{v}</span>
        </p>
      ))}
    </div>
  );
}

/**
 * Duas leituras, um eixo cada (nada de gráfico com dois eixos Y):
 * em cima o investimento diário; embaixo o ROAS real com as linhas de empate e escala.
 */
export function GraficoDiario({
  dados,
  moeda,
  rotuloRoas = 'ROAS real',
  rotuloFaturamento = 'Faturamento real',
}: {
  dados: PontoDia[];
  moeda: Moeda;
  rotuloRoas?: string;
  rotuloFaturamento?: string;
}) {
  const maxRoas = Math.max(METAS.roasEscala * 1.25, ...dados.map((d) => d.roas ?? 0));
  const tooltip = ({ active, payload }: { active?: boolean; payload?: ReadonlyArray<{ payload?: unknown }> }) => {
    if (!active || !payload?.length) return null;
    const p = payload[0].payload as PontoDia;
    return (
      <CaixaTooltip
        titulo={diaCurto(p.date)}
        linhas={[
          ['Investimento', dinheiro(p.investimento, moeda)],
          [rotuloFaturamento, dinheiro(p.faturamento, moeda)],
          [rotuloRoas, p.roas === null ? '—' : `${decimal(p.roas)}×`],
          ['Vendas', inteiro(p.vendas)],
        ]}
      />
    );
  };
  return (
    <div className="space-y-1">
      <p className="text-xs text-suave">Investimento por dia</p>
      <div className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dados} syncId="diario" margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barCategoryGap={2}>
            <CartesianGrid stroke={COR_GRADE} strokeOpacity={0.5} vertical={false} />
            <XAxis dataKey="date" tickFormatter={diaCurto} stroke={COR_EIXO} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={16} />
            <YAxis stroke={COR_EIXO} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={64} tickFormatter={(v: number) => dinheiro(v, moeda, true)} />
            <Tooltip content={tooltip} cursor={{ fill: '#ffffff0d' }} />
            <Bar dataKey="investimento" name="Investimento" isAnimationActive={false} fill={COR_SERIE} radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="pt-2 text-xs text-suave">
        {rotuloRoas} por dia ·{' '}
        <span style={{ color: COR_EMPATE }}>– – empate {decimal(METAS.roasEmpate)}×</span> ·{' '}
        <span style={{ color: COR_ESCALA }}>– – escala {decimal(METAS.roasEscala)}×</span>
      </p>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={dados} syncId="diario" margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke={COR_GRADE} strokeOpacity={0.5} vertical={false} />
            <XAxis dataKey="date" tickFormatter={diaCurto} stroke={COR_EIXO} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={16} />
            <YAxis stroke={COR_EIXO} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={64} domain={[0, Math.ceil(maxRoas * 10) / 10]} tickFormatter={(v: number) => `${decimal(v, 1)}×`} />
            <Tooltip content={tooltip} cursor={{ stroke: COR_EIXO, strokeDasharray: '3 3' }} />
            <ReferenceLine y={METAS.roasEmpate} stroke={COR_EMPATE} strokeDasharray="5 4" ifOverflow="extendDomain" />
            <ReferenceLine y={METAS.roasEscala} stroke={COR_ESCALA} strokeDasharray="5 4" ifOverflow="extendDomain" />
            <Line dataKey="roas" name="ROAS real" isAnimationActive={false} stroke={COR_SERIE} strokeWidth={2} dot={{ r: 3, fill: COR_SERIE, stroke: '#172C3B', strokeWidth: 2 }} activeDot={{ r: 5 }} connectNulls={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/** Mini gráfico sem eixos (14 dias). */
export function Sparkline({ valores, cor = COR_SERIE, rotulo }: { valores: Array<number | null>; cor?: string; rotulo: string }) {
  const dados = valores.map((v, i) => ({ i, v }));
  const temDado = valores.some((v) => v !== null && v > 0);
  if (!temDado) return <span className="text-xs text-apagado">—</span>;
  return (
    <div className="h-7 w-24" role="img" aria-label={rotulo}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={dados} margin={{ top: 3, right: 2, bottom: 3, left: 2 }}>
          <YAxis hide domain={['dataMin', 'dataMax']} />
          <Line dataKey="v" stroke={cor} strokeWidth={1.5} dot={false} connectNulls isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function GraficoGoogle({ dados }: { dados: Array<{ date: string; custo: number; cliques: number; conversoes: number }> }) {
  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={dados} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={COR_GRADE} strokeOpacity={0.5} vertical={false} />
          <XAxis dataKey="date" tickFormatter={diaCurto} stroke={COR_EIXO} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={16} />
          <YAxis stroke={COR_EIXO} tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={60} tickFormatter={(v: number) => dinheiro(v, 'USD', true)} />
          <Tooltip
            cursor={{ fill: '#ffffff0d' }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const p = payload[0].payload as { date: string; custo: number; cliques: number; conversoes: number };
              return (
                <CaixaTooltip
                  titulo={diaCurto(p.date)}
                  linhas={[
                    ['Custo', dinheiro(p.custo, 'USD')],
                    ['Cliques', inteiro(p.cliques)],
                    ['Conversões', decimal(p.conversoes, 1)],
                  ]}
                />
              );
            }}
          />
          <Bar dataKey="custo" isAnimationActive={false} fill={COR_SERIE} radius={[4, 4, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
