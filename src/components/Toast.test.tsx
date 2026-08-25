import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Toast from './Toast';
import { useApp } from '../state/AppContext';
import type { AppContextValue } from '../lib/types';

vi.mock('../state/AppContext', () => ({ useApp: vi.fn() }));
const mockUseApp = vi.mocked(useApp);

describe('Toast', () => {
  it('renders nothing when there is no active toast', () => {
    mockUseApp.mockReturnValue({ toast: '' } as unknown as AppContextValue);
    const { container } = render(<Toast />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the toast message as a live region when present', () => {
    mockUseApp.mockReturnValue({ toast: 'Bid placed on lot 42' } as unknown as AppContextValue);
    render(<Toast />);
    expect(screen.getByRole('status')).toHaveTextContent('Bid placed on lot 42');
  });
});
