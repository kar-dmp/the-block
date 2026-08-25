import type { ReactNode } from 'react';
import { useApp } from '../state/AppContext';
import s from './Notes.module.scss';

const NOTES: [string, ReactNode][] = [
  [
    'Auction timing is normalized to now',
    <>
      The dataset's <code>auction_start</code> values sit in a fixed week (31 Mar – 6 Apr 2026). The whole
      window is shifted by a constant so the sale straddles the current moment: earlier lots have already
      run, most are open for bidding, later lots are still in preview. Relative order and spacing between
      lots is preserved exactly.
    </>,
  ],
  [
    'Three lot states',
    <>
      <strong>Preview</strong> — the lot is listed but bidding opens 72 hours before it runs.{' '}
      <strong>Live</strong> — bidding is open and closes at the run time. <strong>Ended</strong> — closed,
      shown as sold if the last bid met reserve, otherwise no sale. Wholesale lanes work on a timed close,
      so a single countdown to the run time is the honest reading of one timestamp per lot.
    </>,
  ],
  [
    'Reserve is a signal, not a number',
    <>
      Sellers do not publish reserves, so the lot shows only <em>reserve met</em> or{' '}
      <em>reserve not met</em>. 140 of 200 lots carry a reserve; the remaining 60 are marked no reserve,
      which is genuinely useful information for a buyer sorting a run list.
    </>,
  ],
  [
    'Bid increments',
    <>
      Minimum increments scale with price: $100 below $10,000, $250 below $25,000, $500 above. Quick-bid
      buttons offer one, two and five increments. Maximum autobid stores a ceiling and places the minimum
      next bid on your behalf — with no competing bidders simulated in this prototype, it holds the ceiling
      and reports it.
    </>,
  ],
  [
    'Damage notes are classified',
    <>
      The 30 distinct damage strings in the dataset are sorted into cosmetic, mechanical and structural.
      That distinction drives what a wholesale buyer actually decides — a scratched bumper and a repaired
      frame do not belong in the same list. Structural findings and salvage or rebuilt titles raise a flag
      on the detail page.
    </>,
  ],
  [
    'Odometer is read against expected use',
    <>
      Kilometres per year is computed from model year and compared with a 20,000 km/year Canadian average,
      so a 2019 lot at 126,000 km reads as above average rather than as a bare number.
    </>,
  ],
  [
    'Comparable lots',
    <>
      Each detail page finds other lots of the same make and model in the sale and shows the median current
      bid plus this lot's position against it. It is a within-sale comparison from the 200-row dataset, not
      market valuation data.
    </>,
  ],
  [
    'Seeded bidding history',
    <>
      Per-lot bid history is generated deterministically from each lot's <code>bid_count</code> and{' '}
      <code>current_bid</code>, descending in valid increments with anonymized bidder tags — real
      marketplaces show anonymized activity, and the dataset carries a count but no ledger. Three bids are
      pre-seeded for the demo buyer so My bids has content on first load: one winning, one outbid, one on a
      closed lot.
    </>,
  ],
  [
    'Left out on purpose',
    <>
      No authentication, no checkout or transport booking, no seller or admin tooling, no arbitration flow.
      Buy Now confirms and marks the lot purchased without moving into payment. State lives in the browser
      and resets on request.
    </>,
  ],
];

export default function Notes() {
  const { actions } = useApp();
  return (
    <section className={s.screen} data-screen-label="Notes">
      <div className={s.head}>
        <h1>Product notes and assumptions</h1>
        <div className={s.sub}>Decisions made while interpreting the dataset and the brief.</div>
      </div>

      {NOTES.map(([title, body]) => (
        <article key={title} className={s.note}>
          <h4>{title}</h4>
          <p>{body}</p>
        </article>
      ))}

      <div className="hr" />
      <button className="btn btn-secondary" onClick={actions.resetAll}>Reset all prototype state</button>
    </section>
  );
}
