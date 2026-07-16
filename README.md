<p align="center">
  <img src="docs/the_block_repo.png" alt="The Block challenge hero image" width="960" />
</p>

# Block Auto

A polished buyer-side vehicle auction prototype built for the OPENLANE coding challenge. Buyers can search and filter 200 wholesale vehicles, review detailed condition information, and place bids that are validated and persisted through a real backend.

## How to Run

### Prerequisites

- Node.js 20.9 or newer
- npm 10 or newer

### First-time setup

```bash
npm ci
npm run setup
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

`npm run setup` creates the local environment file and SQLite database, generates the Prisma client, applies the schema, and seeds all 200 supplied vehicles. Running `npm run db:seed` later resets the database to its original seeded state.

### Production build

```bash
npm run build
npm start
```

## What I Built

- A responsive buyer journey across inventory discovery, vehicle inspection, and bidding
- Debounced server-side search across vehicle, lot, location, VIN, and dealership data
- Filters for make, body style, province, title status, condition, saved vehicles, and buyer bid activity
- Independent sorting by auction time, price, year, mileage, or condition, with the nearest auctions first by default
- URL-synchronized, server-paginated inventory with defensive page normalization and direct page-number navigation
- Information-dense vehicle cards that prioritize imagery while surfacing auction status, price, condition, title, location, seller verification, saved state, and bid status
- Detail pages with responsive imagery, specifications, inspection findings, damage disclosures, dealership context, and buyer-safe reserve feedback
- Database-backed bidding with confirmation, immediate visible updates, auction-close enforcement, minimum-bid rules, and CAD $500 increments
- Optimistic concurrency protection that rejects stale or simultaneous bids rather than silently overwriting them
- Loading, empty, not-found, API-error, keyboard, reduced-motion, desktop, tablet, and mobile states

## Stack

- **Frontend:** Next.js App Router, React, TypeScript, Tailwind CSS, Material UI, and focused responsive CSS
- **Backend:** Next.js route handlers, service modules, Zod validation
- **Database:** SQLite with Prisma ORM
- **Testing:** Vitest plus a full HTTP smoke-test script

## Architecture

```text
app/
├── api/vehicles/             REST endpoints
├── vehicles/[id]/            Detail route
└── page.tsx                  Inventory experience
components/                   Buyer-facing React components
lib/
├── bidding.ts                Bid rules and transactional write
├── auction-time.ts           Auction status and timeframe formatting
├── saved-vehicles.ts         Resilient browser save-state store
├── vehicle-query.ts          Search, filters, sort, pagination
├── vehicle-mapper.ts         Buyer-safe API response mapping
└── prisma.ts                 Database client
prisma/schema.prisma          Relational data model
scripts/
├── init-db.mjs               Zero-config local database setup
├── seed.ts                   Dataset import and time normalization
├── smoke-test.mjs            End-to-end API verification
└── generate_vehicles.mjs     Development-only deterministic dataset generator
tests/                        Unit tests
```

`generate_vehicles.mjs` produced the supplied synthetic dataset and is not part of the application runtime. Setup and production code read the committed `data/vehicles.json` file directly.

The frontend and backend live in one repository because the challenge asks reviewers to clone and run one project. They remain logically separated: route handlers own the HTTP boundary, service modules own business rules, Prisma owns persistence, and React components own presentation.

## API

| Method | Endpoint | Purpose |
| --- | --- | --- |
| `GET` | `/api/health` | Database health check |
| `GET` | `/api/vehicles` | Search, filter, sort, and paginate inventory |
| `GET` | `/api/vehicles/:id` | Vehicle details and recent prototype bids |
| `POST` | `/api/vehicles/:id/bids` | Validate and persist a bid |

Inventory sorting uses separate `sortBy` and `sortDirection` query parameters. `sortBy` accepts `auction`, `price`, `year`, `odometer`, or `condition`; `sortDirection` accepts `asc` or `desc`. Omitting both returns the nearest upcoming auctions first (`auction` + `asc`).

The bid endpoint reloads the latest vehicle state inside a database transaction and conditionally updates the exact bid state the buyer reviewed. Invalid amounts return `400`; stale, concurrent, or insufficient bids return `409` with a clear retry message or the latest minimum.

## Notable Decisions

### SQLite for a local-first prototype

SQLite provides actual relational persistence and transactions without requiring a reviewer to install or configure a database server. It is a strong fit for a 200-vehicle prototype. Prisma keeps the schema and data-access layer portable; a production version would move to PostgreSQL with row-level locking and a durable event/audit pipeline.

### One full-stack Next.js repository

A separate frontend and backend repository would add clone, environment, CORS, and startup overhead without improving this prototype. Next.js route handlers provide a clear backend boundary while preserving a simple three-command setup.

### Tailwind CSS and Material UI together

Tailwind handles responsive layout, spacing, typography, and concise component composition. Material UI supplies robust interactive primitives such as selects, text fields, dialogs, buttons, and pagination, including keyboard behavior and focus management. A shared MUI theme keeps those controls visually aligned with the custom auction experience.

### Server-side discovery with durable URL state

Search, filters, sorting, counts, and pagination run through the inventory API instead of loading all 200 records into the browser. The active query is mirrored in the URL so a filtered view survives reloads and can be shared. Sort field and direction remain separate concepts, and the selected pagination item doubles as an explicitly labelled `Go to` number input; Enter commits direct navigation while the API clamps out-of-range pages safely.

### Auction-time normalization

The supplied auction dates are synthetic and fall in March–April 2026. At seed time, their relative spacing is preserved while the earliest auction is shifted to two hours after setup. Because the source only includes start times, each seeded auction receives a two-hour closing window. This keeps upcoming, live, ending-soon, and ended states demonstrable without modifying `data/vehicles.json`. The original timestamp is also retained in the database.

### Reserve-price privacy

The source data includes exact seller reserve prices. The buyer API intentionally returns only `no reserve`, `reserve met`, or `reserve not met`, which provides useful feedback without revealing seller-sensitive pricing.

### Server-owned bid rules

The UI guides buyers toward valid amounts, but the API remains the source of truth. The server requires whole-dollar bids, CAD $500 increments, an open auction, and either the starting price or at least $500 above the latest bid. An optimistic state check prevents simultaneous requests from silently overwriting one another.

### Buyer activity without authentication

This remains a single-buyer prototype. New `Bid` rows represent that buyer's activity, while seeded bid counts represent earlier marketplace history. The inventory API counts distinct vehicles with buyer bid records and compares the buyer's latest bid with the current bid to return `winning` or `outbid`. Saved vehicles are a browser convenience stored locally, so the heart state survives reloads without pretending that accounts or cross-device synchronization exist.

### Focused buyer scope

The supplied data includes optional Buy Now prices, but checkout and purchasing are explicitly outside the challenge scope. The UI therefore concentrates on one complete, trustworthy bid flow instead of presenting a prominent action that cannot be finished.

## Assumptions and Scope

- This is a single-buyer prototype; authentication, buyer accounts, and cross-device saved-vehicle synchronization are intentionally excluded.
- Seeded `bid_count` and `current_bid` values represent historical marketplace state. New bids receive individual `Bid` records.
- Bids are allowed before the normalized auction start as pre-bids and while the auction is live; the API rejects bids at or after the stored end time.
- The supplied dealership records do not include verification metadata. They are seeded as verified to match the challenge's existing marketplace-credential presentation, while the field remains explicit in the database and API.
- Buy Now data remains available in the database but is intentionally not presented as an unfinished buyer action.
- Vehicle images use the placeholder URLs included in the supplied dataset.
- Currency is displayed in Canadian dollars.

## Testing

Run all checks:

```bash
npm run verify
npm run test:smoke
npm audit --audit-level=moderate
```

The automated suite covers saved-vehicle state parsing and toggling, winning/outbid mapping, auction timing states, auction-close enforcement, minimum-bid calculation, stale-bid rejection, increment validation, pagination normalization, reserve-state privacy, seller verification mapping, and response mapping. The smoke test launches the production build, verifies the default earliest-auction order and reverse auction order, validates seller and auction-window metadata, verifies effective-price sorting, normalizes an out-of-range page, places a real bid, confirms the winning card state and activity count, validates Saved and My Bids server-side filters (including the empty-saved case), rejects a stale bid, and confirms that concurrent identical bids resolve as one success and one conflict. It resets the development database before exiting.

Current verified status:

- TypeScript: passing
- ESLint: passing
- Unit tests: 23 passing
- Production build: passing
- HTTP bid smoke test: passing
- npm audit: 0 vulnerabilities

The UI was also designed against desktop, tablet, and mobile breakpoints, with keyboard focus states, semantic labels, reduced-motion support, and mobile-specific filter and bidding layouts.

## Time Spent

Approximately four focused hours, prioritizing the core buyer journey first: data and bidding rules, inventory discovery, vehicle details, responsive polish, then tests and documentation.

## AI-Assisted Workflow

AI assistance was used to accelerate scaffolding, implementation, and review. Product decisions, scope, architecture, validation rules, and tradeoffs were evaluated explicitly rather than accepting generated output blindly. Compiler, lint, unit, production-build, and HTTP smoke-test feedback were used as independent checks.

## What I Would Do With More Time

- Add authenticated buyers, watchlists, and per-user bid history
- Use PostgreSQL with optimistic concurrency or row-level locking
- Broadcast competing bids through WebSockets
- Add anti-sniping extensions, winner settlement, and post-auction workflows
- Add Playwright coverage across desktop and mobile viewports
- Replace placeholder imagery with a production image pipeline
- Add transport estimates, fees, and richer inspection media
- Deploy the application with monitoring and structured audit logs
