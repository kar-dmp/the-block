import { Link } from 'react-router-dom';
import { useApp } from '../state/AppContext';
import { useNow } from '../hooks/useNow';
import { rowOf } from '../lib/lots';
import type { Vehicle } from '../lib/types';
import LotCard, { LotGrid } from '../components/LotCard';
import s from './Screen.module.scss';

export default function Watchlist() {
  const { watch, byId, ctx, actions } = useApp();
  const now = useNow(15000);
  const lots = watch.map(byId).filter((v): v is Vehicle => v != null);

  return (
    <section className={s.screen} data-screen-label="Watchlist">
      <div className={`${s.head} ${s.ruled}`}>
        <h1>Watchlist</h1>
        <div className={s.sub}>{lots.length ? `${lots.length} lots saved` : 'Nothing saved yet'}</div>
      </div>

      {lots.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <LotGrid>
            {lots.map((v) => (
              <LotCard
                key={v.id}
                row={rowOf(v, now, ctx)}
                onWatch={() => actions.toggleWatch(v)}
                onCompare={() => actions.toggleCompare(v)}
              />
            ))}
          </LotGrid>
        </div>
      )}

      {lots.length === 0 && (
        <div className={s.empty}>
          <h3>Nothing on your watchlist</h3>
          <p>Save lots while you browse to keep an eye on them without bidding.</p>
          <Link className="btn btn-primary" to="/">Browse inventory</Link>
        </div>
      )}
    </section>
  );
}
