import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Notes from './Notes';
import { useApp } from '../state/AppContext';
import type { AppContextValue } from '../lib/types';

vi.mock('../state/AppContext', () => ({ useApp: vi.fn() }));
const mockUseApp = vi.mocked(useApp);

describe('Notes', () => {
  it('renders the product notes', () => {
    mockUseApp.mockReturnValue({ actions: { resetAll: vi.fn() } } as unknown as AppContextValue);
    render(<Notes />);
    expect(screen.getByText('Product notes and assumptions')).toBeInTheDocument();
    expect(screen.getByText('Auction timing is normalized to now')).toBeInTheDocument();
  });

  it('calls actions.resetAll when the reset button is clicked', async () => {
    const user = userEvent.setup();
    const resetAll = vi.fn();
    mockUseApp.mockReturnValue({ actions: { resetAll } } as unknown as AppContextValue);
    render(<Notes />);
    await user.click(screen.getByRole('button', { name: 'Reset all prototype state' }));
    expect(resetAll).toHaveBeenCalled();
  });
});
