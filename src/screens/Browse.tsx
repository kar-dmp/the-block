import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useApp } from '../state/AppContext';
import { useNow } from '../hooks/useNow';
import {
  filterSort, rowOf, activeFilterCount, EMPTY_FILTERS, SORT_OPTIONS, PRICE_MAX_CAP, ODO_MAX_CAP,
  filtersToSearchParams, filtersFromSearchParams,
} from '../lib/lots';
import { money, km, cap } from '../lib/format';
import type { Filters } from '../lib/types';
import FilterPanel from '../components/FilterPanel';
import LotTable from '../components/LotTable';
import LotCard, { LotGrid } from '../components/LotCard';
import s from './Browse.module.scss';

const PAGE = 24;

export default function Browse() {
  const { vehicles, loading, ctx, actions, saved, byId } = useApp();
  const now = useNow(15000);
  const [searchParams, setSearchParams] = useSearchParams();
  const [initial] = useState(() => filtersFromSearchParams(searchParams));
  const [query, setQuery] = useState(initial.query);
  const [sort, setSort] = useState(initial.sort);
  const [f, setFilters] = useState<Filters>(initial.f);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [view, setView] = useState(initial.view);
  const [limit, setLimit] = useState(PAGE);

  const setF = (next: Filters) => {
    setFilters(next);
    setLimit(PAGE);
  };

  useEffect(() => {
    setSearchParams(filtersToSearchParams(query, sort, view, f), { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, sort, view, f]);

  const list = useMemo(
    () => (vehicles ? filterSort(vehicles, { f, query, sort }, now, ctx) : []),
    [vehicles, f, query, sort, now, ctx]
  );
  const rows = useMemo(() => list.slice(0, limit).map((v) => rowOf(v, now, ctx)), [list, limit, now, ctx]);

  const active = activeFilterCount(f);
  const resultLabel = loading
    ? 'Loading inventory…'
    : `${list.length} of ${vehicles!.length} lots${rows.length < list.length ? ` · showing ${rows.length}` : ''}`;

  const saveSearch = () => {
    const bits: string[] = [];
    if (f.makes.length) bits.push(f.makes.join('/'));
    if (f.bodies.length) bits.push(f.bodies.map(cap).join('/'));
    if (f.provs.length) bits.push(f.provs.join('/'));
    if (f.gradeMin > 1) bits.push('grade ' + f.gradeMin.toFixed(1) + '+');
    if (f.priceMax < PRICE_MAX_CAP) bits.push('under ' + money(f.priceMax));
    if (f.odoMax < ODO_MAX_CAP) bits.push('under ' + km(f.odoMax));
    if (f.damageFree) bits.push('no damage');
    if (f.noReserve) bits.push('no reserve');
    if (query) bits.push(`"${query}"`);
    actions.saveSearch(bits.length ? bits.join(' · ') : 'All lots', { ...f }, query);
  };

  return (
    <section data-screen-label="Inventory">
      <div className={s.head}>
        <div className={s.headText}>
          <h1>Wholesale inventory</h1>
          <div className={s.count}>{resultLabel}</div>
        </div>
        <div className={`seg ${s.seg}`}>
          <label className="seg-opt">
            <input type="radio" name="viewmode" checked={view === 'table'} onChange={() => setView('table')} />
            Table
          </label>
          <label className="seg-opt">
            <input type="radio" name="viewmode" checked={view === 'grid'} onChange={() => setView('grid')} />
            Grid
          </label>
        </div>
      </div>

      <div className={s.controls}>
        <input
          className={`input ${s.search}`}
          type="search"
          placeholder="Search make, model, VIN, lot, dealer, city"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setLimit(PAGE);
          }}
        />
        <select className={`input ${s.sort}`} value={sort} onChange={(e) => setSort(e.target.value)}>
          {SORT_OPTIONS.map(([v, label]) => (
            <option key={v} value={v}>{label}</option>
          ))}
        </select>
        <button className="btn btn-secondary" onClick={() => setFiltersOpen((o) => !o)}>
          {active ? `Filters · ${active}` : 'Filters'}
        </button>
      </div>

      {filtersOpen && !loading && (
        <FilterPanel
          vehicles={vehicles!}
          f={f}
          setF={setF}
          resultLabel={resultLabel}
          onSave={saveSearch}
        />
      )}

      {saved.length > 0 && (
        <div className={s.saved}>
          <span className={s.savedLabel}>Saved searches</span>
          {saved.map((x) => (
            <span key={x.name} className={s.savedChip}>
              <span
                className={s.savedName}
                onClick={() => {
                  setFilters({ ...EMPTY_FILTERS, ...x.f });
                  setQuery(x.query || '');
                  setLimit(PAGE);
                  setFiltersOpen(false);
                }}
              >
                {x.name}
              </span>
              <button className={s.savedRemove} onClick={() => actions.removeSearch(x.name)} aria-label="Remove saved search">
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      {rows.length > 0 && view === 'table' && <LotTable rows={rows} />}

      {rows.length > 0 && view === 'grid' && (
        <div className={s.cards}>
          <LotGrid>
            {rows.map((r) => (
              <LotCard
                key={r.id}
                row={r}
                onWatch={() => actions.toggleWatch(byId(r.id)!)}
                onCompare={() => actions.toggleCompare(byId(r.id)!)}
              />
            ))}
          </LotGrid>
        </div>
      )}

      {!loading && list.length === 0 && (
        <div className={s.empty}>
          <h3>No lots match those filters</h3>
          <p>
            Widen the odometer or price range, or clear a filter to see more of the {vehicles!.length} lots
            in this sale.
          </p>
          <button className="btn btn-secondary" onClick={() => setF(EMPTY_FILTERS)}>Reset all filters</button>
        </div>
      )}

      {rows.length < list.length && (
        <div className={s.more}>
          <button className="btn btn-secondary" onClick={() => setLimit((l) => l + PAGE)}>
            Load {PAGE} more of {list.length - rows.length} remaining
          </button>
        </div>
      )}
    </section>
  );
}
