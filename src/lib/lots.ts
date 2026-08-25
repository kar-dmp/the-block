// Auction domain logic: lot state, effective bid, filtering, sorting, derived rows.
// `ctx` is always { bids, watch, compare, bought, myId } from the app store.
// `bids[lotId]` holds one record per bidder — `{ [bidderId]: { amount, max, at } }`
// — so multiple browser tabs (each with their own myId) can compete on a lot.

import {
  PREVIEW_MS, NOW_YEAR, money, km, cap, bidsWord, increment,
  gradeBand, gradeColor, gradeTag, countdown, hash, relTime,
} from './format';
import type {
  AppCtx, BidRecord, BidTag, FacetOption, Filters, HistoryEntry, LotStatus,
  MyBidRow, RawVehicle, ReserveStatus, Row, StatusMeta, Vehicle,
} from './types';

export const titleOf = (v: Vehicle): string => `${v.year} ${v.make} ${v.model} ${v.trim}`;

/**
 * The dataset's auction_start values sit in a fixed week (31 Mar – 6 Apr 2026).
 * Shift the whole window by one constant so the sale straddles `anchorAt`
 * (default: 26h before now): relative order and spacing between lots is
 * preserved exactly. Callers that want lots to keep closing in real time
 * instead of rewinding on every reload pass a fixed, persisted `anchorAt`.
 */
export function normalize(raw: RawVehicle[], anchorAt: number = Date.now() - 26 * 3600 * 1000): Vehicle[] {
  const min = raw.map((v) => Date.parse(v.auction_start)).sort((a, b) => a - b)[0];
  const shift = anchorAt - min;
  return raw.map((v) => {
    const runAt = Date.parse(v.auction_start) + shift;
    return {
      ...v,
      runAt,
      openAt: runAt - PREVIEW_MS,
      base: v.current_bid != null ? v.current_bid : v.starting_bid,
    };
  });
}

export function statusOf(v: Vehicle, now: number, ctx: AppCtx): LotStatus {
  if (ctx.bought[v.id]) return 'bought';
  if (v.runAt <= now) return 'ended';
  if (v.openAt > now) return 'preview';
  return 'live';
}

export const bidderLabel = (id: string): string => 'Bidder ' + id;

/** This tab's own bid record for a lot, or undefined. */
export const myBid = (v: Vehicle, ctx: AppCtx): BidRecord | undefined => ctx.bids[v.id]?.[ctx.myId];

/** The highest-standing bidder record for a lot, across every bidder, or null.
 * Ties (two tabs bidding the same amount) resolve to whichever bid landed
 * first, so every tab agrees on the same leader instead of each picking
 * whichever record happens to iterate first in its own local copy. */
export const leadBid = (v: Vehicle, ctx: AppCtx): BidRecord | null => {
  const records = Object.values(ctx.bids[v.id] || {});
  return records.length
    ? records.reduce((a, b) => (b.amount !== a.amount ? (b.amount > a.amount ? b : a) : (b.at < a.at ? b : a)))
    : null;
};

export const effBid = (v: Vehicle, ctx: AppCtx): number => {
  const lead = leadBid(v, ctx);
  return lead && lead.amount > v.base ? lead.amount : v.base;
};

export const effCount = (v: Vehicle, ctx: AppCtx): number => v.bid_count + Object.keys(ctx.bids[v.id] || {}).length;

export const minNext = (v: Vehicle, ctx: AppCtx): number => {
  const c = effBid(v, ctx);
  return c + increment(c);
};

/** Whether the reserve has been met at the current bid, or null if there is no reserve. */
export const reserveMet = (v: Vehicle, cur: number): boolean | null =>
  v.reserve_price == null ? null : cur >= v.reserve_price;

/** Reserve tag for the current bid — shared by the detail page and quick-bid dialog. */
export function reserveStatus(v: Vehicle, cur: number): ReserveStatus {
  const met = reserveMet(v, cur);
  if (met === null) return { tag: 'tag-neutral', label: 'No reserve' };
  return met ? { tag: 'tag-outline', label: 'Reserve met' } : { tag: 'tag-accent', label: 'Reserve not met' };
}

/** Whether a bid record is currently the leading bid at the lot's current price. */
export const isWinning = (bid: Pick<BidRecord, 'amount'>, cur: number): boolean => bid.amount >= cur;

/** "You are the high bidder" / "You have been outbid" tag for an existing bid record. */
export function mineBidTag(mine: Pick<BidRecord, 'amount'>, cur: number): BidTag {
  return isWinning(mine, cur)
    ? { tag: 'tag-outline', label: 'You are the high bidder' }
    : { tag: 'tag-accent', label: 'You have been outbid' };
}

export function statusMeta(v: Vehicle, now: number, ctx: AppCtx): StatusMeta {
  const st = statusOf(v, now, ctx);
  if (st === 'bought')
    return { label: 'Purchased', tag: 'tag-accent', color: 'var(--color-accent-700)' };
  if (st === 'ended') {
    const sold = reserveMet(v, effBid(v, ctx)) !== false;
    return {
      label: sold ? 'Sold' : 'No sale',
      tag: 'tag-neutral',
      color: 'var(--color-neutral-600)',
    };
  }
  if (st === 'preview')
    return { label: 'Preview', tag: 'tag-neutral', color: 'var(--color-neutral-700)' };
  const soon = v.runAt - now < 6 * 3600 * 1000;
  return {
    label: soon ? 'Closing soon' : 'Live',
    tag: soon ? 'tag-accent' : 'tag-outline',
    color: 'var(--color-accent)',
  };
}

// Slider ceilings: at these values the filter reads "Any" and imposes no cap.
export const PRICE_MAX_CAP = 80000;
export const ODO_MAX_CAP = 280000;

export const EMPTY_FILTERS: Filters = {
  makes: [], bodies: [], provs: [], titles: [], status: [],
  yearMin: '', yearMax: '', priceMax: PRICE_MAX_CAP, odoMax: ODO_MAX_CAP, gradeMin: 1,
  damageFree: false, hasBuyNow: false, noReserve: false,
};

const FILTER_ARRAY_KEYS = ['makes', 'bodies', 'provs', 'titles', 'status'] as const;
const FILTER_BOOL_KEYS = ['damageFree', 'hasBuyNow', 'noReserve'] as const;

/** Browse's search/sort/view/filter state as URLSearchParams-ready key/value
 * pairs, omitting anything at its default so the URL stays short and clean. */
export function filtersToSearchParams(
  query: string,
  sort: string,
  view: string,
  f: Filters
): Record<string, string> {
  const params: Record<string, string> = {};
  if (query) params.q = query;
  if (sort !== 'closing') params.sort = sort;
  if (view !== 'grid') params.view = view;
  FILTER_ARRAY_KEYS.forEach((k) => {
    if (f[k].length) params[k] = f[k].join(',');
  });
  if (f.yearMin) params.yearMin = f.yearMin;
  if (f.yearMax) params.yearMax = f.yearMax;
  if (f.priceMax < PRICE_MAX_CAP) params.priceMax = String(f.priceMax);
  if (f.odoMax < ODO_MAX_CAP) params.odoMax = String(f.odoMax);
  if (f.gradeMin > 1) params.gradeMin = String(f.gradeMin);
  FILTER_BOOL_KEYS.forEach((k) => {
    if (f[k]) params[k] = '1';
  });
  return params;
}

/** Inverse of filtersToSearchParams — reconstructs Browse's state from a
 * URLSearchParams, filling in defaults for anything missing or malformed. */
export function filtersFromSearchParams(params: URLSearchParams): {
  query: string;
  sort: string;
  view: 'grid' | 'table';
  f: Filters;
} {
  const num = (k: string, fallback: number): number => {
    const raw = params.get(k);
    const n = Number(raw);
    return raw != null && Number.isFinite(n) ? n : fallback;
  };
  const f: Filters = { ...EMPTY_FILTERS };
  FILTER_ARRAY_KEYS.forEach((k) => {
    const raw = params.get(k);
    if (raw) f[k] = raw.split(',').filter(Boolean);
  });
  if (params.get('yearMin')) f.yearMin = params.get('yearMin') ?? '';
  if (params.get('yearMax')) f.yearMax = params.get('yearMax') ?? '';
  f.priceMax = num('priceMax', PRICE_MAX_CAP);
  f.odoMax = num('odoMax', ODO_MAX_CAP);
  f.gradeMin = num('gradeMin', 1);
  FILTER_BOOL_KEYS.forEach((k) => {
    f[k] = params.get(k) === '1';
  });
  const sort = SORT_OPTIONS.some(([v]) => v === params.get('sort')) ? (params.get('sort') as string) : 'closing';
  const view = params.get('view') === 'table' ? 'table' : 'grid';
  return { query: params.get('q') || '', sort, view, f };
}

export function activeFilterCount(f: Filters): number {
  let n = f.makes.length + f.bodies.length + f.provs.length + f.titles.length + f.status.length;
  if (f.yearMin) n++;
  if (f.yearMax) n++;
  if (f.priceMax < PRICE_MAX_CAP) n++;
  if (f.odoMax < ODO_MAX_CAP) n++;
  if (f.gradeMin > 1) n++;
  if (f.damageFree) n++;
  if (f.hasBuyNow) n++;
  if (f.noReserve) n++;
  return n;
}

type Sorter = (ctx: AppCtx, now: number) => (a: Vehicle, b: Vehicle) => number;

const SORTERS: Record<string, Sorter> = {
  closing: (ctx, now) => {
    const rank = (v: Vehicle) => {
      const st = statusOf(v, now, ctx);
      return st === 'live' ? 0 : st === 'preview' ? 1 : 2;
    };
    return (a, b) => rank(a) - rank(b) || a.runAt - b.runAt;
  },
  bidlow: (ctx) => (a, b) => effBid(a, ctx) - effBid(b, ctx),
  bidhigh: (ctx) => (a, b) => effBid(b, ctx) - effBid(a, ctx),
  odo: () => (a, b) => a.odometer_km - b.odometer_km,
  grade: () => (a, b) => b.condition_grade - a.condition_grade,
  year: () => (a, b) => b.year - a.year,
  lot: () => (a, b) => a.lot.localeCompare(b.lot),
};

export const SORT_OPTIONS: [string, string][] = [
  ['closing', 'Closing soonest'],
  ['bidlow', 'Current bid: low to high'],
  ['bidhigh', 'Current bid: high to low'],
  ['odo', 'Odometer: lowest'],
  ['grade', 'Condition: best'],
  ['year', 'Model year: newest'],
  ['lot', 'Lot number'],
];

export function filterSort(
  vehicles: Vehicle[],
  { f, query, sort }: { f: Filters; query: string; sort: string },
  now: number,
  ctx: AppCtx
): Vehicle[] {
  const queryTokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const out = vehicles.filter((v) => {
    if (f.makes.length && !f.makes.includes(v.make)) return false;
    if (f.bodies.length && !f.bodies.includes(v.body_style)) return false;
    if (f.provs.length && !f.provs.includes(v.province)) return false;
    if (f.titles.length && !f.titles.includes(v.title_status)) return false;
    if (f.status.length && !f.status.includes(statusOf(v, now, ctx))) return false;
    if (f.yearMin && v.year < Number(f.yearMin)) return false;
    if (f.yearMax && v.year > Number(f.yearMax)) return false;
    if (f.priceMax < PRICE_MAX_CAP && effBid(v, ctx) > f.priceMax) return false;
    if (f.odoMax < ODO_MAX_CAP && v.odometer_km > f.odoMax) return false;
    if (v.condition_grade < f.gradeMin) return false;
    if (f.damageFree && v.damage_notes.length) return false;
    if (f.hasBuyNow && !v.buy_now_price) return false;
    if (f.noReserve && v.reserve_price) return false;
    if (queryTokens.length) {
      const hay = [
        v.year, v.make, v.model, v.trim, v.vin, v.lot,
        v.city, v.province, v.selling_dealership, v.body_style,
      ].join(' ').toLowerCase();
      // Every token must appear somewhere in the haystack, in any order —
      // "2025 subaru" and "subaru 2025" match the same lots.
      if (!queryTokens.every((t) => hay.includes(t))) return false;
    }
    return true;
  });
  const make = SORTERS[sort] || SORTERS.closing;
  return out.sort(make(ctx, now));
}

/** Facet options with live counts, built from the loaded dataset. */
export function facet(vehicles: Vehicle[], field: keyof Vehicle, selected: string[]): FacetOption[] {
  const counts: Record<string, number> = {};
  vehicles.forEach((v) => {
    const key = String(v[field]);
    counts[key] = (counts[key] || 0) + 1;
  });
  return Object.keys(counts)
    .sort()
    .map((k) => ({ value: k, label: cap(k), count: counts[k], on: selected.includes(k) }));
}

/** Everything a list row or card needs, in display form. */
export function rowOf(v: Vehicle, now: number, ctx: AppCtx): Row {
  const st = statusOf(v, now, ctx);
  const sm = statusMeta(v, now, ctx);
  const b = myBid(v, ctx);
  return {
    id: v.id,
    lot: v.lot,
    title: titleOf(v),
    sub: `${cap(v.body_style)} · ${v.drivetrain} · ${v.exterior_color} · ${v.selling_dealership}`,
    odo: km(v.odometer_km),
    grade: v.condition_grade.toFixed(1),
    gradeWord: gradeBand(v.condition_grade),
    gradeLabel: `${v.condition_grade.toFixed(1)} ${gradeBand(v.condition_grade)}`,
    gradeColor: gradeColor(v.condition_grade),
    gradeTag: gradeTag(v.condition_grade),
    place: `${v.city}, ${v.province}`,
    status: sm.label,
    statusColor: sm.color,
    countdown:
      st === 'ended' || st === 'bought'
        ? 'closed'
        : st === 'preview'
          ? 'opens ' + countdown(v.openAt - now)
          : countdown(v.runAt - now),
    bid: money(effBid(v, ctx)),
    bidLabel: v.bid_count || leadBid(v, ctx) ? 'Current bid' : 'Starting bid',
    bidMeta:
      bidsWord(effCount(v, ctx)) +
      (reserveMet(v, effBid(v, ctx)) === null
        ? ' · no reserve'
        : reserveMet(v, effBid(v, ctx))
          ? ' · reserve met'
          : ' · reserve not met'),
    image: v.images[0],
    live: st === 'live',
    cta: st === 'live' ? (b ? 'Raise bid' : 'Bid') : st === 'preview' ? 'Preview' : 'Results',
    watching: ctx.watch.includes(v.id),
    inCompare: ctx.compare.includes(v.id),
  };
}

/**
 * Bid history is generated from bid_count + current_bid, descending in valid
 * increments with anonymized bidders — the dataset carries a count, not a ledger.
 */
export function buildHistory(v: Vehicle, now: number, ctx: AppCtx): HistoryEntry[] {
  const out: HistoryEntry[] = [];
  let amount = v.base;
  const n = Math.min(v.bid_count, 6);
  for (let i = 0; i < n; i++) {
    const seed = hash(v.id + i);
    out.push({
      who: 'Bidder ' + ((seed % 9000) + 1000),
      amount: money(amount),
      value: amount,
      when: relTime((i + 1) * (1800000 + (seed % 5400000))),
      mine: false,
    });
    amount -= increment(amount) * (1 + (seed % 2));
  }
  Object.entries(ctx.bids[v.id] || {}).forEach(([bidderId, r]) => {
    out.push({
      who: bidderId === ctx.myId ? 'You' : bidderLabel(bidderId),
      amount: money(r.amount),
      value: r.amount,
      when: relTime(now - r.at),
      mine: bidderId === ctx.myId,
    });
  });
  return out.sort((a, b) => b.value - a.value);
}

export function usage(v: Vehicle): { age: number; kmy: number; word: string } {
  const age = Math.max(1, NOW_YEAR - v.year + 1);
  const kmy = Math.round(v.odometer_km / age);
  const ratio = kmy / 20000;
  return {
    age,
    kmy,
    word: ratio > 1.2 ? 'above average' : ratio < 0.8 ? 'below average' : 'about average',
  };
}

/** My-bids row: status derives from my bid vs current bid vs reserve. */
export function myBidRow(v: Vehicle, now: number, ctx: AppCtx): MyBidRow {
  // Only ever called for a lot the caller has already confirmed has a bid.
  const b = myBid(v, ctx)!;
  const cur = effBid(v, ctx);
  const st = statusOf(v, now, ctx);
  const winning = isWinning(b, cur);
  const status =
    st === 'bought'
      ? 'Purchased'
      : st === 'ended'
        ? winning && reserveMet(v, cur) !== false
          ? 'Won'
          : winning
            ? 'No sale'
            : 'Lost'
        : winning
          ? 'High bidder'
          : 'Outbid';
  return {
    id: v.id,
    lot: v.lot,
    title: titleOf(v),
    sub: `${km(v.odometer_km)} · ${v.city}, ${v.province}`,
    mine: money(b.amount),
    mineValue: b.amount,
    current: money(cur),
    currentValue: cur,
    winning,
    max: b.max ? money(b.max) : '—',
    countdown:
      st === 'live'
        ? countdown(v.runAt - now)
        : st === 'preview'
          ? 'opens ' + countdown(v.openAt - now)
          : 'closed',
    status,
    tag:
      status === 'Outbid' || status === 'Lost'
        ? 'tag-accent'
        : ['High bidder', 'Won', 'Purchased'].includes(status)
          ? 'tag-outline'
          : 'tag-neutral',
  };
}
