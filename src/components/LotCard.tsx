import { useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from './Icon';
import QuickBidDialog from './QuickBidDialog';
import type { Row } from '../lib/types';
import s from './LotCard.module.scss';

export function LotGrid({ children }: { children: ReactNode }) {
  return <div className={s.grid}>{children}</div>;
}

export default function LotCard({
  row,
  onWatch,
  onCompare,
}: {
  row: Row;
  onWatch?: () => void;
  onCompare?: () => void;
}) {
  const navigate = useNavigate();
  const [bidOpen, setBidOpen] = useState(false);
  const open = () => navigate('/lot/' + row.id);
  const stop = (fn: () => void) => (e: React.MouseEvent) => {
    e.stopPropagation();
    fn();
  };

  return (
    <article className={s.card}>
      <div className={`grayscale ${s.photo}`} onClick={open}>
        <img src={row.image} alt={row.title} loading="lazy" />
        <span className={s.lot}>{row.lot}</span>
      </div>
      <div className={s.body}>
        <div className={s.head}>
          <div className={s.title} onClick={open}>{row.title}</div>
          <span className={`tag ${row.gradeTag} ${s.tag}`}>{row.gradeLabel}</span>
        </div>
        <div className={s.sub}>{row.sub}</div>
        <div className={s.sub}>{row.odo} · {row.place}</div>
        <div className={s.hr} />
        <div className={s.figures}>
          <div>
            <div className={s.figureLabel}>{row.bidLabel}</div>
            <div className={s.bid}>{row.bid}</div>
          </div>
          <div>
            <div className={s.status} style={{ color: row.statusColor }}>{row.status}</div>
            <div className={s.countdown}>{row.countdown}</div>
          </div>
        </div>
        <div className={s.actions}>
          {row.live ? (
            <button className={`btn btn-primary ${s.primary}`} onClick={() => setBidOpen(true)}>
              {row.cta}
            </button>
          ) : (
            <button className={s.statusCta} onClick={open} style={{ color: row.statusColor }}>
              {row.status}
            </button>
          )}
          {onWatch && (
            <button
              className="btn btn-secondary btn-icon"
              title={row.watching ? 'Remove from watchlist' : 'Add to watchlist'}
              onClick={stop(onWatch)}
            >
              <Icon name="star" filled={row.watching} />
            </button>
          )}
          {onCompare && (
            <button
              className="btn btn-secondary btn-icon"
              title={row.inCompare ? 'Remove from compare' : 'Add to compare'}
              onClick={stop(onCompare)}
            >
              <Icon name={row.inCompare ? 'check' : 'square'} strokeWidth={row.inCompare ? 2.4 : 2} />
            </button>
          )}
        </div>
      </div>
      {bidOpen && <QuickBidDialog id={row.id} onClose={() => setBidOpen(false)} />}
    </article>
  );
}
