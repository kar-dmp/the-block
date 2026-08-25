import { useNavigate } from 'react-router-dom';
import { useApp } from '../state/AppContext';
import { relTime } from '../lib/format';
import s from './ActivityDrawer.module.scss';

export default function ActivityDrawer() {
  const { feed, feedOpen, setFeedOpen } = useApp();
  const navigate = useNavigate();
  if (!feedOpen) return null;

  const open = (id: string) => {
    setFeedOpen(false);
    navigate('/lot/' + id);
  };

  return (
    <div className={s.scrim} onClick={() => setFeedOpen(false)}>
      <aside className={s.panel} onClick={(e) => e.stopPropagation()}>
        <div className={s.head}>
          <div className={s.title}>Activity</div>
          <button className="btn btn-secondary" onClick={() => setFeedOpen(false)}>Close</button>
        </div>
        {feed.slice(0, 30).map((f, i) => (
          <button key={i} className={s.item} onClick={() => open(f.id)}>
            <div className={`${s.kind}${f.kind === 'Outbid' ? ' ' + s.outbid : ''}`}>{f.kind}</div>
            <div className={s.itemTitle}>{f.title}</div>
            <div className={s.text}>{f.text}</div>
            <div className={s.when}>{relTime(Date.now() - f.at)}</div>
          </button>
        ))}
        {feed.length === 0 && (
          <div className={s.empty}>Bids, watchlist changes and purchases show up here.</div>
        )}
      </aside>
    </div>
  );
}
