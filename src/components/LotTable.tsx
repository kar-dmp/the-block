import { useNavigate } from 'react-router-dom';
import type { Row } from '../lib/types';
import s from './LotTable.module.scss';

export default function LotTable({ rows }: { rows: Row[] }) {
  const navigate = useNavigate();
  return (
    <div className={s.scroll}>
      <table className={`table ${s.table}`}>
        <thead>
          <tr>
            <th style={{ width: 74 }}>Lot</th>
            <th>Vehicle</th>
            <th style={{ textAlign: 'right' }}>Odometer</th>
            <th style={{ width: 96 }}>Grade</th>
            <th>Location</th>
            <th style={{ width: 150 }}>Closes</th>
            <th style={{ textAlign: 'right', width: 168 }}>Current bid</th>
            <th style={{ width: 86 }} />
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className={s.row} onClick={() => navigate('/lot/' + r.id)}>
              <td className={s.lot}>{r.lot}</td>
              <td>
                <div className={s.title}>{r.title}</div>
                <div className={s.sub}>{r.sub}</div>
              </td>
              <td className={s.right}>{r.odo}</td>
              <td>
                <div className={s.grade} style={{ color: r.gradeColor }}>{r.grade}</div>
                <div className={s.gradeWord}>{r.gradeWord}</div>
              </td>
              <td className={s.place}>{r.place}</td>
              <td>
                <div className={s.countdown}>{r.countdown}</div>
                <div className={s.status} style={{ color: r.statusColor }}>{r.status}</div>
              </td>
              <td style={{ textAlign: 'right' }}>
                <div className={s.bid}>{r.bid}</div>
                <div className={s.bidMeta}>{r.bidMeta}</div>
              </td>
              <td><span className={s.cta}>{r.cta}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
