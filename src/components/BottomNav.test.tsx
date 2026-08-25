import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import BottomNav from './BottomNav';
import { useApp } from '../state/AppContext';
import type { AppContextValue } from '../lib/types';

vi.mock('../state/AppContext', () => ({ useApp: vi.fn() }));
const mockUseApp = vi.mocked(useApp);

describe('BottomNav', () => {
  it('shows counts for bids, watch, and compare', () => {
    mockUseApp.mockReturnValue({ bids: { v1: {} }, watch: ['v1', 'v2'], compare: [] } as unknown as AppContextValue);
    render(
      <MemoryRouter>
        <BottomNav />
      </MemoryRouter>
    );
    expect(screen.getByRole('link', { name: 'Bids 1' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Watch 2' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Compare 0' })).toBeInTheDocument();
  });

  it('marks the current route active', () => {
    mockUseApp.mockReturnValue({ bids: {}, watch: [], compare: [] } as unknown as AppContextValue);
    render(
      <MemoryRouter initialEntries={['/watchlist']}>
        <BottomNav />
      </MemoryRouter>
    );
    // NavLink sets aria-current="page" on the active link — an observable
    // behavior, unlike matching the hashed CSS-module class name.
    expect(screen.getByRole('link', { name: 'Watch 0' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Inventory' })).not.toHaveAttribute('aria-current');
  });
});
