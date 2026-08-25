import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import LotCard, { LotGrid } from './LotCard';
import type { Row } from '../lib/types';

const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock('./QuickBidDialog', () => ({
  default: ({ id, onClose }: { id: string; onClose: () => void }) => (
    <div data-testid="quick-bid-dialog">
      quick-bid for {id}
      <button onClick={onClose}>close-dialog</button>
    </div>
  ),
}));

function makeRow(overrides: Partial<Row> = {}): Row {
  return {
    id: 'v1', lot: '100A', title: '2022 Honda Civic LX', image: 'a.jpg',
    gradeTag: 'tag-neutral', gradeLabel: '4.0 Clean', sub: 'Sedan · FWD',
    odo: '50,000 km', place: 'Toronto, ON', bidLabel: 'Current bid', bid: '$10,500',
    status: 'Live', statusColor: 'var(--color-accent)', countdown: '1h 00m',
    live: true, cta: 'Bid', watching: false, inCompare: false,
    ...overrides,
  } as Row;
}

function renderCard(row: Row, props: { onWatch?: () => void; onCompare?: () => void } = {}) {
  return render(
    <MemoryRouter>
      <LotCard row={row} {...props} />
    </MemoryRouter>
  );
}

describe('LotCard', () => {
  beforeEach(() => navigateMock.mockClear());

  it('shows a Bid CTA and opens the quick-bid dialog for a live lot', async () => {
    const user = userEvent.setup();
    renderCard(makeRow({ live: true, cta: 'Bid' }));
    await user.click(screen.getByRole('button', { name: 'Bid' }));
    expect(screen.getByTestId('quick-bid-dialog')).toHaveTextContent('quick-bid for v1');
  });

  it('closes the quick-bid dialog', async () => {
    const user = userEvent.setup();
    renderCard(makeRow({ live: true, cta: 'Bid' }));
    await user.click(screen.getByRole('button', { name: 'Bid' }));
    await user.click(screen.getByText('close-dialog'));
    expect(screen.queryByTestId('quick-bid-dialog')).not.toBeInTheDocument();
  });

  it('shows the real status instead of a bid affordance for a non-live lot', async () => {
    const user = userEvent.setup();
    renderCard(makeRow({ live: false, cta: 'Preview', status: 'Preview' }));
    await user.click(screen.getByRole('button', { name: 'Preview' }));
    // Clicking it navigates to the detail page rather than opening a quick-bid dialog.
    expect(screen.queryByTestId('quick-bid-dialog')).not.toBeInTheDocument();
    expect(navigateMock).toHaveBeenCalledWith('/lot/v1');
  });

  it('navigates to the lot detail page when the status button is clicked on a non-live lot', async () => {
    const user = userEvent.setup();
    renderCard(makeRow({ live: false, cta: 'Results', status: 'Sold' }));
    await user.click(screen.getByRole('button', { name: 'Sold' }));
    expect(navigateMock).toHaveBeenCalledWith('/lot/v1');
  });

  it('navigates to the lot detail page when the title is clicked', async () => {
    const user = userEvent.setup();
    renderCard(makeRow());
    await user.click(screen.getByText('2022 Honda Civic LX'));
    expect(navigateMock).toHaveBeenCalledWith('/lot/v1');
  });

  it('calls onWatch without navigating when the watch button is clicked', async () => {
    const user = userEvent.setup();
    const onWatch = vi.fn();
    renderCard(makeRow(), { onWatch });
    await user.click(screen.getByTitle('Add to watchlist'));
    expect(onWatch).toHaveBeenCalled();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('calls onCompare without navigating when the compare button is clicked', async () => {
    const user = userEvent.setup();
    const onCompare = vi.fn();
    renderCard(makeRow(), { onCompare });
    await user.click(screen.getByTitle('Add to compare'));
    expect(onCompare).toHaveBeenCalled();
    expect(navigateMock).not.toHaveBeenCalled();
  });

  it('omits watch/compare buttons when their handlers are not passed', () => {
    renderCard(makeRow());
    expect(screen.queryByTitle('Add to watchlist')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Add to compare')).not.toBeInTheDocument();
  });

  it('LotGrid renders its children', () => {
    render(<LotGrid><span>child</span></LotGrid>);
    expect(screen.getByText('child')).toBeInTheDocument();
  });
});
