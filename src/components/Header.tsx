import { NavLink, useNavigate, type NavLinkRenderProps } from 'react-router-dom';
import { useApp } from '../state/AppContext';
import s from './Header.module.scss';

const cls = ({ isActive }: NavLinkRenderProps) => `${s.link}${isActive ? ' ' + s.active : ''}`;

export default function Header() {
  const { bids, watch, compare, feed, setFeedOpen, ctx } = useApp();
  const navigate = useNavigate();
  const myBidCount = Object.keys(bids).filter((id) => bids[id]?.[ctx.myId]).length;

  return (
    <header className={s.header}>
      <div className={s.inner}>
        <div className={s.mark} />
        <button className={s.brand} onClick={() => navigate('/')}>OPENLANE</button>
        <div className={s.role}>BUYER</div>
        <div className={s.badge}>PROTOTYPE</div>
        <div className={s.spacer} />
        <nav className={s.nav}>
          <NavLink to="/" end className={cls}>Inventory</NavLink>
          <NavLink to="/bids" className={cls}>
            My bids <span className={s.count}>{myBidCount}</span>
          </NavLink>
          <NavLink to="/watchlist" className={cls}>
            Watchlist <span className={s.count}>{watch.length}</span>
          </NavLink>
          <NavLink to="/compare" className={cls}>
            Compare <span className={s.count}>{compare.length}</span>
          </NavLink>
          <NavLink to="/notes" className={cls}>Notes</NavLink>
        </nav>
        <button className={`btn btn-secondary ${s.activity}`} onClick={() => setFeedOpen(true)}>
          Activity <span className={s.count}>{feed.length}</span>
        </button>
      </div>
    </header>
  );
}
