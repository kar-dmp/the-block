// @vitest-environment node
// Pure functions, no DOM — skip jsdom's per-file setup cost.
import { describe, it, expect } from 'vitest';
import {
  titleOf, normalize, statusOf, myBid, leadBid, effBid, effCount, minNext,
  reserveMet, reserveStatus, isWinning, mineBidTag, statusMeta, activeFilterCount,
  filterSort, facet, rowOf, buildHistory, usage, myBidRow,
  EMPTY_FILTERS, PRICE_MAX_CAP, ODO_MAX_CAP, SORT_OPTIONS,
} from './lots';
import { HOUR, makeVehicle, makeCtx } from '../test/fixtures';
import type { RawVehicle } from './types';

describe('titleOf', () => {
  it('joins year, make, model, trim', () => {
    expect(titleOf(makeVehicle())).toBe('2022 Honda Civic LX');
  });
});

describe('normalize', () => {
  it('shifts the whole sale so the earliest lot opens ~26h before now, preserving spacing', () => {
    const raw = [
      { id: 'a', auction_start: '2026-04-01T00:00:00Z', starting_bid: 1000 },
      { id: 'b', auction_start: '2026-04-02T00:00:00Z', starting_bid: 2000, current_bid: 2500 },
    ] as unknown as RawVehicle[];
    const out = normalize(raw);
    const spacingMs = Date.parse(raw[1].auction_start) - Date.parse(raw[0].auction_start);
    expect(out[1].runAt - out[0].runAt).toBe(spacingMs);
    expect(out[0].runAt).toBeLessThanOrEqual(Date.now() - 25 * HOUR);
    expect(out[0].runAt).toBeGreaterThanOrEqual(Date.now() - 27 * HOUR);
  });

  it('derives openAt from PREVIEW_MS and base from current_bid falling back to starting_bid', () => {
    const raw = [
      { id: 'a', auction_start: '2026-04-01T00:00:00Z', starting_bid: 1000 },
      { id: 'b', auction_start: '2026-04-01T00:00:00Z', starting_bid: 2000, current_bid: 2500 },
    ] as unknown as RawVehicle[];
    const [a, b] = normalize(raw);
    expect(a.openAt).toBe(a.runAt - 72 * HOUR);
    expect(a.base).toBe(1000);
    expect(b.base).toBe(2500);
  });
});

describe('statusOf', () => {
  it('is "bought" whenever ctx.bought flags the lot, regardless of timing', () => {
    const v = makeVehicle();
    const ctx = makeCtx({ bought: { [v.id]: true } });
    expect(statusOf(v, Date.now(), ctx)).toBe('bought');
  });
  it('is "ended" once runAt has passed', () => {
    const v = makeVehicle({ runAt: Date.now() - 1000 });
    expect(statusOf(v, Date.now(), makeCtx())).toBe('ended');
  });
  it('is "preview" before openAt', () => {
    const v = makeVehicle({ openAt: Date.now() + 1000 });
    expect(statusOf(v, Date.now(), makeCtx())).toBe('preview');
  });
  it('is "live" between openAt and runAt', () => {
    const v = makeVehicle();
    expect(statusOf(v, Date.now(), makeCtx())).toBe('live');
  });
});

describe('myBid', () => {
  it('returns this ctx.myId\'s record for the lot', () => {
    const v = makeVehicle();
    const ctx = makeCtx({ bids: { [v.id]: { ME01: { amount: 15000, max: null, at: 1 } } } });
    expect(myBid(v, ctx)).toEqual({ amount: 15000, max: null, at: 1 });
  });
  it('is undefined when this bidder has no record', () => {
    expect(myBid(makeVehicle(), makeCtx())).toBeUndefined();
  });
});

describe('leadBid', () => {
  it('returns null when there are no bids', () => {
    expect(leadBid(makeVehicle(), makeCtx())).toBeNull();
  });
  it('returns the highest-amount record', () => {
    const v = makeVehicle();
    const ctx = makeCtx({
      bids: { [v.id]: { A: { amount: 13000, max: null, at: 1 }, B: { amount: 14000, max: null, at: 2 } } },
    });
    expect(leadBid(v, ctx)!.amount).toBe(14000);
  });
  it('breaks ties by the earliest timestamp, so every tab agrees on the same leader', () => {
    const v = makeVehicle();
    const ctxOrderAB = makeCtx({
      bids: { [v.id]: { A: { amount: 14000, max: null, at: 100 }, B: { amount: 14000, max: null, at: 50 } } },
    });
    const ctxOrderBA = makeCtx({
      bids: { [v.id]: { B: { amount: 14000, max: null, at: 50 }, A: { amount: 14000, max: null, at: 100 } } },
    });
    // Regardless of key insertion order, the earlier `at` (B) must win both times.
    expect(leadBid(v, ctxOrderAB)!.at).toBe(50);
    expect(leadBid(v, ctxOrderBA)!.at).toBe(50);
  });
});

describe('effBid', () => {
  it('falls back to the lot base when there is no bid above it', () => {
    const v = makeVehicle({ base: 12000 });
    expect(effBid(v, makeCtx())).toBe(12000);
  });
  it('uses the leading bid when it exceeds base', () => {
    const v = makeVehicle({ base: 12000 });
    const ctx = makeCtx({ bids: { [v.id]: { A: { amount: 13000, max: null, at: 1 } } } });
    expect(effBid(v, ctx)).toBe(13000);
  });
});

describe('effCount', () => {
  it('adds the number of live bidder records to the dataset bid_count', () => {
    const v = makeVehicle({ bid_count: 3 });
    const ctx = makeCtx({
      bids: { [v.id]: { A: { amount: 0, max: null, at: 0 }, B: { amount: 0, max: null, at: 0 } } },
    });
    expect(effCount(v, ctx)).toBe(5);
  });
});

describe('minNext', () => {
  it('adds the price-scaled increment to the current effective bid', () => {
    const v = makeVehicle({ base: 9000 });
    expect(minNext(v, makeCtx())).toBe(9100); // increment(9000) === 100
  });
});

describe('reserveMet / reserveStatus', () => {
  it('is null with no reserve set', () => {
    const v = makeVehicle({ reserve_price: null });
    expect(reserveMet(v, 50000)).toBeNull();
    expect(reserveStatus(v, 50000)).toEqual({ tag: 'tag-neutral', label: 'No reserve' });
  });
  it('is true once the current bid reaches the reserve', () => {
    const v = makeVehicle({ reserve_price: 15000 });
    expect(reserveMet(v, 15000)).toBe(true);
    expect(reserveStatus(v, 15000)).toEqual({ tag: 'tag-outline', label: 'Reserve met' });
  });
  it('is false below the reserve', () => {
    const v = makeVehicle({ reserve_price: 15000 });
    expect(reserveMet(v, 14999)).toBe(false);
    expect(reserveStatus(v, 14999)).toEqual({ tag: 'tag-accent', label: 'Reserve not met' });
  });
});

describe('isWinning / mineBidTag', () => {
  it('is winning when the bid amount is at least the current price', () => {
    expect(isWinning({ amount: 100 }, 100)).toBe(true);
    expect(isWinning({ amount: 99 }, 100)).toBe(false);
  });
  it('labels accordingly', () => {
    expect(mineBidTag({ amount: 100 }, 100)).toEqual({ tag: 'tag-outline', label: 'You are the high bidder' });
    expect(mineBidTag({ amount: 99 }, 100)).toEqual({ tag: 'tag-accent', label: 'You have been outbid' });
  });
});

describe('statusMeta', () => {
  it('labels a purchased lot', () => {
    const v = makeVehicle();
    const ctx = makeCtx({ bought: { [v.id]: true } });
    expect(statusMeta(v, Date.now(), ctx).label).toBe('Purchased');
  });
  it('labels an ended lot Sold when the reserve was met (or there was none)', () => {
    const v = makeVehicle({ runAt: Date.now() - 1000, reserve_price: null });
    expect(statusMeta(v, Date.now(), makeCtx()).label).toBe('Sold');
  });
  it('labels an ended lot No sale when the reserve was not met', () => {
    const v = makeVehicle({ runAt: Date.now() - 1000, base: 10000, reserve_price: 20000 });
    expect(statusMeta(v, Date.now(), makeCtx()).label).toBe('No sale');
  });
  it('labels a preview lot', () => {
    const v = makeVehicle({ openAt: Date.now() + 1000 });
    expect(statusMeta(v, Date.now(), makeCtx()).label).toBe('Preview');
  });
  it('labels a live lot Closing soon inside 6 hours of runAt', () => {
    const v = makeVehicle({ runAt: Date.now() + 3 * HOUR });
    expect(statusMeta(v, Date.now(), makeCtx()).label).toBe('Closing soon');
  });
  it('labels a live lot Live otherwise', () => {
    const v = makeVehicle({ runAt: Date.now() + 12 * HOUR, openAt: Date.now() - HOUR });
    expect(statusMeta(v, Date.now(), makeCtx()).label).toBe('Live');
  });
});

describe('activeFilterCount', () => {
  it('is 0 for the default filters', () => {
    expect(activeFilterCount(EMPTY_FILTERS)).toBe(0);
  });
  it('counts each non-default facet', () => {
    expect(activeFilterCount({ ...EMPTY_FILTERS, makes: ['Honda'], noReserve: true })).toBe(2);
  });
  it('does not count the price/odometer sliders at their "Any" ceiling', () => {
    expect(activeFilterCount({ ...EMPTY_FILTERS, priceMax: PRICE_MAX_CAP, odoMax: ODO_MAX_CAP })).toBe(0);
  });
  it('counts the sliders once pulled below their ceiling', () => {
    expect(activeFilterCount({ ...EMPTY_FILTERS, priceMax: 50000, odoMax: 100000 })).toBe(2);
  });
});

describe('filterSort', () => {
  const ctx = makeCtx();
  const now = Date.now();

  it('filters by make', () => {
    const vs = [makeVehicle({ id: 'a', make: 'Honda' }), makeVehicle({ id: 'b', make: 'Toyota' })];
    const out = filterSort(vs, { f: { ...EMPTY_FILTERS, makes: ['Toyota'] }, query: '', sort: 'lot' }, now, ctx);
    expect(out.map((v) => v.id)).toEqual(['b']);
  });

  it('does not cap price/odometer when the slider is left at its "Any" max', () => {
    const vs = [makeVehicle({ id: 'a', base: 79999 }), makeVehicle({ id: 'b', base: 90000 })];
    const out = filterSort(vs, { f: EMPTY_FILTERS, query: '', sort: 'lot' }, now, ctx);
    expect(out.map((v) => v.id).sort()).toEqual(['a', 'b']);
  });

  it('applies the price cap once the slider is pulled below the max', () => {
    const vs = [makeVehicle({ id: 'a', base: 40000 }), makeVehicle({ id: 'b', base: 60000 })];
    const out = filterSort(vs, { f: { ...EMPTY_FILTERS, priceMax: 50000 }, query: '', sort: 'lot' }, now, ctx);
    expect(out.map((v) => v.id)).toEqual(['a']);
  });

  it('applies the odometer cap once the slider is pulled below the max', () => {
    const vs = [makeVehicle({ id: 'a', odometer_km: 40000 }), makeVehicle({ id: 'b', odometer_km: 200000 })];
    const out = filterSort(vs, { f: { ...EMPTY_FILTERS, odoMax: 100000 }, query: '', sort: 'lot' }, now, ctx);
    expect(out.map((v) => v.id)).toEqual(['a']);
  });

  it('matches every search token in any order, across fields', () => {
    const vs = [makeVehicle({ id: 'a', year: 2022, make: 'Subaru', model: 'Outback' })];
    const byOrder1 = filterSort(vs, { f: EMPTY_FILTERS, query: '2022 subaru', sort: 'lot' }, now, ctx);
    const byOrder2 = filterSort(vs, { f: EMPTY_FILTERS, query: 'subaru 2022', sort: 'lot' }, now, ctx);
    expect(byOrder1.map((v) => v.id)).toEqual(['a']);
    expect(byOrder2.map((v) => v.id)).toEqual(['a']);
  });

  it('excludes lots missing any search token', () => {
    const vs = [makeVehicle({ id: 'a', make: 'Subaru', model: 'Outback' })];
    const out = filterSort(vs, { f: EMPTY_FILTERS, query: 'subaru forester', sort: 'lot' }, now, ctx);
    expect(out).toEqual([]);
  });

  it('sorts by lot number', () => {
    const vs = [makeVehicle({ id: 'a', lot: '200' }), makeVehicle({ id: 'b', lot: '100' })];
    const out = filterSort(vs, { f: EMPTY_FILTERS, query: '', sort: 'lot' }, now, ctx);
    expect(out.map((v) => v.id)).toEqual(['b', 'a']);
  });

  it('sorts closing lots before preview before ended', () => {
    const live = makeVehicle({ id: 'live', runAt: now + HOUR, openAt: now - HOUR });
    const preview = makeVehicle({ id: 'preview', openAt: now + HOUR, runAt: now + 2 * HOUR });
    const ended = makeVehicle({ id: 'ended', runAt: now - HOUR, openAt: now - 2 * HOUR });
    const out = filterSort([ended, preview, live], { f: EMPTY_FILTERS, query: '', sort: 'closing' }, now, ctx);
    expect(out.map((v) => v.id)).toEqual(['live', 'preview', 'ended']);
  });

  it('covers every declared sort option without throwing', () => {
    const vs = [makeVehicle({ id: 'a' }), makeVehicle({ id: 'b', lot: '099' })];
    for (const [key] of SORT_OPTIONS) {
      expect(() => filterSort(vs, { f: EMPTY_FILTERS, query: '', sort: key }, now, ctx)).not.toThrow();
    }
  });
});

describe('facet', () => {
  it('counts occurrences per field value, sorted by key, flagged when selected', () => {
    const vs = [makeVehicle({ make: 'Honda' }), makeVehicle({ make: 'Honda' }), makeVehicle({ make: 'Toyota' })];
    const out = facet(vs, 'make', ['Toyota']);
    expect(out).toEqual([
      { value: 'Honda', label: 'Honda', count: 2, on: false },
      { value: 'Toyota', label: 'Toyota', count: 1, on: true },
    ]);
  });
});

describe('rowOf', () => {
  it('flags live lots and offers Bid/Raise bid accordingly', () => {
    const v = makeVehicle();
    expect(rowOf(v, Date.now(), makeCtx()).live).toBe(true);
    expect(rowOf(v, Date.now(), makeCtx()).cta).toBe('Bid');
  });
  it('offers "Raise bid" once this bidder already has a record', () => {
    const v = makeVehicle();
    const ctx = makeCtx({ bids: { [v.id]: { ME01: { amount: 13000, max: null, at: 1 } } } });
    expect(rowOf(v, Date.now(), ctx).cta).toBe('Raise bid');
  });
  it('is not live and offers Preview/Results otherwise', () => {
    const preview = makeVehicle({ openAt: Date.now() + HOUR });
    const ended = makeVehicle({ runAt: Date.now() - 1000 });
    expect(rowOf(preview, Date.now(), makeCtx()).live).toBe(false);
    expect(rowOf(preview, Date.now(), makeCtx()).cta).toBe('Preview');
    expect(rowOf(ended, Date.now(), makeCtx()).cta).toBe('Results');
  });
  it('marks reserve status in bidMeta', () => {
    const v = makeVehicle({ reserve_price: 20000, base: 20000 });
    expect(rowOf(v, Date.now(), makeCtx()).bidMeta).toContain('reserve met');
  });
});

describe('buildHistory', () => {
  it('is deterministic for the same lot id and bid count', () => {
    const v = makeVehicle({ bid_count: 4 });
    const now = Date.now();
    const ctx = makeCtx();
    expect(buildHistory(v, now, ctx)).toEqual(buildHistory(v, now, ctx));
  });
  it('includes one row per live bidder record, sorted highest amount first', () => {
    const v = makeVehicle({ bid_count: 0, base: 10000 });
    const ctx = makeCtx({
      bids: {
        [v.id]: {
          ME01: { amount: 11000, max: null, at: Date.now() },
          OTHER: { amount: 12000, max: null, at: Date.now() },
        },
      },
    });
    const history = buildHistory(v, Date.now(), ctx);
    expect(history).toHaveLength(2);
    expect(history[0].value).toBe(12000);
    expect(history[1].value).toBe(11000);
  });
  it('labels my own bidder record "You"', () => {
    const v = makeVehicle({ bid_count: 0 });
    const ctx = makeCtx({ bids: { [v.id]: { ME01: { amount: 11000, max: null, at: Date.now() } } } });
    const [row] = buildHistory(v, Date.now(), ctx);
    expect(row.who).toBe('You');
    expect(row.mine).toBe(true);
  });
});

describe('usage', () => {
  it('computes km/year against the current model year', () => {
    const v = makeVehicle({ year: 2024, odometer_km: 20000 });
    const u = usage(v);
    expect(u.age).toBeGreaterThanOrEqual(1);
    expect(u.kmy).toBe(Math.round(20000 / u.age));
  });
  it('labels usage relative to the 20,000 km/yr benchmark', () => {
    // age = NOW_YEAR (2026) - year + 1 = 2 for a 2025 model.
    expect(usage(makeVehicle({ year: 2025, odometer_km: 50000 })).word).toBe('above average'); // 25,000 km/yr
    expect(usage(makeVehicle({ year: 2025, odometer_km: 10000 })).word).toBe('below average'); // 5,000 km/yr
    expect(usage(makeVehicle({ year: 2025, odometer_km: 40000 })).word).toBe('about average'); // 20,000 km/yr
  });
});

describe('myBidRow', () => {
  const now = Date.now();

  it('is "High bidder" when live and winning', () => {
    const v = makeVehicle({ base: 10000 });
    const ctx = makeCtx({ bids: { [v.id]: { ME01: { amount: 10000, max: null, at: now } } } });
    expect(myBidRow(v, now, ctx).status).toBe('High bidder');
  });
  it('is "Outbid" when live and behind the current bid', () => {
    const v = makeVehicle({ base: 10000 });
    const ctx = makeCtx({
      bids: {
        [v.id]: { ME01: { amount: 10000, max: null, at: now }, OTHER: { amount: 11000, max: null, at: now } },
      },
    });
    expect(myBidRow(v, now, ctx).status).toBe('Outbid');
  });
  it('is "Won" when ended, winning, and the reserve was met', () => {
    const v = makeVehicle({ runAt: now - 1000, base: 10000, reserve_price: 10000 });
    const ctx = makeCtx({ bids: { [v.id]: { ME01: { amount: 10000, max: null, at: now } } } });
    expect(myBidRow(v, now, ctx).status).toBe('Won');
  });
  it('is "No sale" when ended, winning, but the reserve was not met', () => {
    const v = makeVehicle({ runAt: now - 1000, base: 10000, reserve_price: 15000 });
    const ctx = makeCtx({ bids: { [v.id]: { ME01: { amount: 10000, max: null, at: now } } } });
    expect(myBidRow(v, now, ctx).status).toBe('No sale');
  });
  it('is "Lost" when ended and outbid', () => {
    const v = makeVehicle({ runAt: now - 1000, base: 10000 });
    const ctx = makeCtx({
      bids: {
        [v.id]: { ME01: { amount: 10000, max: null, at: now }, OTHER: { amount: 11000, max: null, at: now } },
      },
    });
    expect(myBidRow(v, now, ctx).status).toBe('Lost');
  });
  it('is "Purchased" once bought, regardless of bid standing', () => {
    const v = makeVehicle({ base: 10000 });
    const ctx = makeCtx({
      bids: { [v.id]: { ME01: { amount: 10000, max: null, at: now } } },
      bought: { [v.id]: true },
    });
    expect(myBidRow(v, now, ctx).status).toBe('Purchased');
  });
  it('exposes the raw values MyBids needs for its exposure total', () => {
    const v = makeVehicle({ base: 10000 });
    // My own bid becomes the leading (and so effective/current) bid here.
    const ctx = makeCtx({ bids: { [v.id]: { ME01: { amount: 10500, max: null, at: now } } } });
    const row = myBidRow(v, now, ctx);
    expect(row.mineValue).toBe(10500);
    expect(row.currentValue).toBe(10500);
    expect(row.winning).toBe(true);
  });
});
