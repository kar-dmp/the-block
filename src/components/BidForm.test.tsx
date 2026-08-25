import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BidForm from './BidForm';
import { useApp } from '../state/AppContext';
import { makeVehicle, makeCtx } from '../test/fixtures';
import type { AppContextValue } from '../lib/types';

vi.mock('../state/AppContext', () => ({ useApp: vi.fn() }));
const mockUseApp = vi.mocked(useApp);

describe('BidForm', () => {
  let placeBid: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    placeBid = vi.fn(() => null);
    mockUseApp.mockReturnValue({
      ctx: makeCtx(),
      actions: { placeBid },
    } as unknown as AppContextValue);
  });

  it('pre-fills the bid input with the minimum next bid', () => {
    render(<BidForm v={makeVehicle()} now={0} />);
    // base 10000 -> increment(10000) === 250 -> min 10250
    expect(screen.getByLabelText(/Your bid/)).toHaveValue(10250);
  });

  it('bumps the input by the quick +$ amount when clicked', async () => {
    const user = userEvent.setup();
    render(<BidForm v={makeVehicle()} now={0} />);
    // +X buttons are +1, +2, +5 increments of increment(10000)=250
    await user.click(screen.getByRole('button', { name: '+250' }));
    expect(screen.getByLabelText(/Your bid/)).toHaveValue(10250);
    await user.click(screen.getByRole('button', { name: '+1,250' }));
    expect(screen.getByLabelText(/Your bid/)).toHaveValue(11250);
  });

  it('arms on first click without submitting, then confirms on second click', async () => {
    const user = userEvent.setup();
    render(<BidForm v={makeVehicle()} now={0} />);
    const submit = screen.getByRole('button', { name: 'Place bid' });

    await user.click(submit);
    expect(placeBid).not.toHaveBeenCalled();
    expect(screen.getByText(/Confirm \$10,250/)).toBeInTheDocument();

    await user.click(screen.getByText(/Confirm \$10,250/));
    expect(placeBid).toHaveBeenCalledWith(expect.objectContaining({ id: 'v1' }), 10250, null);
  });

  it('calls onPlaced after a successful submit', async () => {
    const user = userEvent.setup();
    const onPlaced = vi.fn();
    render(<BidForm v={makeVehicle()} now={0} onPlaced={onPlaced} />);
    await user.click(screen.getByRole('button', { name: 'Place bid' }));
    await user.click(screen.getByText(/Confirm/));
    expect(onPlaced).toHaveBeenCalled();
  });

  it('shows the returned error and does not call onPlaced on failure', async () => {
    placeBid.mockReturnValue('Minimum next bid is $10,250.');
    const user = userEvent.setup();
    const onPlaced = vi.fn();
    render(<BidForm v={makeVehicle()} now={0} onPlaced={onPlaced} />);
    await user.click(screen.getByRole('button', { name: 'Place bid' }));
    await user.click(screen.getByText(/Confirm/));
    expect(screen.getByText('Minimum next bid is $10,250.')).toBeInTheDocument();
    expect(onPlaced).not.toHaveBeenCalled();
  });

  it('cancels the armed state without submitting', async () => {
    const user = userEvent.setup();
    render(<BidForm v={makeVehicle()} now={0} />);
    await user.click(screen.getByRole('button', { name: 'Place bid' }));
    expect(screen.getByText(/Cancel in/)).toBeInTheDocument();

    await user.click(screen.getByText(/Cancel in/));
    expect(screen.getByRole('button', { name: 'Place bid' })).toBeInTheDocument();
    expect(placeBid).not.toHaveBeenCalled();
  });

  it('disarms when the bid amount is edited after arming', async () => {
    const user = userEvent.setup();
    render(<BidForm v={makeVehicle()} now={0} />);
    await user.click(screen.getByRole('button', { name: 'Place bid' }));
    expect(screen.getByText(/Confirm/)).toBeInTheDocument();

    await user.clear(screen.getByLabelText(/Your bid/));
    await user.type(screen.getByLabelText(/Your bid/), '11000');
    expect(screen.getByRole('button', { name: 'Place bid' })).toBeInTheDocument();
  });

  it('resets the input and armed state when switching to a different lot', () => {
    const { rerender } = render(<BidForm v={makeVehicle({ id: 'v1', base: 10000 })} now={0} />);
    expect(screen.getByLabelText(/Your bid/)).toHaveValue(10250);
    rerender(<BidForm v={makeVehicle({ id: 'v2', base: 20000 })} now={0} />);
    // increment(20000) === 250 (the < 25000 band)
    expect(screen.getByLabelText(/Your bid/)).toHaveValue(20250);
  });
});
