import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useApp } from '../state/AppContext';
import { useNow } from '../hooks/useNow';
import {
  titleOf, statusOf, statusMeta, effBid, effCount, minNext, buildHistory, usage, myBid,
  reserveStatus, reserveMet, mineBidTag,
} from '../lib/lots';
import {
  money, km, cap, bidsWord, increment, gradeBand, buyFee, countdown, median,
  damageKind, damageTag, DAMAGE_ORDER, runTimeLabel,
} from '../lib/format';
import Icon from '../components/Icon';
import BidForm from '../components/BidForm';
import s from './Detail.module.scss';

export default function Detail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { vehicles, loading, ctx, actions } = useApp();
  const now = useNow(1000);

  const [imageIndex, setImageIndex] = useState(0);
  const [maxInput, setMaxInput] = useState('');
  const [maxError, setMaxError] = useState('');
  const [buyOpen, setBuyOpen] = useState(false);

  const v = vehicles?.find((x) => x.id === id);

  useEffect(() => {
    window.scrollTo(0, 0);
    setImageIndex(0);
    setMaxInput('');
    setMaxError('');
  }, [id]);

  // These don't depend on `now`, so the 1s countdown tick shouldn't
  // re-filter the sale or re-sort damage notes on every render.
  const damage = useMemo(
    () =>
      v
        ? v.damage_notes
            .map((text) => ({ text, kind: damageKind(text) }))
            .sort((a, b) => DAMAGE_ORDER[a.kind] - DAMAGE_ORDER[b.kind])
        : [],
    [v]
  );
  const comps = useMemo(
    () => (v && vehicles ? vehicles.filter((x) => x.id !== v.id && x.make === v.make && x.model === v.model) : []),
    [vehicles, v]
  );
  const med = useMemo(() => median(comps.map((c) => effBid(c, ctx))), [comps, ctx]);

  if (loading) return <div style={{ padding: '40px 0' }}>Loading lot…</div>;
  if (!v)
    return (
      <div style={{ padding: '40px 0' }}>
        <h3>Lot not found</h3>
        <Link to="/">Back to inventory</Link>
      </div>
    );

  const st = statusOf(v, now, ctx);
  const sm = statusMeta(v, now, ctx);
  const mine = myBid(v, ctx);
  const cur = effBid(v, ctx);
  const inc = increment(cur);
  const min = minNext(v, ctx);
  const u = usage(v);

  const hasStructuralDamage = damage.some((d) => d.kind === 'Structural');
  const structural = hasStructuralDamage || v.title_status !== 'clean';

  const delta = med != null ? cur - med : null;
  const history = buildHistory(v, now, ctx);

  const reserve = reserveStatus(v, cur);
  const met = reserveMet(v, cur);
  const mineTag = mine ? mineBidTag(mine, cur) : null;
  const canBid = st === 'live';
  const hasBuyNow = !!v.buy_now_price && st === 'live';
  const bnFee = v.buy_now_price ? buyFee(v.buy_now_price) : 0;

  const specs: [string, string][] = [
    ['VIN', v.vin],
    ['Model year', String(v.year)],
    ['Body style', cap(v.body_style)],
    ['Odometer', km(v.odometer_km)],
    ['Per year', km(u.kmy) + '/yr'],
    ['Engine', v.engine],
    ['Transmission', cap(v.transmission)],
    ['Drivetrain', v.drivetrain],
    ['Fuel', cap(v.fuel_type)],
    ['Exterior', v.exterior_color],
    ['Interior', v.interior_color],
    ['Title status', cap(v.title_status)],
    ['Location', `${v.city}, ${v.province}`],
    ['Lot', v.lot],
  ];

  const closedTitle =
    st === 'preview'
      ? 'Bidding has not opened'
      : st === 'bought'
        ? 'You purchased this lot'
        : met !== false
          ? 'Sold at ' + money(cur)
          : 'Closed at ' + money(cur) + ' — no sale';

  const closedText =
    st === 'preview'
      ? `This lot runs ${runTimeLabel(v.runAt)}. Add it to your watchlist and you will see it when bidding opens.`
      : st === 'bought'
        ? 'Buy Now completed. Payment and transport are out of scope in this prototype.'
        : `Reserve was ${v.reserve_price == null ? 'not set' : met ? 'met' : 'not met'}. Lots that do not sell are usually re-run in a later sale.`;

  return (
    <section className={s.screen} data-screen-label="Vehicle detail">
      <div className={s.back}>
        <button className="btn btn-secondary" onClick={() => navigate('/')}>Back to inventory</button>
        <div className={s.ids}>Lot {v.lot} · VIN {v.vin}</div>
      </div>

      <div className={s.titleBlock}>
        <div className={s.tags}>
          <span className={`tag ${sm.tag}`}>{sm.label}</span>
          <span className="tag tag-neutral">{cap(v.body_style)}</span>
          <span className={`tag ${v.title_status === 'clean' ? 'tag-neutral' : 'tag-accent'}`}>
            {cap(v.title_status)} title
          </span>
          {hasBuyNow && <span className="tag tag-outline">Buy Now {money(v.buy_now_price)}</span>}
        </div>
        <h1>{titleOf(v)}</h1>
        <div className={s.sub}>
          {km(v.odometer_km)} · {v.engine} · {cap(v.transmission)} · {v.drivetrain} · {v.city}, {v.province}
        </div>
      </div>

      <div className={s.layout}>
        <div>
          <div className={`grayscale ${s.hero}`}>
            <img
              src={v.images[Math.min(imageIndex, v.images.length - 1)]}
              alt={titleOf(v)}
              loading="lazy"
            />
          </div>
          <div className={s.thumbs}>
            {v.images.map((src, i) => (
              <button
                key={i}
                className={`grayscale ${s.thumb}${i === imageIndex ? ' ' + s.thumbOn : ''}`}
                onClick={() => setImageIndex(i)}
                aria-label={`Photo ${i + 1}`}
              >
                <img src={src} alt="" loading="lazy" />
              </button>
            ))}
          </div>
          <div className={s.photoNote}>
            {v.images.length} photos supplied by the selling dealership. Dataset ships placeholder images.
          </div>

          <h4 className={s.sectionHead}>Condition</h4>
          <div className="hr" style={{ margin: '8px 0 16px' }} />
          <div className={s.condition}>
            <div className={s.gradeBox}>
              <div className={s.gradeNum}>{v.condition_grade.toFixed(1)}</div>
              <div className={s.gradeBand}>{gradeBand(v.condition_grade)}</div>
              <div className={s.gradeTrack}>
                <div className={s.gradeFill} style={{ width: `${(v.condition_grade / 5) * 100}%` }} />
              </div>
              <div className={s.gradeScale}>Grade of 5.0</div>
            </div>
            <p className={s.report}>{v.condition_report}</p>
          </div>

          <div className={s.damage}>
            <div className={s.damageHead}>
              {v.damage_notes.length
                ? `Declared damage — ${v.damage_notes.length} item${v.damage_notes.length > 1 ? 's' : ''}`
                : 'Declared damage'}
            </div>
            {damage.map((d, i) => (
              <div key={i} className={s.damageRow}>
                <span className={`tag ${damageTag(d.kind)}`}>{d.kind}</span>
                <span>{d.text}</span>
              </div>
            ))}
            {damage.length === 0 && (
              <div className={s.damageRow}>No damage declared by the inspecting dealership.</div>
            )}
            {structural && (
              <div className={s.warn}>
                <strong>Structural or title issue on this lot</strong>
                <span>
                  {v.title_status !== 'clean' ? `Title is registered ${v.title_status}. ` : ''}
                  {hasStructuralDamage
                    ? 'Structural damage is declared in the condition report — inspect before bidding.'
                    : 'Retail resale and financing options are limited on this title class.'}
                </span>
              </div>
            )}
          </div>

          <h4 className={s.sectionHead}>Specifications</h4>
          <div className="hr" style={{ margin: '8px 0 0' }} />
          <dl className={s.specs}>
            {specs.map(([k, val]) => (
              <div key={k} className={s.spec}>
                <dt>{k}</dt>
                <dd>{val}</dd>
              </div>
            ))}
          </dl>
          <div className={s.usageNote}>
            {km(u.kmy)} per year over {u.age} years — {u.word} against a 20,000 km/yr benchmark.
          </div>

          <h4 className={s.sectionHead}>Selling dealership</h4>
          <div className="hr" style={{ margin: '8px 0 14px' }} />
          <div className={s.dealer}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <div className={s.dealerName}>{v.selling_dealership}</div>
              <div className={s.dealerPlace}>{v.city}, {v.province}</div>
            </div>
            <div>
              <div className={s.figureLabel}>Other lots from this dealer</div>
              <div className={s.figure}>
                {vehicles!.filter((x) => x.selling_dealership === v.selling_dealership).length}
              </div>
            </div>
          </div>

          {comps.length > 0 && (
            <>
              <h4 className={s.sectionHead}>Comparable lots in this sale</h4>
              <div className="hr" style={{ margin: '8px 0 14px' }} />
              <div className={s.comps}>
                <div>
                  <div className={s.figureLabel}>Median bid, same model</div>
                  <div className={s.compFigure}>{money(med)}</div>
                </div>
                <div>
                  <div className={s.figureLabel}>This lot vs median</div>
                  <div
                    className={s.compFigure}
                    style={{ color: delta != null && delta > 0 ? 'var(--color-accent-700)' : 'var(--color-text)' }}
                  >
                    {delta == null ? '—' : (delta >= 0 ? '+' : '−') + money(Math.abs(delta))}
                  </div>
                </div>
                <div>
                  <div className={s.figureLabel}>Comparables</div>
                  <div className={s.compFigure}>{comps.length}</div>
                </div>
              </div>
              <table className="table">
                <thead>
                  <tr>
                    <th>Lot</th>
                    <th>Vehicle</th>
                    <th style={{ textAlign: 'right' }}>Odometer</th>
                    <th>Grade</th>
                    <th style={{ textAlign: 'right' }}>Current bid</th>
                  </tr>
                </thead>
                <tbody>
                  {comps.slice(0, 6).map((c) => (
                    <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => navigate('/lot/' + c.id)}>
                      <td className={s.ids}>{c.lot}</td>
                      <td style={{ fontSize: 13 }}>{titleOf(c)}</td>
                      <td style={{ textAlign: 'right' }}>{km(c.odometer_km)}</td>
                      <td>{c.condition_grade.toFixed(1)}</td>
                      <td style={{ textAlign: 'right' }}>{money(effBid(c, ctx))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>

        <aside className={s.aside}>
          <div className={s.bidPanel}>
            <div className={s.bidHead}>
              <div className={s.bidLabel}>{effCount(v, ctx) ? 'Current bid' : 'Starting bid'}</div>
              <div className={s.bidCount}>{bidsWord(effCount(v, ctx))}</div>
            </div>
            <div className={s.bidAmount}>{money(cur)}</div>
            <div className={s.tags} style={{ marginTop: 8 }}>
              <span className={`tag ${reserve.tag}`}>{reserve.label}</span>
              <span className={`tag ${mineTag ? mineTag.tag : 'tag-neutral'}`}>
                {mineTag ? mineTag.label : 'No bid from you'}
              </span>
            </div>
            <div className={s.note} style={{ marginTop: 6 }}>Bidding as {ctx.myId} in this tab.</div>

            <div className={s.split}>
              <div>
                <div className={s.figureLabel}>
                  {st === 'preview' ? 'Bidding opens in' : st === 'live' ? 'Closes in' : 'Closed'}
                </div>
                <div
                  className={s.timer}
                  style={{
                    color:
                      st === 'live' && v.runAt - now < 6 * 3600 * 1000
                        ? 'var(--color-accent)'
                        : 'var(--color-text)',
                  }}
                >
                  {st === 'preview'
                    ? countdown(v.openAt - now)
                    : st === 'live'
                      ? countdown(v.runAt - now)
                      : 'closed'}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className={s.figureLabel}>Runs</div>
                <div className={s.runs}>{runTimeLabel(v.runAt)}</div>
              </div>
            </div>

            {canBid && (
              <div className={s.block}>
                <BidForm v={v} now={now} size="lg" />
                <div className={s.note}>
                  Estimated buy fee at {money(min)} is{' '}
                  <span className={s.noteAccent}>{money(buyFee(min))}</span>, excluded from the bid.
                </div>

                <div className={s.block}>
                  <div className="field">
                    <label htmlFor="max">Maximum autobid (proxy)</label>
                    <input
                      id="max"
                      className="input"
                      type="number"
                      value={maxInput}
                      placeholder={String(min + inc * 4)}
                      onChange={(e) => setMaxInput(e.target.value)}
                    />
                  </div>
                  {maxError && <div className={s.error}>{maxError}</div>}
                  <button
                    className="btn btn-secondary btn-block"
                    onClick={() => {
                      const max = Number(maxInput);
                      if (!max || max < min) {
                        setMaxError(`Maximum autobid must be at least ${money(min)}.`);
                        return;
                      }
                      const err = actions.placeBid(v, min, max);
                      setMaxError(err || '');
                    }}
                  >
                    {mine && mine.max
                      ? `Update max to ${maxInput ? money(Number(maxInput)) : money(mine.max)}`
                      : 'Set maximum autobid'}
                  </button>
                  <div className={s.note}>
                    {mine && mine.max
                      ? `Autobidding up to ${money(mine.max)} in ${money(inc)} increments.`
                      : 'We bid the minimum increment on your behalf up to your ceiling.'}
                  </div>
                </div>

                {hasBuyNow && (
                  <div className={s.block}>
                    <button
                      className={`btn btn-secondary btn-block ${s.buyNow}`}
                      onClick={() => setBuyOpen(true)}
                    >
                      Buy Now for {money(v.buy_now_price)}
                    </button>
                    <div className={s.note}>
                      Ends the auction immediately at the dealer's asking price.
                    </div>
                  </div>
                )}
              </div>
            )}

            {!canBid && (
              <div className={`${s.block} ${s.closed}`}>
                <strong>{closedTitle}</strong>
                <span>{closedText}</span>
              </div>
            )}

            <div className={s.pair}>
              <button className="btn btn-secondary" onClick={() => actions.toggleWatch(v)}>
                <Icon name="star" filled={ctx.watch.includes(v.id)} />
                {ctx.watch.includes(v.id) ? 'Watching' : 'Watch lot'}
              </button>
              <button className="btn btn-secondary" onClick={() => actions.toggleCompare(v)}>
                <Icon
                  name={ctx.compare.includes(v.id) ? 'check' : 'square'}
                  strokeWidth={ctx.compare.includes(v.id) ? 2.4 : 2}
                />
                {ctx.compare.includes(v.id) ? 'In compare' : 'Compare'}
              </button>
            </div>
          </div>

          <div className={s.history}>
            <div className={s.historyHead}>Bid history</div>
            {history.map((h, i) => (
              <div key={i} className={s.historyRow}>
                <div>
                  <div className={`${s.who}${h.mine ? ' ' + s.mine : ''}`}>{h.who}</div>
                  <div className={s.when}>{h.when}</div>
                </div>
                <div className={s.amount}>{h.amount}</div>
              </div>
            ))}
            {history.length === 0 && (
              <div className={s.historyEmpty}>
                No bids yet. Opening bid is {money(v.starting_bid)}.
              </div>
            )}
          </div>
        </aside>
      </div>

      {buyOpen && (
        <div className="dialog-backdrop" style={{ zIndex: 80 }}>
          <div className="dialog">
            <div className="dialog-title">Buy this lot now?</div>
            <div className="dialog-body">
              <div className={s.dealerName} style={{ fontSize: 16 }}>{titleOf(v)}</div>
              <div className={s.dealerPlace}>Lot {v.lot} · {v.selling_dealership}</div>
              <div className={s.dialogRow} style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid var(--color-divider)' }}>
                <span>Buy Now price</span>
                <span className={s.figure} style={{ fontSize: 15 }}>{money(v.buy_now_price)}</span>
              </div>
              <div className={s.dialogRow}>
                <span>Estimated buy fee</span>
                <span>{money(bnFee)}</span>
              </div>
              <div className={s.dialogTotal}>
                <span>Total</span>
                <span>{money((v.buy_now_price || 0) + bnFee)}</span>
              </div>
              <div className={s.note}>
                Buying now closes the auction immediately. Transport and payment are out of scope in this
                prototype.
              </div>
            </div>
            <div className="dialog-actions">
              <button className="btn btn-secondary" onClick={() => setBuyOpen(false)}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  actions.buyNow(v);
                  setBuyOpen(false);
                }}
              >
                Confirm purchase
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
