import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Watchlist from './Watchlist';
import { useApp } from '../state/AppContext';
import { makeVehicle, makeCtx } from '../test/fixtures';
import type { AppContextValue, Vehicle } from '../lib/types';

vi.mock('../state/AppContext', () => ({ useApp: vi.fn() }));
const mockUseApp = vi.mocked(useApp);

function setup({ watch, vehicles }: { watch: string[]; vehicles: Vehicle[] }) {
  mockUseApp.mockReturnValue({
    watch,
    byId: (id: string) => vehicles.find((v) => v.id === id),
    ctx: makeCtx({ watch }),
    actions: { toggleWatch: vi.fn(), toggleCompare: vi.fn() },
  } as unknown as AppContextValue);
  render(
    <MemoryRouter>
      <Watchlist />
    </MemoryRouter>
  );
}

describe('Watchlist', () => {
  it('shows an empty state with no watched lots', () => {
    setup({ watch: [], vehicles: [] });
    expect(screen.getByText('Nothing on your watchlist')).toBeInTheDocument();
  });

  it('lists each watched lot as a card', () => {
    const v = makeVehicle();
    setup({ watch: ['v1'], vehicles: [v] });
    expect(screen.getByText('2022 Honda Civic LX')).toBeInTheDocument();
    expect(screen.getByText('1 lots saved')).toBeInTheDocument();
  });

  it('silently drops watched ids that no longer resolve to a vehicle', () => {
    setup({ watch: ['missing-id'], vehicles: [] });
    expect(screen.getByText('Nothing on your watchlist')).toBeInTheDocument();
  });
});
