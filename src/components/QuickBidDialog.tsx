import { Link } from 'react-router-dom';
import { useApp } from '../state/AppContext';
import { useNow } from '../hooks/useNow';
import { titleOf, statusOf, effBid, myBid, reserveStatus, mineBidTag, minNext } from '../lib/lots';
import { money, buyFee } from '../lib/format';
import BidForm from './BidForm';
import s from './QuickBidDialog.module.scss';

/** Place a bid without leaving the inventory page — the same BidForm as
 * the lot detail page, condensed into a dialog. Looks up its own lot record
 * from `id` so the inventory card that opens it doesn't need to subscribe
 * to the whole app context just to resolve one vehicle. */
export default function QuickBidDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const { byId, ctx } = useApp();
  const now = useNow(1000);
  const v = byId(id);
  if (!v) return null;

  const canBid = statusOf(v, now, ctx) === 'live';
  const cur = effBid(v, ctx);
  const min = minNext(v, ctx);
  const mine = myBid(v, ctx);
  const reserve = reserveStatus(v, cur);
  const mineTag = mine ? mineBidTag(mine, cur) : null;

  return (
    <div className="dialog-backdrop" style={{ zIndex: 80 }}>
      <div className="dialog">
        <div className="dialog-title">{titleOf(v)}</div>
        <div className="dialog-body">
          <div className={s.row}>
            <span>{mine ? 'Current bid' : 'Starting bid'}</span>
            <strong className={s.amount}>{money(cur)}</strong>
          </div>
          <div className={s.tags}>
            <span className={`tag ${reserve.tag}`}>{reserve.label}</span>
            {mineTag && <span className={`tag ${mineTag.tag}`}>{mineTag.label}</span>}
          </div>

          {canBid ? (
            <>
              <BidForm v={v} now={now} onPlaced={onClose} />
              <div className={s.note}>
                Estimated buy fee at {money(min)} is{' '}
                <span className={s.noteAccent}>{money(buyFee(min))}</span>, excluded from the bid.
              </div>
            </>
          ) : (
            <div className={s.closed}>This lot has stopped taking bids.</div>
          )}
        </div>
        <div className="dialog-actions">
          <Link className="btn btn-ghost" to={'/lot/' + v.id}>Full lot details</Link>
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
