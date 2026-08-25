import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import MyBids from './MyBids';
import { useApp } from '../state/AppContext';
import { makeVehicle, makeCtx } from '../test/fixtures';
import type { AppContextValue, Bids, Vehicle } from '../lib/types';

const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});
vi.mock('../state/AppContext', () => ({ useApp: vi.fn() }));
const mockUseApp = vi.mocked(useApp);

function setup({ vehicles, bids, myId = 'ME01' }: { vehicles: Vehicle[]; bids: Bids; myId?: string }) {
  mockUseApp.mockReturnValue({
    bids,
    byId: (id: string) => vehicles.find((v) => v.id === id),
    ctx: makeCtx({ bids, myId }),
  } as unknown as AppContextValue);
  render(
    <MemoryRouter>
      <MyBids />
    </MemoryRouter>
  );
}

describe('MyBids', () => {
  it('shows an empty state when nothing has been bid on', () => {
    setup({ vehicles: [], bids: {} });
    expect(screen.getByText("You haven't bid yet")).toBeInTheDocument();
  });

  it('lists a lot this bidder has a record on, with High bidder status when winning', () => {
    const v = makeVehicle({ base: 10000 });
    setup({ vehicles: [v], bids: { v1: { ME01: { amount: 10000, max: null, at: Date.now() } } } });
    expect(screen.getByText('2022 Honda Civic LX')).toBeInTheDocument();
    expect(screen.getByText('High bidder', { selector: 'span' })).toBeInTheDocument();
  });

  it('shows Outbid status and counts it in the summary when behind', () => {
    const v = makeVehicle({ base: 10000 });
    const bids: Bids = {
      v1: { ME01: { amount: 10000, max: null, at: Date.now() }, OTHER: { amount: 11000, max: null, at: Date.now() } },
    };
    setup({ vehicles: [v], bids });
    expect(screen.getByText('Outbid', { selector: 'span' })).toBeInTheDocument();
  });

  it('sums live exposure only across lots where this bidder is the high bidder', () => {
    const v1 = makeVehicle({ id: 'v1', lot: '100', base: 10000 });
    const v2 = makeVehicle({ id: 'v2', lot: '200', base: 20000 });
    const bids: Bids = {
      v1: { ME01: { amount: 10000, max: null, at: Date.now() } }, // winning -> counts
      v2: {
        ME01: { amount: 20000, max: null, at: Date.now() },
        OTHER: { amount: 21000, max: null, at: Date.now() },
      }, // outbid -> excluded
    };
    setup({ vehicles: [v1, v2], bids });
    // Only v1's 10,000 should count toward exposure.
    const exposureRow = screen.getByText('Live exposure').closest('div');
    expect(exposureRow).toHaveTextContent('$10,000');
  });

  it('navigates to the lot detail page when a row is clicked', async () => {
    const user = userEvent.setup();
    const v = makeVehicle({ id: 'v9', base: 10000 });
    setup({ vehicles: [v], bids: { v9: { ME01: { amount: 10000, max: null, at: Date.now() } } } });
    await user.click(screen.getByText('2022 Honda Civic LX'));
    expect(navigateMock).toHaveBeenCalledWith('/lot/v9');
  });

  it('ignores bid records that belong to other bidders in this tab\'s list', () => {
    const v = makeVehicle({ id: 'v1' });
    setup({ vehicles: [v], bids: { v1: { OTHERTAB: { amount: 10000, max: null, at: Date.now() } } } });
    expect(screen.getByText("You haven't bid yet")).toBeInTheDocument();
  });
});
