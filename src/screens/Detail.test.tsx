import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import Detail from './Detail';
import { useApp } from '../state/AppContext';
import { makeVehicle, makeCtx } from '../test/fixtures';
import type { AppContextValue, AppCtx, Vehicle } from '../lib/types';

const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock, useParams: () => ({ id: 'v1' }) };
});
vi.mock('../state/AppContext', () => ({ useApp: vi.fn() }));
const mockUseApp = vi.mocked(useApp);

function setup({
  vehicles,
  loading = false,
  ctxOverrides = {},
}: {
  vehicles: Vehicle[] | null;
  loading?: boolean;
  ctxOverrides?: Partial<AppCtx>;
}) {
  const actions = {
    placeBid: vi.fn(() => null),
    buyNow: vi.fn(),
    toggleWatch: vi.fn(),
    toggleCompare: vi.fn(),
  };
  mockUseApp.mockReturnValue({
    vehicles,
    loading,
    ctx: makeCtx(ctxOverrides),
    actions,
  } as unknown as AppContextValue);
  render(
    <MemoryRouter>
      <Detail />
    </MemoryRouter>
  );
  return { actions };
}

describe('Detail', () => {
  it('shows a loading message while vehicles are not yet loaded', () => {
    setup({ vehicles: null, loading: true });
    expect(screen.getByText('Loading lot…')).toBeInTheDocument();
  });

  it('shows a not-found message when the id does not resolve', () => {
    setup({ vehicles: [makeVehicle({ id: 'other' })] });
    expect(screen.getByText('Lot not found')).toBeInTheDocument();
  });

  it('renders the lot title, specs, and current bid', () => {
    setup({ vehicles: [makeVehicle()] });
    expect(screen.getByRole('heading', { name: '2022 Honda Civic LX' })).toBeInTheDocument();
    expect(screen.getByText('$10,000')).toBeInTheDocument();
    expect(screen.getByText('VIN0001')).toBeInTheDocument();
  });

  it('shows the bid form for a live lot', () => {
    setup({ vehicles: [makeVehicle()] });
    expect(screen.getByRole('button', { name: 'Place bid' })).toBeInTheDocument();
  });

  it('shows a closed panel instead of the bid form once the lot has ended', () => {
    setup({ vehicles: [makeVehicle({ runAt: Date.now() - 1000, base: 10000, reserve_price: null })] });
    expect(screen.queryByRole('button', { name: 'Place bid' })).not.toBeInTheDocument();
    expect(screen.getByText(/Sold at \$10,000/)).toBeInTheDocument();
  });

  it('shows "no sale" wording when an ended lot did not meet reserve', () => {
    setup({ vehicles: [makeVehicle({ runAt: Date.now() - 1000, base: 10000, reserve_price: 20000 })] });
    expect(screen.getByText(/no sale/)).toBeInTheDocument();
  });

  it('flags a structural or title issue', () => {
    setup({ vehicles: [makeVehicle({ title_status: 'salvage' })] });
    expect(screen.getByText('Structural or title issue on this lot')).toBeInTheDocument();
    expect(screen.getByText(/Title is registered salvage/)).toBeInTheDocument();
  });

  it('does not show the damage warning for a clean lot with no damage', () => {
    setup({ vehicles: [makeVehicle()] });
    expect(screen.queryByText('Structural or title issue on this lot')).not.toBeInTheDocument();
  });

  it('shows comparable lots from the same make/model, excluding itself', () => {
    const v = makeVehicle({ id: 'v1', base: 10000 });
    const comp = makeVehicle({ id: 'v2', lot: '200A', base: 12000 });
    const other = makeVehicle({ id: 'v3', make: 'Toyota', model: 'Corolla' });
    setup({ vehicles: [v, comp, other] });
    expect(screen.getByText('Comparable lots in this sale')).toBeInTheDocument();
    expect(screen.getByText('200A')).toBeInTheDocument();
  });

  it('rejects a max autobid below the minimum next bid', async () => {
    const user = userEvent.setup();
    const { actions } = setup({ vehicles: [makeVehicle({ base: 10000 })] });
    await user.type(screen.getByLabelText('Maximum autobid (proxy)'), '1');
    await user.click(screen.getByRole('button', { name: 'Set maximum autobid' }));
    expect(screen.getByText(/Maximum autobid must be at least/)).toBeInTheDocument();
    expect(actions.placeBid).not.toHaveBeenCalled();
  });

  it('sets a valid max autobid', async () => {
    const user = userEvent.setup();
    const { actions } = setup({ vehicles: [makeVehicle({ base: 10000 })] });
    await user.type(screen.getByLabelText('Maximum autobid (proxy)'), '15000');
    await user.click(screen.getByRole('button', { name: 'Set maximum autobid' }));
    expect(actions.placeBid).toHaveBeenCalledWith(expect.objectContaining({ id: 'v1' }), 10250, 15000);
  });

  it('opens the Buy Now confirmation dialog and confirms the purchase', async () => {
    const user = userEvent.setup();
    const { actions } = setup({ vehicles: [makeVehicle({ buy_now_price: 15000 })] });
    await user.click(screen.getByRole('button', { name: /Buy Now for \$15,000/ }));
    expect(screen.getByText('Buy this lot now?')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Confirm purchase' }));
    expect(actions.buyNow).toHaveBeenCalledWith(expect.objectContaining({ id: 'v1' }));
  });

  it('cancels the Buy Now dialog without purchasing', async () => {
    const user = userEvent.setup();
    const { actions } = setup({ vehicles: [makeVehicle({ buy_now_price: 15000 })] });
    await user.click(screen.getByRole('button', { name: /Buy Now for \$15,000/ }));
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByText('Buy this lot now?')).not.toBeInTheDocument();
    expect(actions.buyNow).not.toHaveBeenCalled();
  });

  it('toggles watch and compare from the detail page', async () => {
    const user = userEvent.setup();
    const { actions } = setup({ vehicles: [makeVehicle()] });
    await user.click(screen.getByRole('button', { name: /Watch lot/ }));
    expect(actions.toggleWatch).toHaveBeenCalledWith(expect.objectContaining({ id: 'v1' }));
    await user.click(screen.getByRole('button', { name: /Compare/ }));
    expect(actions.toggleCompare).toHaveBeenCalledWith(expect.objectContaining({ id: 'v1' }));
  });

  it('switches the hero image when a thumbnail is clicked', async () => {
    const user = userEvent.setup();
    setup({ vehicles: [makeVehicle({ images: ['a.jpg', 'b.jpg'] })] });
    await user.click(screen.getByLabelText('Photo 2'));
    expect(screen.getByAltText('2022 Honda Civic LX')).toHaveAttribute('src', 'b.jpg');
  });

  it('navigates back to inventory', async () => {
    const user = userEvent.setup();
    setup({ vehicles: [makeVehicle()] });
    await user.click(screen.getByRole('button', { name: 'Back to inventory' }));
    expect(navigateMock).toHaveBeenCalledWith('/');
  });
});
