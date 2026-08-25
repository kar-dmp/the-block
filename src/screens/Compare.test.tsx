import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import Compare from './Compare';
import { useApp } from '../state/AppContext';
import { makeVehicle, makeCtx } from '../test/fixtures';
import type { AppContextValue, Vehicle } from '../lib/types';

const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});
vi.mock('../state/AppContext', () => ({ useApp: vi.fn() }));
const mockUseApp = vi.mocked(useApp);

function setup({ compare, vehicles }: { compare: string[]; vehicles: Vehicle[] }) {
  const actions = { toggleCompare: vi.fn() };
  mockUseApp.mockReturnValue({
    compare,
    byId: (id: string) => vehicles.find((v) => v.id === id),
    ctx: makeCtx({ compare }),
    actions,
  } as unknown as AppContextValue);
  render(
    <MemoryRouter>
      <Compare />
    </MemoryRouter>
  );
  return { actions };
}

describe('Compare', () => {
  it('shows an empty state with nothing to compare', () => {
    setup({ compare: [], vehicles: [] });
    expect(screen.getByText('Pick up to three lots to compare')).toBeInTheDocument();
  });

  it('renders a column per compared lot', () => {
    const a = makeVehicle({ id: 'a', lot: '100' });
    const b = makeVehicle({ id: 'b', lot: '200', make: 'Toyota', model: 'Corolla' });
    setup({ compare: ['a', 'b'], vehicles: [a, b] });
    expect(screen.getByText('2022 Honda Civic LX')).toBeInTheDocument();
    expect(screen.getByText('2022 Toyota Corolla LX')).toBeInTheDocument();
    expect(screen.getByText('2 of 3 slots used')).toBeInTheDocument();
  });

  it('shows reserve status per lot', () => {
    const a = makeVehicle({ id: 'a', reserve_price: 20000, base: 10000 });
    setup({ compare: ['a'], vehicles: [a] });
    expect(screen.getByText('Not met')).toBeInTheDocument();
  });

  it('removes a lot from compare when Remove is clicked', async () => {
    const user = userEvent.setup();
    const a = makeVehicle({ id: 'a' });
    const { actions } = setup({ compare: ['a'], vehicles: [a] });
    await user.click(screen.getByText('Remove'));
    expect(actions.toggleCompare).toHaveBeenCalledWith(a);
  });

  it('navigates to the lot when its title is clicked', async () => {
    const user = userEvent.setup();
    const a = makeVehicle({ id: 'a' });
    setup({ compare: ['a'], vehicles: [a] });
    await user.click(screen.getByText('2022 Honda Civic LX'));
    expect(navigateMock).toHaveBeenCalledWith('/lot/a');
  });

  it('silently drops compare ids that no longer resolve to a vehicle', () => {
    setup({ compare: ['missing'], vehicles: [] });
    expect(screen.getByText('Pick up to three lots to compare')).toBeInTheDocument();
  });
});
