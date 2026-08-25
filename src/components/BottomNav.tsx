import { NavLink, type NavLinkRenderProps } from 'react-router-dom';
import { useApp } from '../state/AppContext';
import s from './BottomNav.module.scss';

const cls = ({ isActive }: NavLinkRenderProps) => `${s.tab}${isActive ? ' ' + s.active : ''}`;

export default function BottomNav() {
  const { bids, watch, compare } = useApp();
  return (
    <nav className={s.nav}>
      <NavLink to="/" end className={cls}>Inventory</NavLink>
      <NavLink to="/bids" className={cls}>Bids {Object.keys(bids).length}</NavLink>
      <NavLink to="/watchlist" className={cls}>Watch {watch.length}</NavLink>
      <NavLink to="/compare" className={cls}>Compare {compare.length}</NavLink>
      <NavLink to="/notes" className={cls}>Notes</NavLink>
    </nav>
  );
}
