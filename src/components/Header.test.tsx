import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import Header from './Header';
import { useApp } from '../state/AppContext';
import type { AppContextValue } from '../lib/types';

vi.mock('../state/AppContext', () => ({ useApp: vi.fn() }));
const mockUseApp = vi.mocked(useApp);

function setup(overrides: Record<string, unknown> = {}) {
  const setFeedOpen = vi.fn();
  mockUseApp.mockReturnValue({
    bids: { v1: { ME: { amount: 100 } }, v2: { ME: { amount: 200 } } },
    watch: ['v1'],
    compare: ['v1', 'v2', 'v3'],
    feed: [{}, {}, {}, {}],
    setFeedOpen,
    ctx: { myId: 'ME' },
    ...overrides,
  } as unknown as AppContextValue);
  render(
    <MemoryRouter>
      <Header />
    </MemoryRouter>
  );
  return { setFeedOpen };
}

describe('Header', () => {
  it('shows counts for bids, watchlist, and compare', () => {
    setup();
    expect(screen.getByRole('link', { name: /My bids 2/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Watchlist 1/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Compare 3/ })).toBeInTheDocument();
  });

  it('only counts bids belonging to the current bidder', () => {
    setup({
      bids: {
        v1: { ME: { amount: 100 } },
        v2: { OTHER: { amount: 200 } },
        v3: { OTHER: { amount: 300 } },
      },
    });
    expect(screen.getByRole('link', { name: /My bids 1/ })).toBeInTheDocument();
  });

  it('shows the activity feed count', () => {
    setup();
    expect(screen.getByRole('button', { name: /Activity 4/ })).toBeInTheDocument();
  });

  it('opens the activity drawer when the Activity button is clicked', async () => {
    const user = userEvent.setup();
    const { setFeedOpen } = setup();
    await user.click(screen.getByRole('button', { name: /Activity/ }));
    expect(setFeedOpen).toHaveBeenCalledWith(true);
  });
});
