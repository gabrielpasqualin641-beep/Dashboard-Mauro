import { DATA_INICIO_OPERACAO, FUSO } from '@/config/operacao';

/** Datas sempre como 'YYYY-MM-DD' no fuso America/Sao_Paulo. */

const fmtDia = new Intl.DateTimeFormat('en-CA', {
  timeZone: FUSO,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function diaEmSP(d: Date | number): string {
  return fmtDia.format(typeof d === 'number' ? new Date(d) : d);
}

export function hojeSP(agora: Date = new Date()): string {
  return diaEmSP(agora);
}

function paraUTC(dia: string): Date {
  const [a, m, d] = dia.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d));
}

function deUTC(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function somarDias(dia: string, n: number): string {
  const d = paraUTC(dia);
  d.setUTCDate(d.getUTCDate() + n);
  return deUTC(d);
}

/** Número de dias entre dois dias, inclusivo. */
export function diasEntre(de: string, ate: string): number {
  return Math.round((paraUTC(ate).getTime() - paraUTC(de).getTime()) / 86_400_000) + 1;
}

export function listaDias(de: string, ate: string): string[] {
  const n = diasEntre(de, ate);
  return Array.from({ length: Math.max(0, n) }, (_, i) => somarDias(de, i));
}

export function validoDia(s: unknown): s is string {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(paraUTC(s).getTime());
}

export function minDia(a: string, b: string) {
  return a < b ? a : b;
}
export function maxDia(a: string, b: string) {
  return a > b ? a : b;
}

export interface Periodo {
  de: string;
  ate: string;
}

export type PresetPeriodo = 'hoje' | '7d' | '14d' | '30d' | 'mes' | 'personalizado';

export function periodoDoPreset(
  preset: PresetPeriodo,
  hoje: string,
  personalizado?: Partial<Periodo>,
  minimo: string = DATA_INICIO_OPERACAO,
): Periodo {
  let p: Periodo;
  switch (preset) {
    case 'hoje':
      p = { de: hoje, ate: hoje };
      break;
    case '14d':
      p = { de: somarDias(hoje, -13), ate: hoje };
      break;
    case '30d':
      p = { de: somarDias(hoje, -29), ate: hoje };
      break;
    case 'mes':
      p = { de: hoje.slice(0, 8) + '01', ate: hoje };
      break;
    case 'personalizado': {
      const de = validoDia(personalizado?.de) ? personalizado!.de! : somarDias(hoje, -6);
      const ate = validoDia(personalizado?.ate) ? personalizado!.ate! : hoje;
      p = de <= ate ? { de, ate } : { de: ate, ate: de };
      break;
    }
    case '7d':
    default:
      p = { de: somarDias(hoje, -6), ate: hoje };
  }
  // Nunca antes do início da operação/dos dias coletados nem depois de hoje.
  const piso = maxDia(minimo, DATA_INICIO_OPERACAO);
  const de = maxDia(p.de, piso);
  const ate = minDia(maxDia(p.ate, piso), hoje);
  return { de: minDia(de, ate), ate };
}

/** Período imediatamente anterior, de mesmo tamanho. */
export function periodoAnterior(p: Periodo): Periodo {
  const n = diasEntre(p.de, p.ate);
  return { de: somarDias(p.de, -n), ate: somarDias(p.de, -1) };
}

export function diasNoMes(dia: string): number {
  const [a, m] = dia.split('-').map(Number);
  return new Date(Date.UTC(a, m, 0)).getUTCDate();
}

export function inicioDoMes(dia: string): string {
  return dia.slice(0, 8) + '01';
}

export function fimDoMes(dia: string): string {
  return dia.slice(0, 8) + String(diasNoMes(dia)).padStart(2, '0');
}

/** Início do dia em SP (UTC-3, sem horário de verão desde 2019) em ms. */
export function inicioDiaSPms(dia: string): number {
  return new Date(`${dia}T00:00:00-03:00`).getTime();
}
export function fimDiaSPms(dia: string): number {
  return new Date(`${dia}T23:59:59.999-03:00`).getTime();
}

export function horaSP(iso: string | Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: FUSO,
    hour: '2-digit',
    minute: '2-digit',
  }).format(typeof iso === 'string' ? new Date(iso) : iso);
}
