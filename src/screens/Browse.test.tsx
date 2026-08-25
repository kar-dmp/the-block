import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, useLocation, useNavigationType } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import Browse from './Browse';
import { useApp } from '../state/AppContext';
import { makeVehicle, makeCtx } from '../test/fixtures';
import type { AppContextValue, SavedSearch, Vehicle } from '../lib/types';

const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});
vi.mock('../state/AppContext', () => ({ useApp: vi.fn() }));
const mockUseApp = vi.mocked(useApp);

function LocationProbe() {
  const location = useLocation();
  const navType = useNavigationType();
  return <div data-testid="location-probe" data-search={location.search} data-navtype={navType} />;
}

function setup({
  vehicles,
  loading = false,
  saved = [],
  initialEntries = ['/'],
}: {
  vehicles: Vehicle[] | null;
  loading?: boolean;
  saved?: SavedSearch[];
  initialEntries?: string[];
}) {
  const actions = { toggleWatch: vi.fn(), toggleCompare: vi.fn(), saveSearch: vi.fn(), removeSearch: vi.fn() };
  mockUseApp.mockReturnValue({
    vehicles,
    loading,
    ctx: makeCtx(),
    actions,
    saved,
    byId: (id: string) => vehicles?.find((v) => v.id === id),
  } as unknown as AppContextValue);
  render(
    <MemoryRouter initialEntries={initialEntries}>
      <Browse />
      <LocationProbe />
    </MemoryRouter>
  );
  return { actions };
}

describe('Browse', () => {
  it('shows a loading message while vehicles are not yet loaded', () => {
    setup({ vehicles: null, loading: true });
    expect(screen.getByText('Loading inventory…')).toBeInTheDocument();
  });

  it('lists lots in the default grid view', () => {
    setup({ vehicles: [makeVehicle()] });
    expect(screen.getByText('2022 Honda Civic LX')).toBeInTheDocument();
    expect(screen.getByText('1 of 1 lots')).toBeInTheDocument();
  });

  it('switches to table view', async () => {
    const user = userEvent.setup();
    setup({ vehicles: [makeVehicle()] });
    await user.click(screen.getByRole('radio', { name: 'Table' }));
    expect(screen.getByRole('table')).toBeInTheDocument();
  });

  it('filters the list by search query', async () => {
    const user = userEvent.setup();
    const honda = makeVehicle({ id: 'a', make: 'Honda', model: 'Civic' });
    const toyota = makeVehicle({ id: 'b', make: 'Toyota', model: 'Corolla' });
    setup({ vehicles: [honda, toyota] });
    expect(screen.getByText('2022 Toyota Corolla LX')).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText(/Search make/), 'toyota');
    expect(screen.queryByText('2022 Honda Civic LX')).not.toBeInTheDocument();
    expect(screen.getByText('2022 Toyota Corolla LX')).toBeInTheDocument();
  });

  it('opens the filter panel and applies a facet filter', async () => {
    const user = userEvent.setup();
    const honda = makeVehicle({ id: 'a', make: 'Honda' });
    const toyota = makeVehicle({ id: 'b', make: 'Toyota' });
    setup({ vehicles: [honda, toyota] });
    await user.click(screen.getByRole('button', { name: 'Filters' }));
    await user.click(screen.getByLabelText(/Toyota/));
    expect(screen.queryByText('2022 Honda Civic LX')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Filters · 1/ })).toBeInTheDocument();
  });

  it('shows a no-results empty state and can reset filters', async () => {
    const user = userEvent.setup();
    setup({ vehicles: [makeVehicle({ base: 10000 })] });
    await user.click(screen.getByRole('button', { name: 'Filters' }));
    // Pull the price slider (first of the three range inputs) below the lot's bid.
    const [priceSlider] = screen.getAllByRole('slider');
    fireEvent.change(priceSlider, { target: { value: '5000' } });
    expect(screen.getByText('No lots match those filters')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Reset all filters' }));
    expect(screen.getByText('2022 Honda Civic LX')).toBeInTheDocument();
  });

  it('paginates results beyond one page', async () => {
    const user = userEvent.setup();
    const vehicles = Array.from({ length: 30 }, (_, i) =>
      makeVehicle({ id: 'v' + i, lot: String(i).padStart(3, '0') })
    );
    setup({ vehicles });
    expect(screen.getByText(/showing 24/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Load 24 more/ }));
    expect(screen.queryByText(/showing/)).not.toBeInTheDocument();
  });

  it('reflects the search query in the URL by replacing, not pushing, history', async () => {
    const user = userEvent.setup();
    const honda = makeVehicle({ id: 'a', make: 'Honda' });
    const toyota = makeVehicle({ id: 'b', make: 'Toyota', model: 'Corolla' });
    setup({ vehicles: [honda, toyota] });

    await user.type(screen.getByPlaceholderText(/Search make/), 'toyota');

    const probe = screen.getByTestId('location-probe');
    expect(probe.dataset.search).toBe('?q=toyota');
    expect(probe.dataset.navtype).toBe('REPLACE');
  });

  it('restores the search query and filtered results from the URL on mount', () => {
    const honda = makeVehicle({ id: 'a', make: 'Honda' });
    const toyota = makeVehicle({ id: 'b', make: 'Toyota', model: 'Corolla' });
    setup({ vehicles: [honda, toyota], initialEntries: ['/?q=toyota'] });

    expect(screen.getByPlaceholderText(/Search make/)).toHaveValue('toyota');
    expect(screen.queryByText('2022 Honda Civic LX')).not.toBeInTheDocument();
    expect(screen.getByText('2022 Toyota Corolla LX')).toBeInTheDocument();
  });

  it('reflects an applied facet filter and sort order in the URL', async () => {
    const user = userEvent.setup();
    const honda = makeVehicle({ id: 'a', make: 'Honda' });
    const toyota = makeVehicle({ id: 'b', make: 'Toyota', model: 'Corolla' });
    setup({ vehicles: [honda, toyota] });

    await user.click(screen.getByRole('button', { name: 'Filters' }));
    await user.click(screen.getByLabelText(/Toyota/));
    await user.selectOptions(screen.getByRole('combobox'), 'Lot number');

    const search = screen.getByTestId('location-probe').dataset.search;
    expect(search).toContain('makes=Toyota');
    expect(search).toContain('sort=lot');
  });

  it('restores an applied filter and sort order from the URL on mount', () => {
    const honda = makeVehicle({ id: 'a', make: 'Honda' });
    const toyota = makeVehicle({ id: 'b', make: 'Toyota', model: 'Corolla' });
    setup({ vehicles: [honda, toyota], initialEntries: ['/?makes=Toyota&sort=lot'] });

    expect(screen.queryByText('2022 Honda Civic LX')).not.toBeInTheDocument();
    expect(screen.getByText('2022 Toyota Corolla LX')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Filters · 1/ })).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toHaveValue('lot');
  });

  it('lists and removes a saved search', async () => {
    const user = userEvent.setup();
    const { actions } = setup({
      vehicles: [makeVehicle()],
      saved: [{ name: 'Cheap Hondas', f: {} as SavedSearch['f'], query: 'honda' }],
    });
    expect(screen.getByText('Cheap Hondas')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Remove saved search' }));
    expect(actions.removeSearch).toHaveBeenCalledWith('Cheap Hondas');
  });
});
