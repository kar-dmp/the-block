import { useEffect, useState } from 'react';
import { useApp } from '../state/AppContext';
import { effBid, minNext, myBid } from '../lib/lots';
import { money, increment } from '../lib/format';
import type { Vehicle } from '../lib/types';
import s from './BidForm.module.scss';

const ARM_MS = 10000;

/**
 * Quick +$ buttons, an amount field, and a two-stage "confirm — can't be
 * withdrawn" submit. Shared by the lot detail page and the inventory card's
 * quick-bid dialog so the bidding mechanics only exist in one place.
 * `now` is the caller's own clock, so a page with several BidForms (or one
 * that already ticks its own countdown) doesn't spin up a redundant timer.
 */
export default function BidForm({
  v,
  now,
  size,
  onPlaced,
}: {
  v: Vehicle;
  now: number;
  size?: 'lg';
  onPlaced?: () => void;
}) {
  const { ctx, actions } = useApp();

  const [bidInput, setBidInput] = useState('');
  const [error, setError] = useState('');
  const [armedUntil, setArmedUntil] = useState<number | null>(null);

  const cur = effBid(v, ctx);
  const inc = increment(cur);
  const min = minNext(v, ctx);
  const mine = myBid(v, ctx);
  const inputClassName = size === 'lg' ? s.inputLg : '';
  const buttonClassName = size === 'lg' ? s.buttonLg : '';

  useEffect(() => {
    setBidInput(String(min));
    setError('');
    setArmedUntil(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v.id, mine?.amount]);

  const bidArmed = armedUntil != null && now < armedUntil;
  const armSecondsLeft = bidArmed ? Math.max(1, Math.ceil((armedUntil! - now) / 1000)) : 0;
  const disarm = () => setArmedUntil(null);

  return (
    <>
      <div className={s.quick}>
        {[1, 2, 5].map((m) => (
          <button
            key={m}
            className="btn btn-secondary"
            onClick={() => {
              setBidInput(String(cur + inc * m));
              setError('');
              disarm();
            }}
          >
            +{money(inc * m).slice(1)}
          </button>
        ))}
      </div>
      <div className="field">
        <label htmlFor={`bid-${v.id}`}>Your bid — {money(min)} minimum</label>
        <input
          id={`bid-${v.id}`}
          className={`input ${inputClassName}`}
          type="number"
          value={bidInput}
          placeholder={String(min)}
          onChange={(e) => {
            setBidInput(e.target.value);
            setError('');
            disarm();
          }}
        />
      </div>
      {error && <div className={s.error}>{error}</div>}
      <button
        className={`btn btn-primary btn-block ${buttonClassName}${bidArmed ? ' ' + s.confirmArmed : ''}`}
        onClick={() => {
          if (!bidArmed) {
            setArmedUntil(Date.now() + ARM_MS);
            return;
          }
          setArmedUntil(null);
          const err = actions.placeBid(v, Number(bidInput), null);
          setError(err || '');
          if (!err) onPlaced?.();
        }}
      >
        {bidArmed ? `Confirm ${money(Number(bidInput) || 0)} — can't be withdrawn` : 'Place bid'}
      </button>
      {bidArmed && (
        <button className="btn btn-ghost" onClick={disarm} style={{ marginTop: 4 }}>
          Cancel in {armSecondsLeft}s
        </button>
      )}
    </>
  );
}
