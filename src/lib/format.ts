// Pure formatting and domain math. No React, no state — trivially unit-testable.

export const AVG_KM_YEAR = 20000;
export const NOW_YEAR = 2026;
export const PREVIEW_MS = 72 * 3600 * 1000;

export const money = (n: number | null | undefined): string =>
  n == null ? '—' : '$' + Math.round(n).toLocaleString('en-CA');

export const km = (n: number | null | undefined): string =>
  n == null ? '—' : n.toLocaleString('en-CA') + ' km';

export const cap = (s: string): string => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');

export const bidsWord = (n: number): string => (n === 0 ? 'No bids' : n === 1 ? '1 bid' : n + ' bids');

/** Minimum bid increment scales with price. */
export const increment = (v: number): number => (v < 10000 ? 100 : v < 25000 ? 250 : 500);

/** Add/remove a value from a list — the pattern behind every chip and toggle button. */
export const toggleIn = <T>(list: T[], x: T): T[] =>
  list.includes(x) ? list.filter((y) => y !== x) : [...list, x];

export function gradeBand(g: number): string {
  if (g >= 4.5) return 'Excellent';
  if (g >= 3.5) return 'Clean';
  if (g >= 2.5) return 'Average';
  if (g >= 1.5) return 'Rough';
  return 'Damaged';
}

export const gradeTag = (g: number): string =>
  g >= 3.5 ? 'tag-neutral' : g >= 2.5 ? 'tag-outline' : 'tag-accent';

export const gradeColor = (g: number): string =>
  g >= 3.5 ? 'var(--color-text)' : g >= 2.5 ? 'var(--color-neutral-700)' : 'var(--color-accent-700)';

export type DamageKind = 'Structural' | 'Mechanical' | 'Cosmetic';

/** Sorts the dataset's free-text damage strings into decision-relevant classes. */
export function damageKind(text: string): DamageKind {
  const t = text.toLowerCase();
  if (/frame|flood|airbag|water damage|structural/.test(t)) return 'Structural';
  if (/transmission|engine|compressor|brake|catalytic|electrical|ac |a\/c|slips|diagnos/.test(t))
    return 'Mechanical';
  return 'Cosmetic';
}

export const DAMAGE_ORDER: Record<DamageKind, number> = { Structural: 0, Mechanical: 1, Cosmetic: 2 };

export const damageTag = (kind: DamageKind): string =>
  kind === 'Structural' ? 'tag-accent' : kind === 'Mechanical' ? 'tag-outline' : 'tag-neutral';

export function median(arr: number[]): number | null {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** FNV-1a — deterministic pseudo-randomness so seeded bid history is stable. */
export function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export function buyFee(price: number): number {
  if (price < 5000) return 195;
  if (price < 10000) return 295;
  if (price < 20000) return 425;
  if (price < 35000) return 595;
  return 750;
}

export function relTime(ms: number): string {
  const d = Math.abs(ms);
  const mins = Math.round(d / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return mins + ' min ago';
  const h = Math.round(mins / 60);
  if (h < 24) return h + ' hr ago';
  return Math.round(h / 24) + ' d ago';
}

export function countdown(ms: number): string {
  if (ms <= 0) return 'closed';
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  if (d > 0) return d + 'd ' + h + 'h';
  if (h > 0) return h + 'h ' + String(m).padStart(2, '0') + 'm';
  if (m < 1) return 'under a minute';
  return m + 'm ' + String(ss).padStart(2, '0') + 's';
}

export const runTimeLabel = (ms: number): string =>
  new Date(ms).toLocaleString('en-CA', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
