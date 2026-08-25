import {
  createContext, useContext, useCallback, useEffect, useMemo, useReducer, useRef, useState,
  type ReactNode,
} from 'react';
import { normalize, titleOf, effBid, minNext, statusOf, reserveMet, isWinning } from '../lib/lots';
import { seedState } from '../lib/seed';
import { increment, money, toggleIn } from '../lib/format';
import type {
  AppContextValue, AppState, FeedEntry, Filters, RawVehicle, Vehicle,
} from '../lib/types';

// v2: bid records became per-bidder ({ [bidderId]: { amount, max, at } }) for
// cross-tab bidding — bump the key so old-shape stored state isn't parsed.
const KEY = 'openlane-buyer-v2';
const BIDDER_KEY = 'openlane-buyer-bidder-id';
// The sale's timing anchor (see normalize()'s anchorAt) — persisted so lots
// keep closing in real time across reloads instead of the whole schedule
// rewinding to "26h ago" on every visit. Only "Reset all prototype state"
// clears it, which is the deliberate way to get a fresh sale window.
const ANCHOR_KEY = 'openlane-buyer-anchor';
const EMPTY: AppState = { bids: {}, watch: [], compare: [], feed: [], saved: [], bought: {} };

type Action =
  | { type: 'merge'; payload: Partial<AppState> }
  | {
      type: 'placeBid';
      payload: { lotId: string; bidderId: string; amount: number; max: number | null; feedEntry: Omit<FeedEntry, 'at'> };
    }
  | { type: 'sync'; payload: AppState }
  | { type: 'reset' };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'merge':
      return { ...state, ...action.payload };
    case 'placeBid': {
      // Applied against the reducer's own current state (not a snapshot
      // captured at dispatch time), so multiple bids dispatched in the same
      // tick — e.g. the proxy auto-bid effect re-bidding several lots at
      // once — each land on top of the last instead of one clobbering
      // another's `bids` update.
      const { lotId, bidderId, amount, max, feedEntry } = action.payload;
      const lotBids = state.bids[lotId] || {};
      return {
        ...state,
        bids: { ...state.bids, [lotId]: { ...lotBids, [bidderId]: { amount, max, at: Date.now() } } },
        feed: [{ ...feedEntry, at: Date.now() }, ...state.feed].slice(0, 60),
      };
    }
    case 'sync': {
      // Incoming state from another tab: union each lot's per-bidder records
      // instead of overwriting, so two tabs bidding at once can't clobber
      // each other's in-flight record for the same lot. `bought` is unioned
      // too — a purchase is one-way, so a tab must never un-purchase a lot
      // just because it's syncing an older snapshot from another tab.
      const incoming = action.payload;
      // ...except a reset is a deliberate wipe, not an incremental update —
      // a newer resetAt from another tab overrides the union-merge above so
      // clicking "Reset all" in one tab actually clears every open tab.
      if (incoming.resetAt && incoming.resetAt > (state.resetAt || 0)) {
        return { ...EMPTY, ...incoming };
      }
      const bids = { ...state.bids };
      for (const lotId of Object.keys(incoming.bids || {})) {
        bids[lotId] = { ...(bids[lotId] || {}), ...incoming.bids[lotId] };
      }
      const bought = { ...state.bought, ...incoming.bought };
      return { ...state, ...incoming, bids, bought };
    }
    case 'reset':
      return { ...EMPTY, resetAt: Date.now() };
    default:
      return state;
  }
}

function getSaleAnchor(): number {
  const stored = Number(localStorage.getItem(ANCHOR_KEY));
  if (stored) return stored;
  const anchor = Date.now() - 26 * 3600 * 1000;
  try {
    localStorage.setItem(ANCHOR_KEY, String(anchor));
  } catch {
    /* storage unavailable — anchor just won't persist across reloads */
  }
  return anchor;
}

function getBidderId(): string {
  let id = sessionStorage.getItem(BIDDER_KEY);
  if (!id) {
    id = Math.random().toString(36).slice(2, 6).toUpperCase();
    sessionStorage.setItem(BIDDER_KEY, id);
  }
  return id;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within an AppProvider');
  return ctx;
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [vehicles, setVehicles] = useState<Vehicle[] | null>(null);
  const [state, dispatch] = useReducer(reducer, EMPTY);
  const [toast, setToast] = useState('');
  const [feedOpen, setFeedOpen] = useState(false);
  const hydrated = useRef(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [myId] = useState(getBidderId);

  // Load the sale, normalize its timestamps, then hydrate or seed.
  useEffect(() => {
    let alive = true;
    fetch(import.meta.env.BASE_URL + 'data/vehicles.json')
      .then((r) => r.json())
      .then((raw: RawVehicle[]) => {
        if (!alive) return;
        const vs = normalize(raw, getSaleAnchor());
        setVehicles(vs);
        let stored: Partial<AppState> | null = null;
        try {
          stored = JSON.parse(localStorage.getItem(KEY) || 'null');
        } catch {
          stored = null;
        }
        dispatch({ type: 'merge', payload: stored || seedState(vs, myId) });
        hydrated.current = true;
      })
      .catch(() => setVehicles([]));
    return () => {
      alive = false;
    };
  }, [myId]);

  useEffect(() => {
    if (!hydrated.current) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* storage unavailable — prototype state is disposable */
    }
  }, [state]);

  // Other tabs bidding on the same origin write to the same localStorage key;
  // this fires only in THOSE tabs' listeners, so pick up their bids here.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== KEY || !e.newValue) return;
      try {
        dispatch({ type: 'sync', payload: JSON.parse(e.newValue) });
      } catch {
        /* ignore a malformed write from another tab */
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const showToast = useCallback((text: string) => {
    setToast(text);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 3200);
  }, []);

  const byId = useCallback((id: string) => (vehicles || []).find((v) => v.id === id), [vehicles]);

  const ctx = useMemo(
    () => ({ bids: state.bids, watch: state.watch, compare: state.compare, bought: state.bought, myId }),
    [state.bids, state.watch, state.compare, state.bought, myId]
  );

  const actions = useMemo(() => {
    const noteFeed = (entry: Omit<FeedEntry, 'at'>): FeedEntry[] =>
      [{ ...entry, at: Date.now() }, ...state.feed].slice(0, 60);

    return {
      toggleWatch(v: Vehicle) {
        const on = !state.watch.includes(v.id);
        dispatch({
          type: 'merge',
          payload: {
            watch: toggleIn(state.watch, v.id),
            feed: noteFeed({
              id: v.id,
              kind: on ? 'Watching' : 'Removed',
              title: titleOf(v),
              text: on ? 'Added to your watchlist' : 'Removed from your watchlist',
            }),
          },
        });
        showToast(on ? `Lot ${v.lot} added to watchlist` : `Lot ${v.lot} removed`);
      },

      toggleCompare(v: Vehicle) {
        const has = state.compare.includes(v.id);
        if (!has && state.compare.length >= 3) {
          showToast('Compare holds three lots — remove one first');
          return;
        }
        dispatch({ type: 'merge', payload: { compare: toggleIn(state.compare, v.id) } });
        showToast(has ? 'Removed from compare' : `Lot ${v.lot} added to compare`);
      },

      /** Returns an error string, or null on success. */
      placeBid(v: Vehicle, amount: number, max: number | null, opts: { auto?: boolean } = {}) {
        const min = minNext(v, ctx);
        if (!amount || Number.isNaN(amount)) return 'Enter a bid amount.';
        if (amount < min)
          return `Minimum next bid is ${money(min)} (${money(increment(effBid(v, ctx)))} increment).`;
        const prevMine = state.bids[v.id]?.[myId];
        const met = reserveMet(v, amount) !== false;
        dispatch({
          type: 'placeBid',
          payload: {
            lotId: v.id,
            bidderId: myId,
            amount,
            max: max ?? prevMine?.max ?? null,
            feedEntry: {
              id: v.id,
              kind: 'Bid placed',
              title: titleOf(v),
              text: `${opts.auto ? 'Auto-bid raised you' : 'You lead'} to ${money(amount)}${met ? ' · reserve met' : ' · reserve not met'}`,
            },
          },
        });
        showToast(
          opts.auto
            ? `Auto-bid: you're back in the lead at ${money(amount)} on lot ${v.lot}`
            : `Bid of ${money(amount)} placed on lot ${v.lot}`
        );
        return null;
      },

      buyNow(v: Vehicle) {
        dispatch({
          type: 'merge',
          payload: {
            bought: { ...state.bought, [v.id]: true },
            feed: noteFeed({
              id: v.id,
              kind: 'Purchased',
              title: titleOf(v),
              text: `Buy Now at ${money(v.buy_now_price)}`,
            }),
          },
        });
        showToast(`Lot ${v.lot} purchased at ${money(v.buy_now_price)}`);
      },

      saveSearch(name: string, f: Filters, query: string) {
        dispatch({
          type: 'merge',
          payload: { saved: [...state.saved.filter((x) => x.name !== name), { name, f, query }] },
        });
        showToast('Search saved');
      },

      removeSearch(name: string) {
        dispatch({ type: 'merge', payload: { saved: state.saved.filter((x) => x.name !== name) } });
      },

      resetAll() {
        try {
          localStorage.removeItem(KEY);
          // Also restart the sale window — otherwise lots that closed
          // during this session stay closed forever instead of the
          // prototype looking freshly seeded again.
          localStorage.removeItem(ANCHOR_KEY);
        } catch {
          /* ignore */
        }
        dispatch({ type: 'reset' });
        showToast('Prototype state cleared');
      },
    };
  }, [state, ctx, showToast, myId]);

  // Proxy auto-bidding: if another tab — a different bidder — takes the lead
  // on a lot where this tab set a max, re-bid up to that ceiling automatically.
  // This is what makes the "maximum autobid" ceiling actually mean something
  // once a second tab is competing on the same lot.
  useEffect(() => {
    if (!vehicles) return;
    // Only the handful of lots this bidder has a max set on are candidates —
    // no need to walk the whole sale to find them.
    for (const [lotId, lotBids] of Object.entries(state.bids)) {
      const mine = lotBids[myId];
      if (!mine || !mine.max) continue;
      const v = byId(lotId);
      if (!v || statusOf(v, Date.now(), ctx) !== 'live') continue;
      const cur = effBid(v, ctx);
      if (isWinning(mine, cur)) continue;
      const need = minNext(v, ctx);
      if (mine.max < need) continue;
      actions.placeBid(v, need, mine.max, { auto: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.bids, vehicles]);

  const value: AppContextValue = {
    vehicles,
    loading: vehicles == null,
    ...state,
    ctx,
    actions,
    byId,
    toast,
    showToast,
    feedOpen,
    setFeedOpen,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
