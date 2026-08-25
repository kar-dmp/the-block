import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';
import { useApp } from './state/AppContext';
import { makeCtx } from './test/fixtures';
import type { AppContextValue } from './lib/types';

vi.mock('./state/AppContext', () => ({ useApp: vi.fn() }));
const mockUseApp = vi.mocked(useApp);

function setup(initialEntries: string[]) {
  mockUseApp.mockReturnValue({
    vehicles: [],
    loading: false,
    ctx: makeCtx(),
    actions: {
      toggleWatch: vi.fn(), toggleCompare: vi.fn(), saveSearch: vi.fn(), removeSearch: vi.fn(),
      resetAll: vi.fn(),
    },
    saved: [],
    byId: () => undefined,
    bids: {},
    watch: [],
    compare: [],
    feed: [],
    toast: '',
    feedOpen: false,
    setFeedOpen: vi.fn(),
  } as unknown as AppContextValue);
  render(
    <MemoryRouter initialEntries={initialEntries}>
      <App />
    </MemoryRouter>
  );
}

describe('App routing', () => {
  it('renders Browse at the root path', () => {
    setup(['/']);
    expect(screen.getByText('Wholesale inventory')).toBeInTheDocument();
  });

  it('renders MyBids at /bids', () => {
    setup(['/bids']);
    expect(screen.getByRole('heading', { name: 'My bids' })).toBeInTheDocument();
  });

  it('renders Watchlist at /watchlist', () => {
    setup(['/watchlist']);
    expect(screen.getByRole('heading', { name: 'Watchlist' })).toBeInTheDocument();
  });

  it('renders Compare at /compare', () => {
    setup(['/compare']);
    expect(screen.getByRole('heading', { name: 'Compare lots' })).toBeInTheDocument();
  });

  it('renders Notes at /notes', () => {
    setup(['/notes']);
    expect(screen.getByRole('heading', { name: 'Product notes and assumptions' })).toBeInTheDocument();
  });

  it('redirects an unknown path back to Browse', () => {
    setup(['/does-not-exist']);
    expect(screen.getByText('Wholesale inventory')).toBeInTheDocument();
  });

  it('renders the persistent Header and BottomNav across routes', () => {
    setup(['/notes']);
    expect(screen.getByText('OPENLANE')).toBeInTheDocument();
    expect(screen.getAllByText('Notes').length).toBeGreaterThan(0);
  });
});
