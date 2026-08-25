// @vitest-environment node
// Pure functions, no DOM — skip jsdom's per-file setup cost.
import { describe, it, expect } from 'vitest';
import { seedState } from './seed';
import type { Vehicle } from './types';

const HOUR = 3600 * 1000;
const now = Date.now();

function makeLiveVehicle(n: number): Vehicle {
  return {
    id: 'live-' + n,
    year: 2022,
    make: 'Honda',
    model: 'Civic',
    trim: 'LX',
    bid_count: 3,
    base: 10000,
    starting_bid: 10000,
    openAt: now - HOUR,
    runAt: now + HOUR,
  } as unknown as Vehicle;
}

function makeEndedVehicle(n: number): Vehicle {
  return {
    id: 'ended-' + n,
    year: 2021,
    make: 'Toyota',
    model: 'Corolla',
    trim: 'SE',
    bid_count: 2,
    base: 8000,
    starting_bid: 8000,
    openAt: now - 3 * HOUR,
    runAt: now - HOUR,
  } as unknown as Vehicle;
}

describe('seedState', () => {
  it('returns empty state when there is nothing to seed from', () => {
    const out = seedState([], 'ME01');
    expect(out).toEqual({ bids: {}, feed: [], watch: [] });
  });

  it('seeds a leading bid on the 3rd live lot (index 2) when at least 3 live lots exist', () => {
    const vehicles = Array.from({ length: 3 }, (_, i) => makeLiveVehicle(i));
    const out = seedState(vehicles, 'ME01');
    const win = vehicles[2];
    expect(out.bids[win.id].ME01.amount).toBeGreaterThan(win.base);
    expect(out.feed.some((f) => f.id === win.id && f.text.includes('You lead'))).toBe(true);
  });

  it('seeds an outbid record on the 8th live lot (index 7) when enough live lots exist', () => {
    const vehicles = Array.from({ length: 8 }, (_, i) => makeLiveVehicle(i));
    const out = seedState(vehicles, 'ME01');
    const out7 = vehicles[7];
    expect(out.bids[out7.id].ME01.amount).toBeLessThan(out7.base);
  });

  it('seeds a closed bid on the 2nd ended lot (index 1) when enough ended lots exist', () => {
    const vehicles = [makeLiveVehicle(0), ...Array.from({ length: 2 }, (_, i) => makeEndedVehicle(i))];
    const out = seedState(vehicles, 'ME01');
    const done = vehicles[2]; // ended-1, second ended lot
    expect(out.bids[done.id].ME01.amount).toBe(done.base);
    expect(out.feed.some((f) => f.id === done.id && f.kind === 'Lot closed')).toBe(true);
  });

  it('watches the 5th and 10th live lots (indexes 4 and 9) when they exist', () => {
    const vehicles = Array.from({ length: 10 }, (_, i) => makeLiveVehicle(i));
    const out = seedState(vehicles, 'ME01');
    expect(out.watch).toEqual([vehicles[4].id, vehicles[9].id]);
  });

  it('only watches what actually exists when there are fewer than 10 live lots', () => {
    const vehicles = Array.from({ length: 5 }, (_, i) => makeLiveVehicle(i));
    const out = seedState(vehicles, 'ME01');
    expect(out.watch).toEqual([vehicles[4].id]);
  });

  it('ignores lots with no bids when picking live/ended candidates', () => {
    const vehicles = Array.from({ length: 3 }, (_, i) => ({ ...makeLiveVehicle(i), bid_count: 0 }));
    const out = seedState(vehicles, 'ME01');
    expect(out.bids).toEqual({});
  });
});
