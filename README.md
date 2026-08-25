# OPENLANE — Buyer auction platform (Prototype)

## How to Run

```bash
cd openlane-buyer
yarn install
yarn dev                # http://localhost:5173
yarn build               # typecheck, then static output in dist/
yarn typecheck           # tsc --noEmit
yarn test                # run the test suite once
yarn test:coverage       # run with coverage report
```

## Time Spent

- Roughly 7 hours across two sessions:
  - **2 hour** — used Claude Design to mock and visualize features and business flows
  - **2 hours** — set up the repo, read through the UI design, and went through
    the features to add necessary additions (e.g. two-stage bid confirmation,
    filters persisted into URL parameters)
  - **2 hours** — unit tests and manual testing to verify all features work
    properly, fixing bugs found along the way
  - **1 hour** — final review and documentation updates

## Assumptions and Scope

- **Included**:
  - Full buyer flow: browse, filter/sort/search, lot detail, bidding with
    proxy/max bids, watchlist, compare, saved searches, activity feed, Buy Now
  - A same-browser multi-tab bidding simulation
  - A Vitest suite with coverage thresholds
- **Skipped**:
  - Auth, checkout, transport, seller/admin tooling, arbitration
  - Any real networked multiplayer bidding — see [Not implemented](#not-implemented)
- **Simplified**:
  - No backend — state lives in `localStorage`/`sessionStorage`, seeded from
    one static `vehicles.json` (200 lots)
  - Rival bidding is simulated across browser tabs rather than over a network
    (see **Bidder identity is per-tab, not per-browser** under
    [Notable Decisions](#notable-decisions))

## Stack

**Frontend:** React 18, TypeScript (strict), Vite, React Router, SCSS modules
**Backend:** none — static SPA, no server or API routes
**Database:** none — `localStorage`/`sessionStorage`, seeded from `public/data/vehicles.json`

### Why not Next.js

Nothing here needs a server: no authentication, no API routes, no SEO surface, no data
fetching beyond one static JSON file, and all state is per-browser. Vite starts in under a
second and `yarn build` produces a static bundle any host will serve. Next.js would add a
framework, a server runtime, and a routing convention without changing a single screen. If this
graduated to a real product — server-side inventory search, authenticated buyers, SSR for
public lot pages — that is the point to reconsider.

## What I Built

A buyer-side wholesale vehicle auction prototype, all persisted client-side:

- Browse/filter/search 200 seeded lots
- View a lot detail page
- Place proxy (max) bids with a two-stage confirm
- Buy Now
- Watch/compare lots
- Save searches
- Follow an activity feed
- Product notes and assumptions (prototype only), with a button to reset all
  prototype state
- A same-browser multi-tab simulation lets one lot be bid on by "different"
  bidders (one per tab) to exercise outbid/proxy-bid UI without a backend

### Structure

```text
src/
  main.tsx                  React root, router, provider, global CSS
  App.tsx                   shell + route table
  vite-env.d.ts             Vite/CSS-module ambient types
  styles/
    modernist.css          design-system tokens & component classes
    _mixins.scss           SCSS mixins: labels, headings, tabular numerals, breakpoints
    global.scss            resets, link colors
  lib/
    types.ts                shared domain types: Vehicle, BidRecord, Filters, AppContextValue, …
    format.ts               money/km/countdown, bid increments, grade bands, damage classes, fees
    lots.ts                 lot state, effective bid, filter/sort, row + history derivation
    seed.ts                 first-load demo state (3 bids, 2 watched lots)
  hooks/
    useNow.ts               interval clock (lists 15s, detail 1s)
  state/
    AppContext.tsx           store: bids, watch, compare, feed, saved searches, purchases
  components/
    Header, BottomNav, Toast, ActivityDrawer, FilterPanel, LotTable, LotCard, Icon
    BidForm                 shared quick-bid + confirm UI (detail page and quick-bid dialog)
    QuickBidDialog           place a bid from an inventory card without leaving Browse
  screens/
    Browse, Detail, MyBids, Watchlist, Compare, Notes
public/data/vehicles.json  200 lots, 15 makes, 7 provinces
```

## Notable Decisions

**Two design-system layers, deliberately separated.** `styles/modernist.css` carries
every color, font, spacing token, and shared component class (`.btn`/`.input`/`.table`/
`.tag`/`.card`/`.dialog`/`.seg`); each `*.module.scss` only positions things and
references `var(--color-*)`/`var(--space-*)`/`var(--font-*)`. Retuning a token (e.g.
`--radius-sm/md/lg`) changes every consumer at once instead of chasing re-declared
values across modules.

**One context + reducer for all state** (`useApp()`), persisted to `localStorage`
under `openlane-buyer-v2`: `bids`, `watch`, `compare`, `feed`, `saved`, `bought`.
Filter state stays local to `Browse` until a search is explicitly saved — the store
isn't a dumping ground for transient UI state.

**Browse state lives in the URL.** Search text, sort, view (grid/table), and every
filter field are serialized to query params and kept in sync via `useSearchParams`,
each change replacing the current history entry rather than pushing a new one — so
the inventory view is back/forward-able, refresh-safe, and shareable, without a
Back-press per keystroke.

**Bidder identity is per-tab, not per-browser.** Each tab gets its own short bidder
id (`sessionStorage`); a `storage` event listener merges bids from other same-origin
tabs live, and a max/proxy bid auto-re-bids when outbid by another tab. This makes
outbid/proxy-bid UI exercisable without a backend, at the cost of being a same-browser
simulation rather than real networked multiplayer.

**Bid confirmation is two-stage, not modal**, for the common case: the button arms
into `Confirm $X — can't be withdrawn` with a 10s countdown before submitting. Buy
Now, a rarer and larger commitment, keeps a full modal instead.

**Domain rules ported verbatim** from the original HTML prototype (all in `lib/`):
timestamp normalization so the fixed dataset week straddles "now," lot state
(`preview` → `live` → `ended`, plus `bought`), bid increment tiers, damage
classification, odometer-per-year read, comparables (same make+model, median bid),
and deterministic bid history generation (FNV-1a hash) from `bid_count`.

## Testing

Vitest + React Testing Library + jsdom. `lib/format.ts`, `lib/lots.ts`, and `lib/seed.ts`
run under the plain `node` environment (`// @vitest-environment node`) since they're
pure functions with no DOM; everything else runs under jsdom. Shared fixtures
(`makeVehicle`, `makeCtx`, `HOUR`) live in `src/test/fixtures.ts`. Component/screen
tests mock `useApp()` directly (cast through `AppContextValue` since most tests only
stub the slice of the store their component reads); `AppContext.test.tsx` is the
exception — it renders the real `AppProvider` to exercise hydration, persistence, and
the reducer (including the cross-tab sync and concurrent-bid race fixes).

```bash
yarn test                # run once
yarn test:watch          # watch mode
yarn test:coverage       # run with a coverage report (text + html + lcov, in coverage/)
```

Coverage thresholds are set in `vite.config.ts` (`test.coverage.thresholds`) as a
**regression floor**, not an aspirational target — they sit at or below what the
suite already covers, so `test:coverage` fails on a drop, not on pre-existing gaps:

| metric | threshold | current |
| --- | --- | --- |
| statements | 85% | ~88.6% |
| branches | 75% | ~79.7% |
| functions | 85% | ~89.8% |
| lines | 90% | ~93% |

`Browse.tsx` and `FilterPanel.tsx` are the weakest-covered files today (saved-search
apply, pagination, and the individual filter controls aren't all exercised) — the
numbers above have room before the thresholds would need raising.

## What I'd Do With More Time

- Raise coverage on `Browse.tsx` and `FilterPanel.tsx` (saved-search apply, pagination,
  individual filter controls) rather than just holding the regression floor.
- Replace the local/session-storage state with a real backend once there's a case for
  server-side inventory search, authenticated buyers, or SSR on public lot pages —
  see [Why not Next.js](#why-not-nextjs).
- Real networked multiplayer bidding instead of the same-browser multi-tab simulation.
- Auth, checkout, transport, and seller/admin tooling — currently entirely out of scope,
  see [Not implemented](#not-implemented).

## Not implemented

No auth, checkout, transport, seller or admin tooling, arbitration. Rival bidding only exists as
a same-browser, multi-tab simulation (see **Bidder identity and cross-tab bidding** above) — there
is no networked multiplayer. Prototype state resets from the Notes screen.
