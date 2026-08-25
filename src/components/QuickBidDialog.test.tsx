import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import QuickBidDialog from './QuickBidDialog';
import { useApp } from '../state/AppContext';
import { makeVehicle, makeCtx } from '../test/fixtures';
import type { AppContextValue, AppCtx, Vehicle } from '../lib/types';

vi.mock('../state/AppContext', () => ({ useApp: vi.fn() }));
const mockUseApp = vi.mocked(useApp);

function setup(vehicleOverrides: Partial<Vehicle> = {}, ctxOverrides: Partial<AppCtx> = {}) {
  const v = makeVehicle(vehicleOverrides);
  mockUseApp.mockReturnValue({
    byId: () => v,
    ctx: makeCtx(ctxOverrides),
    actions: { placeBid: vi.fn(() => null) },
  } as unknown as AppContextValue);
  const onClose = vi.fn();
  render(
    <MemoryRouter>
      <QuickBidDialog id={v.id} onClose={onClose} />
    </MemoryRouter>
  );
  return { v, onClose };
}

describe('QuickBidDialog', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows the lot title and current bid', () => {
    setup();
    expect(screen.getByText('2022 Honda Civic LX')).toBeInTheDocument();
    expect(screen.getByText('$10,000')).toBeInTheDocument();
  });

  it('renders the bid form when the lot is live', () => {
    setup();
    expect(screen.getByRole('button', { name: 'Place bid' })).toBeInTheDocument();
  });

  it('shows a closed message instead of the bid form once the lot has ended', () => {
    setup({ runAt: Date.now() - 1000 });
    expect(screen.queryByRole('button', { name: 'Place bid' })).not.toBeInTheDocument();
    expect(screen.getByText('This lot has stopped taking bids.')).toBeInTheDocument();
  });

  it('shows "No reserve" when the lot has none', () => {
    setup({ reserve_price: null });
    expect(screen.getByText('No reserve')).toBeInTheDocument();
  });

  it('shows reserve met/not met once a reserve is set', () => {
    setup({ reserve_price: 20000, base: 10000 });
    expect(screen.getByText('Reserve not met')).toBeInTheDocument();
  });

  it('shows whether this bidder is leading when they have a bid', () => {
    setup({ base: 10000 }, { bids: { v1: { ME01: { amount: 10500, max: null, at: Date.now() } } } });
    expect(screen.getByText('You are the high bidder')).toBeInTheDocument();
  });

  it('calls onClose when the Close button is clicked', async () => {
    const user = userEvent.setup();
    const { onClose } = setup();
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalled();
  });

  it('links to the full lot detail page', () => {
    setup();
    expect(screen.getByRole('link', { name: 'Full lot details' })).toHaveAttribute('href', '/lot/v1');
  });
});
