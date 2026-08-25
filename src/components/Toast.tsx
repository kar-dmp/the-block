import { useApp } from '../state/AppContext';
import s from './Toast.module.scss';

export default function Toast() {
  const { toast } = useApp();
  if (!toast) return null;
  return (
    <div className={s.wrap} role="status" aria-live="polite">
      <div className={s.toast}>
        <span className={s.dot} />
        <span>{toast}</span>
      </div>
    </div>
  );
}
