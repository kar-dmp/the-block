import { facet, EMPTY_FILTERS, PRICE_MAX_CAP, ODO_MAX_CAP } from '../lib/lots';
import { money, km, toggleIn } from '../lib/format';
import type { FacetOption, Filters, Vehicle } from '../lib/types';
import s from './FilterPanel.module.scss';

const STATUSES: [string, string][] = [
  ['live', 'Live'],
  ['preview', 'Preview'],
  ['ended', 'Ended'],
];

function ChipGroup({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: FacetOption[] | { value: string; label: string }[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div>
      <div className={s.legend}>{label}</div>
      <div className={s.chips}>
        {options.map((o) => (
          <label key={o.value} className={`seg-opt ${s.chip}`}>
            <input type="checkbox" checked={selected.includes(o.value)} onChange={() => onToggle(o.value)} />
            {o.label}
          </label>
        ))}
      </div>
    </div>
  );
}

type ArrayFilterKey = 'makes' | 'bodies' | 'provs' | 'titles' | 'status';

export default function FilterPanel({
  vehicles,
  f,
  setF,
  resultLabel,
  onSave,
}: {
  vehicles: Vehicle[];
  f: Filters;
  setF: (f: Filters) => void;
  resultLabel: string;
  onSave: () => void;
}) {
  const patch = (p: Partial<Filters>) => setF({ ...f, ...p });
  const chip = (key: ArrayFilterKey) => (v: string) =>
    patch({ [key]: toggleIn(f[key], v) } as Partial<Filters>);

  return (
    <div className={s.panel}>
      <div className={s.grid}>
        <ChipGroup label="Make" options={facet(vehicles, 'make', f.makes)} selected={f.makes} onToggle={chip('makes')} />
        <ChipGroup label="Body style" options={facet(vehicles, 'body_style', f.bodies)} selected={f.bodies} onToggle={chip('bodies')} />
        <ChipGroup label="Province" options={facet(vehicles, 'province', f.provs)} selected={f.provs} onToggle={chip('provs')} />
        <ChipGroup label="Title status" options={facet(vehicles, 'title_status', f.titles)} selected={f.titles} onToggle={chip('titles')} />
        <ChipGroup
          label="Lot status"
          options={STATUSES.map(([value, label]) => ({ value, label }))}
          selected={f.status}
          onToggle={chip('status')}
        />

        <div>
          <div className={s.legend}>Model year</div>
          <div className={s.years}>
            <input className="input" type="number" value={f.yearMin} onChange={(e) => patch({ yearMin: e.target.value })} />
            <span>to</span>
            <input className="input" type="number" value={f.yearMax} onChange={(e) => patch({ yearMax: e.target.value })} />
          </div>
        </div>

        <div>
          <div className={`${s.legend} ${s.spread}`}>
            <span>Max current bid</span>
            <span className={s.value}>{f.priceMax >= PRICE_MAX_CAP ? 'Any' : money(f.priceMax)}</span>
          </div>
          <input
            className={s.range}
            type="range"
            min={5000}
            max={PRICE_MAX_CAP}
            step={1000}
            value={f.priceMax}
            onChange={(e) => patch({ priceMax: Number(e.target.value) })}
          />
        </div>

        <div>
          <div className={`${s.legend} ${s.spread}`}>
            <span>Max odometer</span>
            <span className={s.value}>{f.odoMax >= ODO_MAX_CAP ? 'Any' : km(f.odoMax)}</span>
          </div>
          <input
            className={s.range}
            type="range"
            min={10000}
            max={ODO_MAX_CAP}
            step={5000}
            value={f.odoMax}
            onChange={(e) => patch({ odoMax: Number(e.target.value) })}
          />
        </div>

        <div>
          <div className={`${s.legend} ${s.spread}`}>
            <span>Min condition grade</span>
            <span className={s.value}>{f.gradeMin <= 1 ? 'Any' : f.gradeMin.toFixed(1)}</span>
          </div>
          <input
            className={s.range}
            type="range"
            min={1}
            max={5}
            step={0.1}
            value={f.gradeMin}
            onChange={(e) => patch({ gradeMin: Number(e.target.value) })}
          />
        </div>

        <div>
          <div className={s.legend}>Only show</div>
          <div className={s.chips}>
            <label className={`seg-opt ${s.chip}`}>
              <input type="checkbox" checked={f.damageFree} onChange={() => patch({ damageFree: !f.damageFree })} />
              No declared damage
            </label>
            <label className={`seg-opt ${s.chip}`}>
              <input type="checkbox" checked={f.hasBuyNow} onChange={() => patch({ hasBuyNow: !f.hasBuyNow })} />
              Buy Now available
            </label>
            <label className={`seg-opt ${s.chip}`}>
              <input type="checkbox" checked={f.noReserve} onChange={() => patch({ noReserve: !f.noReserve })} />
              No reserve
            </label>
          </div>
        </div>
      </div>

      <div className={s.footer}>
        <button className="btn btn-primary" onClick={onSave}>Save this search</button>
        <button className="btn btn-secondary" onClick={() => setF(EMPTY_FILTERS)}>Reset all</button>
        <div className={s.spacer} />
        <div className={s.count}>{resultLabel}</div>
      </div>
    </div>
  );
}
