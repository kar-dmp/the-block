// First-load demo state: three bids (leading / outbid / closed) and two watched
// lots, so My bids and Watchlist have content without a scripted tour.

import { increment, money } from './format';
import { titleOf } from './lots';
import type { Bids, FeedEntry, Vehicle } from './types';

export function seedState(vehicles: Vehicle[], myId: string): { bids: Bids; feed: FeedEntry[]; watch: string[] } {
  const now = Date.now();
  const live = vehicles.filter((v) => v.openAt <= now && v.runAt > now && v.bid_count > 0);
  const ended = vehicles.filter((v) => v.runAt <= now && v.bid_count > 0);
  const bids: Bids = {};
  const feed: FeedEntry[] = [];
  const watch: string[] = [];

  const win = live[2];
  const out = live[7];
  const done = ended[1];

  if (win) {
    const mine = win.base + increment(win.base);
    bids[win.id] = { [myId]: { amount: mine, max: null, at: now - 5400000 } };
    feed.push({
      id: win.id, kind: 'Bid placed', title: titleOf(win),
      text: 'You lead at ' + money(mine), at: now - 5400000,
    });
  }
  if (out) {
    bids[out.id] = { [myId]: { amount: out.base - increment(out.base), max: null, at: now - 12600000 } };
    feed.push({
      id: out.id, kind: 'Outbid', title: titleOf(out),
      text: 'Another buyer bid ' + money(out.base), at: now - 9000000,
    });
  }
  if (done) {
    bids[done.id] = { [myId]: { amount: done.base, max: null, at: done.runAt - 600000 } };
    feed.push({
      id: done.id, kind: 'Lot closed', title: titleOf(done),
      text: 'Closed at ' + money(done.base), at: done.runAt,
    });
  }
  if (live[4]) watch.push(live[4].id);
  if (live[9]) watch.push(live[9].id);

  return { bids, feed, watch };
}
