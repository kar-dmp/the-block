import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { AppProvider, useApp } from './AppContext';
import { HOUR } from '../test/fixtures';
import type { Filters, RawVehicle } from '../lib/types';

// Unlike component/screen tests (which mock useApp() and build fixtures with
// src/test/fixtures.js's makeVehicle/makeCtx), this file renders the real
// AppProvider — it's testing the state container itself: hydration,
// persistence, and reducer behavior including the cross-tab sync/race-
// condition fixes below. Fixtures here are deliberately raw, pre-normalize
// dataset JSON (matching vehicles.json's on-disk shape), not the normalized
// makeVehicle() shape components consume.
// Two raw lots, spaced 30h apart: after normalize() shifts the whole sale so
// the earliest lot's runAt lands ~26h in the past, the first is ended and the
// second (30h later) is live. Deterministic regardless of when the test runs.
function rawVehicles(): RawVehicle[] {
  const t0 = '2026-04-01T00:00:00Z';
  const t1 = new Date(Date.parse(t0) + 30 * HOUR).toISOString();
  return [
    {
      id: 'ended-1', lot: '001', year: 2020, make: 'Toyota', model: 'Corolla', trim: 'SE',
      vin: 'VIN0001', city: 'Ottawa', province: 'ON', selling_dealership: 'Dealer A',
      body_style: 'sedan', drivetrain: 'FWD', exterior_color: 'White', interior_color: 'Black',
      engine: '1.8L', transmission: 'automatic', fuel_type: 'gasoline', title_status: 'clean',
      odometer_km: 60000, condition_grade: 3.5, condition_report: 'ok', damage_notes: [],
      images: ['a.jpg'], bid_count: 1, starting_bid: 8000, current_bid: null,
      reserve_price: null, buy_now_price: null, auction_start: t0,
    },
    {
      id: 'live-1', lot: '002', year: 2023, make: 'Honda', model: 'Civic', trim: 'LX',
      vin: 'VIN0002', city: 'Toronto', province: 'ON', selling_dealership: 'Dealer B',
      body_style: 'sedan', drivetrain: 'FWD', exterior_color: 'Blue', interior_color: 'Black',
      engine: '2.0L', transmission: 'automatic', fuel_type: 'gasoline', title_status: 'clean',
      odometer_km: 30000, condition_grade: 4.5, condition_report: 'ok', damage_notes: [],
      images: ['b.jpg'], bid_count: 0, starting_bid: 12000, current_bid: null,
      reserve_price: null, buy_now_price: null, auction_start: t1,
    },
  ];
}

async function renderApp() {
  const view = renderHook(() => useApp(), { wrapper: AppProvider });
  await waitFor(() => expect(view.result.current.loading).toBe(false));
  return view;
}

describe('AppContext', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.stubGlobal('fetch', vi.fn(() =>
      Promise.resolve({ json: () => Promise.resolve(rawVehicles()) })
    ));
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loads vehicles and hydrates from the seed when there is no stored state', async () => {
    const { result } = await renderApp();
    expect(result.current.vehicles).toHaveLength(2);
    expect(result.current.ctx.myId).toMatch(/^[A-Z0-9]{4}$/);
  });

  it('reuses a persisted bidder id across renders via sessionStorage', async () => {
    const first = await renderApp();
    const myId = first.result.current.ctx.myId;
    const second = await renderApp();
    expect(second.result.current.ctx.myId).toBe(myId);
  });

  it('persists the sale timing anchor across reloads so lots keep closing in real time instead of rewinding', async () => {
    const first = await renderApp();
    const runAtBefore = first.result.current.vehicles![0].runAt;

    // Simulate real time passing before the next page load.
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 3 * HOUR);
    const second = await renderApp();
    nowSpy.mockRestore();

    expect(second.result.current.vehicles![0].runAt).toBe(runAtBefore);
  });

  it('resetAll restarts the sale window on the next load instead of keeping the old anchor', async () => {
    const first = await renderApp();
    act(() => first.result.current.actions.resetAll());

    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(Date.now() + 3 * HOUR);
    const second = await renderApp();
    nowSpy.mockRestore();

    expect(second.result.current.vehicles![0].runAt).not.toBe(first.result.current.vehicles![0].runAt);
  });

  describe('toggleWatch / toggleCompare', () => {
    it('toggles a lot in and out of the watchlist', async () => {
      const { result } = await renderApp();
      const v = result.current.vehicles![1];
      act(() => result.current.actions.toggleWatch(v));
      await waitFor(() => expect(result.current.watch).toContain(v.id));
      act(() => result.current.actions.toggleWatch(v));
      await waitFor(() => expect(result.current.watch).not.toContain(v.id));
    });

    it('adds lots to compare across separate clicks', async () => {
      const { result } = await renderApp();
      const vs = result.current.vehicles!;
      // Each toggle is its own act(), like two separate clicks: React
      // commits and re-renders between them, same as real browser events.
      act(() => result.current.actions.toggleCompare(vs[0]));
      await waitFor(() => expect(result.current.compare).toContain(vs[0].id));
      act(() => result.current.actions.toggleCompare(vs[1]));
      await waitFor(() => expect(result.current.compare).toEqual([vs[0].id, vs[1].id]));
    });
  });

  describe('placeBid', () => {
    it('rejects a bid below the minimum next bid', async () => {
      const { result } = await renderApp();
      const v = result.current.vehicles!.find((x) => x.id === 'live-1')!;
      const err = result.current.actions.placeBid(v, 1, null);
      expect(err).toMatch(/Minimum next bid/);
    });

    it('records the bid under this tab\'s bidder id', async () => {
      const { result } = await renderApp();
      const v = result.current.vehicles!.find((x) => x.id === 'live-1')!;
      act(() => {
        result.current.actions.placeBid(v, v.base + 250, null);
      });
      await waitFor(() =>
        expect(result.current.bids[v.id]?.[result.current.ctx.myId]?.amount).toBe(v.base + 250)
      );
    });

    it('does not clobber a bid on lot A when lot B is bid on in the same tick', async () => {
      // Regression test for the reducer race: placeBid used to build its
      // `bids` payload from a stale render-time snapshot, so two placeBid
      // calls dispatched synchronously in the same effect/handler could
      // have the second one's full-map merge erase the first one's update.
      const { result } = await renderApp();
      const [vA, vB] = result.current.vehicles!;
      act(() => {
        result.current.actions.placeBid(vA, vA.base + 100, null);
        result.current.actions.placeBid(vB, vB.base + 250, null);
      });
      await waitFor(() => {
        const myId = result.current.ctx.myId;
        expect(result.current.bids[vA.id]?.[myId]?.amount).toBe(vA.base + 100);
        expect(result.current.bids[vB.id]?.[myId]?.amount).toBe(vB.base + 250);
      });
    });
  });

  describe('buyNow', () => {
    it('marks the lot as bought', async () => {
      const { result } = await renderApp();
      const v = result.current.vehicles![0];
      act(() => result.current.actions.buyNow(v));
      await waitFor(() => expect(result.current.bought[v.id]).toBe(true));
    });
  });

  describe('saveSearch / removeSearch', () => {
    it('saves and removes a named search', async () => {
      const { result } = await renderApp();
      act(() => result.current.actions.saveSearch('My search', {} as Filters, 'civic'));
      await waitFor(() => expect(result.current.saved.some((s) => s.name === 'My search')).toBe(true));
      act(() => result.current.actions.removeSearch('My search'));
      await waitFor(() => expect(result.current.saved.some((s) => s.name === 'My search')).toBe(false));
    });
  });

  describe('resetAll', () => {
    it('clears bids, watch, and bought back to empty', async () => {
      const { result } = await renderApp();
      const v = result.current.vehicles![0];
      act(() => result.current.actions.buyNow(v));
      await waitFor(() => expect(result.current.bought[v.id]).toBe(true));
      act(() => result.current.actions.resetAll());
      await waitFor(() => expect(result.current.bought).toEqual({}));
    });
  });

  describe('cross-tab sync', () => {
    it('unions another tab\'s bought flags instead of overwriting them', async () => {
      const { result } = await renderApp();
      const v = result.current.vehicles![0];
      act(() => result.current.actions.buyNow(v));
      await waitFor(() => expect(result.current.bought[v.id]).toBe(true));

      // Simulate a `storage` event from another (older, stale) tab that
      // never saw this purchase — it must not un-purchase the lot here.
      const staleSnapshot = { bids: {}, watch: [], compare: [], feed: [], saved: [], bought: {} };
      act(() => {
        const evt = new StorageEvent('storage', {
          key: 'openlane-buyer-v2',
          newValue: JSON.stringify(staleSnapshot),
        });
        window.dispatchEvent(evt);
      });

      await waitFor(() => expect(result.current.bought[v.id]).toBe(true));
    });

    it('unions per-lot bidder records instead of overwriting the whole bids map', async () => {
      const { result } = await renderApp();
      const v = result.current.vehicles!.find((x) => x.id === 'live-1')!;
      act(() => result.current.actions.placeBid(v, v.base + 250, null));
      await waitFor(() => expect(result.current.bids[v.id]).toBeTruthy());
      const myId = result.current.ctx.myId;

      const incoming = {
        bids: { [v.id]: { OTHERTAB: { amount: v.base + 500, max: null, at: Date.now() } } },
        watch: [], compare: [], feed: [], saved: [], bought: {},
      };
      act(() => {
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'openlane-buyer-v2',
          newValue: JSON.stringify(incoming),
        }));
      });

      await waitFor(() => {
        expect(result.current.bids[v.id][myId]).toBeTruthy();
        expect(result.current.bids[v.id].OTHERTAB.amount).toBe(v.base + 500);
      });
    });

    it('honors a newer resetAt from another tab by clearing bids, unlike a normal sync', async () => {
      const { result } = await renderApp();
      const v = result.current.vehicles!.find((x) => x.id === 'live-1')!;
      act(() => result.current.actions.placeBid(v, v.base + 250, null));
      await waitFor(() => expect(result.current.bids[v.id]).toBeTruthy());

      // Another tab ran resetAll and its persistence effect wrote the
      // resulting empty state (with a fresh resetAt) back to localStorage.
      const resetSnapshot = {
        bids: {}, watch: [], compare: [], feed: [], saved: [], bought: {},
        resetAt: Date.now(),
      };
      act(() => {
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'openlane-buyer-v2',
          newValue: JSON.stringify(resetSnapshot),
        }));
      });

      await waitFor(() => expect(result.current.bids).toEqual({}));
    });
  });
});
