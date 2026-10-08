export type FormatMode = 'dec' | 'int' | 'rate' | 'pct';

const SUFFIXES = ['', 'K', 'M', 'Md', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];

const trimZeros = (s: string) => (s.includes('.') ? s.replace(/\.?0+$/, '') : s);

function compact(value: number, integer: boolean): string {
  const abs = Math.abs(value);
  if (abs < 1000) {
    if (integer) return String(Math.floor(value));
    return trimZeros(value.toFixed(abs < 10 ? 2 : abs < 100 ? 1 : 0));
  }
  const tier = Math.floor(Math.log10(abs) / 3);
  if (tier >= SUFFIXES.length) return value.toExponential(2);
  return `${trimZeros((value / Math.pow(10, tier * 3)).toFixed(2))} ${SUFFIXES[tier]}`;
}

/** Formatage compact des grands nombres (1.25 K, 3.4 M, 12 Md…). */
export function formatValue(value: number, mode: FormatMode = 'dec'): string {
  if (!Number.isFinite(value)) return '∞';
  switch (mode) {
    case 'int':
      return compact(value, true);
    case 'rate': {
      const v = Math.abs(value) < 0.005 ? 0 : value;
      return `${v > 0 ? '+' : v < 0 ? '−' : ''}${compact(Math.abs(v), false)}/s`;
    }
    case 'pct':
      return `${Math.round(value * 100)} %`;
    default:
      return compact(value, false);
  }
}

export function formatDuration(seconds: number): string {
  const s = Math.floor(seconds);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d} j ${h} h ${m} min`;
  if (h > 0) return `${h} h ${m} min`;
  if (m > 0) return `${m} min ${sec} s`;
  return `${sec} s`;
}
