import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import Icon, { type IconName } from './Icon';

describe('Icon', () => {
  it('renders an svg at the given size', () => {
    const { container } = render(<Icon name="star" size={20} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '20');
    expect(svg).toHaveAttribute('height', '20');
  });

  it('fills with currentColor when filled, none otherwise', () => {
    const { container: filled } = render(<Icon name="star" filled />);
    expect(filled.querySelector('svg')).toHaveAttribute('fill', 'currentColor');

    const { container: unfilled } = render(<Icon name="star" />);
    expect(unfilled.querySelector('svg')).toHaveAttribute('fill', 'none');
  });

  it('applies the given stroke width', () => {
    const { container } = render(<Icon name="check" strokeWidth={3} />);
    expect(container.querySelector('svg')).toHaveAttribute('stroke-width', '3');
  });

  it('renders nothing inside for an unknown icon name without throwing', () => {
    expect(() => render(<Icon name={'does-not-exist' as unknown as IconName} />)).not.toThrow();
  });
});
