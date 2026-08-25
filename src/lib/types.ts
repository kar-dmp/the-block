// Domain shapes shared across lib/, state/, components/, and screens/.

/** A lot exactly as it appears in public/data/vehicles.json. */
export interface RawVehicle {
  id: string;
  vin: string;
  year: number;
  make: string;
  model: string;
  trim: string;
  body_style: string;
  exterior_color: string;
  interior_color: string;
  engine: string;
  transmission: string;
  drivetrain: string;
  odometer_km: number;
  fuel_type: string;
  condition_grade: number;
  condition_report: string;
  damage_notes: string[];
  title_status: string;
  province: string;
  city: string;
  auction_start: string;
  starting_bid: number;
  reserve_price: number | null;
  buy_now_price: number | null;
  images: string[];
  selling_dealership: string;
  lot: string;
  current_bid: number | null;
  bid_count: number;
}

/** A RawVehicle after normalize() adds timing and the effective base price. */
export interface Vehicle extends RawVehicle {
  runAt: number;
  openAt: number;
  base: number;
}

export type LotStatus = 'live' | 'preview' | 'ended' | 'bought';

/** One bidder's standing bid on a lot. */
export interface BidRecord {
  amount: number;
  max: number | null;
  at: number;
}

/** lotId -> bidderId -> that bidder's record. */
export type Bids = Record<string, Record<string, BidRecord>>;

export interface FeedEntry {
  id: string;
  kind: string;
  title: string;
  text: string;
  at: number;
}

export interface Filters {
  makes: string[];
  bodies: string[];
  provs: string[];
  titles: string[];
  status: string[];
  yearMin: string;
  yearMax: string;
  priceMax: number;
  odoMax: number;
  gradeMin: number;
  damageFree: boolean;
  hasBuyNow: boolean;
  noReserve: boolean;
}

export interface SavedSearch {
  name: string;
  f: Filters;
  query: string;
}

/** The slice of app state that domain logic (lots.ts) needs to reason about a lot. */
export interface AppCtx {
  bids: Bids;
  watch: string[];
  compare: string[];
  bought: Record<string, boolean>;
  myId: string;
}

export interface AppState {
  bids: Bids;
  watch: string[];
  compare: string[];
  feed: FeedEntry[];
  saved: SavedSearch[];
  bought: Record<string, boolean>;
  resetAt?: number;
}

export interface StatusMeta {
  label: string;
  tag: string;
  color: string;
}

export interface ReserveStatus {
  tag: string;
  label: string;
}

export interface BidTag {
  tag: string;
  label: string;
}

export interface FacetOption {
  value: string;
  label: string;
  count: number;
  on: boolean;
}

export interface HistoryEntry {
  who: string;
  amount: string;
  value: number;
  when: string;
  mine: boolean;
}

/** Everything a list row or card needs, in display form (lots.ts's rowOf). */
export interface Row {
  id: string;
  lot: string;
  title: string;
  sub: string;
  odo: string;
  grade: string;
  gradeWord: string;
  gradeLabel: string;
  gradeColor: string;
  gradeTag: string;
  place: string;
  status: string;
  statusColor: string;
  countdown: string;
  bid: string;
  bidLabel: string;
  bidMeta: string;
  image: string;
  live: boolean;
  cta: string;
  watching: boolean;
  inCompare: boolean;
}

/** A row on the My bids screen (lots.ts's myBidRow). */
export interface MyBidRow {
  id: string;
  lot: string;
  title: string;
  sub: string;
  mine: string;
  mineValue: number;
  current: string;
  currentValue: number;
  winning: boolean;
  max: string;
  countdown: string;
  status: string;
  tag: string;
}

export interface PlaceBidOptions {
  auto?: boolean;
}

export interface AppActions {
  toggleWatch(v: Vehicle): void;
  toggleCompare(v: Vehicle): void;
  /** Returns an error string, or null on success. */
  placeBid(v: Vehicle, amount: number, max: number | null, opts?: PlaceBidOptions): string | null;
  buyNow(v: Vehicle): void;
  saveSearch(name: string, f: Filters, query: string): void;
  removeSearch(name: string): void;
  resetAll(): void;
}

/** The shape returned by useApp(). */
export interface AppContextValue {
  vehicles: Vehicle[] | null;
  loading: boolean;
  bids: Bids;
  watch: string[];
  compare: string[];
  feed: FeedEntry[];
  saved: SavedSearch[];
  bought: Record<string, boolean>;
  ctx: AppCtx;
  actions: AppActions;
  byId(id: string): Vehicle | undefined;
  toast: string;
  showToast(text: string): void;
  feedOpen: boolean;
  setFeedOpen: (open: boolean) => void;
}

/** Browse screen's parsed URL state (lots.ts's filtersFromSearchParams). */
export interface BrowseUrlState {
  query: string;
  sort: string;
  view: 'grid' | 'table';
  f: Filters;
}
