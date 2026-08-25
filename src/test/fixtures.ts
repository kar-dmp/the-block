// Shared test fixtures for the auction domain shape — one place to change
// when the Vehicle/ctx shape changes, instead of the ~9 files that used to
// hand-roll their own near-identical copies.

import type { AppCtx, Vehicle } from '../lib/types';

export const HOUR = 3600 * 1000;

/** A live lot by default (opened an hour ago, closes in an hour). */
export function makeVehicle(overrides: Partial<Vehicle> = {}): Vehicle {
  return {
    id: 'v1',
    lot: '100A',
    year: 2022,
    make: 'Honda',
    model: 'Civic',
    trim: 'LX',
    vin: 'VIN0001',
    city: 'Toronto',
    province: 'ON',
    selling_dealership: 'Dealer A',
    body_style: 'sedan',
    drivetrain: 'FWD',
    exterior_color: 'Blue',
    interior_color: 'Black',
    engine: '2.0L I4',
    transmission: 'automatic',
    fuel_type: 'gasoline',
    title_status: 'clean',
    odometer_km: 50000,
    condition_grade: 4.0,
    condition_report: 'Good condition.',
    damage_notes: [],
    images: ['a.jpg', 'b.jpg'],
    bid_count: 0,
    starting_bid: 9000,
    current_bid: null,
    reserve_price: null,
    buy_now_price: null,
    auction_start: new Date().toISOString(),
    runAt: Date.now() + HOUR,
    openAt: Date.now() - HOUR,
    base: 10000,
    ...overrides,
  };
}

export function makeCtx(overrides: Partial<AppCtx> = {}): AppCtx {
  return {
    bids: {},
    watch: [],
    compare: [],
    bought: {},
    myId: 'ME01',
    ...overrides,
  };
}
