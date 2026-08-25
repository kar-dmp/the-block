import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../state/AppContext';
import { useNow } from '../hooks/useNow';
import { titleOf, effBid, statusOf, statusMeta, reserveMet } from '../lib/lots';
import { money, km, cap, gradeBand, countdown, NOW_YEAR } from '../lib/format';
import type { Vehicle } from '../lib/types';
import s from './Screen.module.scss';

interface Cell {
  t: string;
  n?: number;
}

type CompareRow = [string, (v: Vehicle) => Cell, ('lo' | 'hi')?];

export default function Compare() {
  const { compare, byId, ctx, actions } = useApp();
  const now = useNow(15000);
  const navigate = useNavigate();
  const lots = compare.map(byId).filter((v): v is Vehicle => v != null);

  // Each row: a label, a cell renderer, and optionally which extreme wins the accent.
  const rows: CompareRow[] = [
    ['Current bid', (v) => ({ t: money(effBid(v, ctx)), n: effBid(v, ctx) }), 'lo'],
    ['Buy Now', (v) => ({ t: v.buy_now_price ? money(v.buy_now_price) : '—' })],
    ['Odometer', (v) => ({ t: km(v.odometer_km), n: v.odometer_km }), 'lo'],
    ['Per year', (v) => ({ t: km(Math.round(v.odometer_km / Math.max(1, NOW_YEAR - v.year + 1))) })],
    [
      'Condition grade',
      (v) => ({ t: `${v.condition_grade.toFixed(1)} ${gradeBand(v.condition_grade)}`, n: v.condition_grade }),
      'hi',
    ],
    [
      'Declared damage',
      (v) => ({
        t: v.damage_notes.length ? `${v.damage_notes.length} item${v.damage_notes.length > 1 ? 's' : ''}` : 'None',
        n: -v.damage_notes.length,
      }),
      'hi',
    ],
    ['Title', (v) => ({ t: cap(v.title_status) })],
    ['Model year', (v) => ({ t: String(v.year), n: v.year }), 'hi'],
    ['Powertrain', (v) => ({ t: `${v.engine} · ${v.drivetrain}` })],
    ['Transmission', (v) => ({ t: cap(v.transmission) })],
    ['Fuel', (v) => ({ t: cap(v.fuel_type) })],
    [
      'Reserve',
      (v) => {
        const met = reserveMet(v, effBid(v, ctx));
        return { t: met === null ? 'No reserve' : met ? 'Met' : 'Not met' };
      },
    ],
    ['Location', (v) => ({ t: `${v.city}, ${v.province}` })],
    ['Dealership', (v) => ({ t: v.selling_dealership })],
    [
      'Status',
      (v) => ({
        t:
          statusMeta(v, now, ctx).label +
          (statusOf(v, now, ctx) === 'live' ? ' · ' + countdown(v.runAt - now) : ''),
      }),
    ],
  ];

  const best = (values: (number | undefined)[], dir: 'lo' | 'hi'): number | null => {
    const nums = values.filter((n): n is number => n != null);
    if (!nums.length) return null;
    return dir === 'lo' ? Math.min(...nums) : Math.max(...nums);
  };

  return (
    <section className={s.screen} data-screen-label="Compare">
      <div className={`${s.head} ${s.ruled}`}>
        <h1>Compare lots</h1>
        <div className={s.sub}>
          {lots.length ? `${lots.length} of 3 slots used` : 'Add up to three lots from any list'}
        </div>
      </div>

      {lots.length > 0 && (
        <div className={s.scroll}>
          <table className="table" style={{ minWidth: 640 }}>
            <thead>
              <tr>
                <th style={{ width: 170 }}>Attribute</th>
                {lots.map((v) => (
                  <th key={v.id}>
                    <div
                      className={s.title}
                      style={{ textTransform: 'none', letterSpacing: 0, color: 'var(--color-text)', cursor: 'pointer' }}
                      onClick={() => navigate('/lot/' + v.id)}
                    >
                      {titleOf(v)}
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 3 }}>
                      <span className={s.rowSub}>Lot {v.lot}</span>
                      <span
                        style={{ fontSize: 11, color: 'var(--color-accent)', cursor: 'pointer' }}
                        onClick={() => actions.toggleCompare(v)}
                      >
                        Remove
                      </span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(([label, fn, dir]) => {
                const cells = lots.map(fn);
                const winner = dir ? best(cells.map((c) => c.n), dir) : null;
                return (
                  <tr key={label}>
                    <td className={s.lot} style={{ textTransform: 'uppercase', letterSpacing: '0.11em', fontSize: 10 }}>
                      {label}
                    </td>
                    {cells.map((c, i) => (
                      <td
                        key={i}
                        style={{
                          fontVariantNumeric: 'tabular-nums',
                          fontSize: 14,
                          color:
                            winner != null && c.n != null && c.n === winner
                              ? 'var(--color-accent-700)'
                              : 'var(--color-text)',
                        }}
                      >
                        {c.t}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {lots.length === 0 && (
        <div className={s.empty}>
          <h3>Pick up to three lots to compare</h3>
          <p>
            Use the compare button on any lot card or detail page. Side-by-side works best on lots of the
            same model year and body style.
          </p>
          <Link className="btn btn-primary" to="/">Browse inventory</Link>
        </div>
      )}
    </section>
  );
}
