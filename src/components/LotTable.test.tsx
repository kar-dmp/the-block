import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import LotTable from './LotTable';
import type { Row } from '../lib/types';

const navigateMock = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => navigateMock };
});

function makeRow(overrides: Partial<Row> = {}): Row {
  return {
    id: 'v1', lot: '100A', title: '2022 Honda Civic LX', sub: 'Sedan · FWD',
    odo: '50,000 km', grade: '4.0', gradeWord: 'Clean', gradeColor: 'var(--color-text)',
    place: 'Toronto, ON', countdown: '1h 00m', status: 'Live', statusColor: 'var(--color-accent)',
    bid: '$10,500', bidMeta: '3 bids · reserve met', cta: 'Bid',
    ...overrides,
  } as Row;
}

describe('LotTable', () => {
  beforeEach(() => {
    navigateMock.mockClear();
  });

  it('renders one row per lot with its key fields', () => {
    render(
      <MemoryRouter>
        <LotTable rows={[makeRow()]} />
      </MemoryRouter>
    );
    expect(screen.getByText('100A')).toBeInTheDocument();
    expect(screen.getByText('2022 Honda Civic LX')).toBeInTheDocument();
    expect(screen.getByText('$10,500')).toBeInTheDocument();
  });

  it('navigates to the lot detail page when a row is clicked', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <LotTable rows={[makeRow({ id: 'v42' })]} />
      </MemoryRouter>
    );
    await user.click(screen.getByText('2022 Honda Civic LX'));
    expect(navigateMock).toHaveBeenCalledWith('/lot/v42');
  });

  it('renders nothing in the body for an empty row list', () => {
    render(
      <MemoryRouter>
        <LotTable rows={[]} />
      </MemoryRouter>
    );
    expect(screen.queryAllByRole('row')).toHaveLength(1); // header row only
  });
});
