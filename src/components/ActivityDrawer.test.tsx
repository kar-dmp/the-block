import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import ActivityDrawer from './ActivityDrawer';
import { useApp } from '../state/AppContext';
import type { AppContextValue } from '../lib/types';

const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});
vi.mock('../state/AppContext', () => ({ useApp: vi.fn() }));
const mockUseApp = vi.mocked(useApp);

function setup(overrides: Record<string, unknown> = {}) {
  const setFeedOpen = vi.fn();
  mockUseApp.mockReturnValue({
    feed: [{ id: 'v1', kind: 'Bid placed', title: '2022 Honda Civic', text: 'You lead at $10,500', at: Date.now() }],
    feedOpen: true,
    setFeedOpen,
    ...overrides,
  } as unknown as AppContextValue);
  render(
    <MemoryRouter>
      <ActivityDrawer />
    </MemoryRouter>
  );
  return { setFeedOpen };
}

describe('ActivityDrawer', () => {
  it('renders nothing when closed', () => {
    mockUseApp.mockReturnValue({ feed: [], feedOpen: false, setFeedOpen: vi.fn() } as unknown as AppContextValue);
    const { container } = render(
      <MemoryRouter>
        <ActivityDrawer />
      </MemoryRouter>
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('lists feed entries when open', () => {
    setup();
    expect(screen.getByText('2022 Honda Civic')).toBeInTheDocument();
    expect(screen.getByText('You lead at $10,500')).toBeInTheDocument();
  });

  it('shows an empty state when there is no activity', () => {
    setup({ feed: [] });
    expect(screen.getByText('Bids, watchlist changes and purchases show up here.')).toBeInTheDocument();
  });

  it('navigates to the lot and closes the drawer when an item is clicked', async () => {
    const user = userEvent.setup();
    const { setFeedOpen } = setup();
    await user.click(screen.getByText('2022 Honda Civic'));
    expect(navigateMock).toHaveBeenCalledWith('/lot/v1');
    expect(setFeedOpen).toHaveBeenCalledWith(false);
  });

  it('closes when the Close button is clicked', async () => {
    const user = userEvent.setup();
    const { setFeedOpen } = setup();
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(setFeedOpen).toHaveBeenCalledWith(false);
  });
});
