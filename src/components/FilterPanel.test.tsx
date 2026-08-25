import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FilterPanel from './FilterPanel';
import { EMPTY_FILTERS } from '../lib/lots';
import type { Filters, Vehicle } from '../lib/types';

function makeVehicles(): Vehicle[] {
  return [
    { make: 'Honda', body_style: 'sedan', province: 'ON', title_status: 'clean' },
    { make: 'Honda', body_style: 'suv', province: 'BC', title_status: 'clean' },
    { make: 'Toyota', body_style: 'sedan', province: 'ON', title_status: 'salvage' },
  ] as unknown as Vehicle[];
}

function setup(fOverrides: Partial<Filters> = {}) {
  const setF = vi.fn();
  const f = { ...EMPTY_FILTERS, ...fOverrides };
  render(
    <FilterPanel vehicles={makeVehicles()} f={f} setF={setF} resultLabel="3 of 3 lots" onSave={vi.fn()} />
  );
  return { setF, f };
}

describe('FilterPanel', () => {
  it('renders a facet chip per distinct make with a live count', () => {
    setup();
    expect(screen.getByLabelText(/Honda/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Toyota/)).toBeInTheDocument();
  });

  it('toggles a make chip on and patches the filter state', async () => {
    const user = userEvent.setup();
    const { setF, f } = setup();
    await user.click(screen.getByLabelText(/Honda/));
    expect(setF).toHaveBeenCalledWith({ ...f, makes: ['Honda'] });
  });

  it('removes an already-selected make chip', async () => {
    const user = userEvent.setup();
    const { setF, f } = setup({ makes: ['Honda'] });
    await user.click(screen.getByLabelText(/Honda/));
    expect(setF).toHaveBeenCalledWith({ ...f, makes: [] });
  });

  it('shows "Any" for the price slider at its ceiling and a formatted value below it', () => {
    const { rerender } = render(
      <FilterPanel vehicles={makeVehicles()} f={EMPTY_FILTERS} setF={vi.fn()} resultLabel="" onSave={vi.fn()} />
    );
    // Price, odometer, and grade all default to "Any" at their ceiling.
    expect(screen.getAllByText('Any', { selector: 'span' })).toHaveLength(3);
    rerender(
      <FilterPanel
        vehicles={makeVehicles()}
        f={{ ...EMPTY_FILTERS, priceMax: 40000 }}
        setF={vi.fn()}
        resultLabel=""
        onSave={vi.fn()}
      />
    );
    expect(screen.getByText('$40,000')).toBeInTheDocument();
  });

  it('calls onSave when "Save this search" is clicked', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(
      <FilterPanel vehicles={makeVehicles()} f={EMPTY_FILTERS} setF={vi.fn()} resultLabel="" onSave={onSave} />
    );
    await user.click(screen.getByRole('button', { name: 'Save this search' }));
    expect(onSave).toHaveBeenCalled();
  });

  it('resets to EMPTY_FILTERS when "Reset all" is clicked', async () => {
    const user = userEvent.setup();
    const { setF } = setup({ makes: ['Honda'] });
    await user.click(screen.getByRole('button', { name: 'Reset all' }));
    expect(setF).toHaveBeenCalledWith(EMPTY_FILTERS);
  });

  it('toggles the "No reserve" checkbox', async () => {
    const user = userEvent.setup();
    const { setF, f } = setup();
    await user.click(screen.getByLabelText('No reserve'));
    expect(setF).toHaveBeenCalledWith({ ...f, noReserve: true });
  });

  it('shows the result label passed in', () => {
    setup();
    expect(screen.getByText('3 of 3 lots')).toBeInTheDocument();
  });
});
