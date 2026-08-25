import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../state/AppContext';
import { useNow } from '../hooks/useNow';
import { myBidRow } from '../lib/lots';
import { money } from '../lib/format';
import type { Vehicle } from '../lib/types';
import s from './Screen.module.scss';

export default function MyBids() {
  const { bids, byId, ctx } = useApp();
  const now = useNow(15000);
  const navigate = useNavigate();

  const myLots = Object.keys(bids).filter((id) => bids[id]?.[ctx.myId]);

  const rows = myLots
    .map(byId)
    .filter((v): v is Vehicle => v != null)
    .map((v) => myBidRow(v, now, ctx))
    .sort((a, b) => a.lot.localeCompare(b.lot));

  const leading = rows.filter((r) => r.status === 'High bidder').length;
  const outbid = rows.filter((r) => r.status === 'Outbid').length;
  // "High bidder" already means winning on a still-live lot, so live exposure
  // is a straight sum over the rows already built — no need to re-walk the
  // vehicles and re-derive winning/live from scratch.
  const exposure = rows
    .filter((r) => r.status === 'High bidder')
    .reduce((a, r) => a + r.mineValue, 0);

  const stats: [string, string, boolean][] = [
    ['Active bids', String(rows.filter((r) => r.status === 'High bidder' || r.status === 'Outbid').length), false],
    ['High bidder', String(leading), false],
    ['Outbid', String(outbid), outbid > 0],
    ['Live exposure', money(exposure), false],
  ];

  return (
    <section className={s.screen} data-screen-label="My bids">
      <div className={s.head}>
        <h1>My bids</h1>
        <div className={s.sub}>
          {rows.length ? `${rows.length} lots · ${leading} leading · ${outbid} outbid` : 'No bids placed yet'}
        </div>
      </div>

      <dl className={s.stats}>
        {stats.map(([k, v, alert]) => (
          <div key={k} className={s.stat}>
            <dt>{k}</dt>
            <dd className={alert ? s.alert : undefined}>{v}</dd>
          </div>
        ))}
      </dl>

      {rows.length > 0 && (
        <div className={s.scroll}>
          <table className={`table ${s.table}`}>
            <thead>
              <tr>
                <th style={{ width: 74 }}>Lot</th>
                <th>Vehicle</th>
                <th style={{ textAlign: 'right' }}>My bid</th>
                <th style={{ textAlign: 'right' }}>Current bid</th>
                <th style={{ width: 120 }}>Max autobid</th>
                <th style={{ width: 150 }}>Closes</th>
                <th style={{ width: 130 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className={s.row} onClick={() => navigate('/lot/' + r.id)}>
                  <td className={s.lot}>{r.lot}</td>
                  <td>
                    <div className={s.title}>{r.title}</div>
                    <div className={s.rowSub}>{r.sub}</div>
                  </td>
                  <td className={s.right}>{r.mine}</td>
                  <td className={s.strong}>{r.current}</td>
                  <td className={s.small}>{r.max}</td>
                  <td className={s.small}>{r.countdown}</td>
                  <td><span className={`tag ${r.tag}`}>{r.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {rows.length === 0 && (
        <div className={s.empty}>
          <h3>You haven't bid yet</h3>
          <p>Open any live lot and place a bid — it will appear here with its status.</p>
          <Link className="btn btn-primary" to="/">Browse inventory</Link>
        </div>
      )}
    </section>
  );
}
