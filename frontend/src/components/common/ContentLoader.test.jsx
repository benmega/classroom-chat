import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ContentLoader from './ContentLoader';

describe('ContentLoader', () => {
  it('announces itself as a loading status', () => {
    render(<ContentLoader />);
    expect(screen.getByRole('status', { name: 'Loading page' })).toBeInTheDocument();
  });

  it('colours the spinner from the --blue-600 CSS variable', () => {
    render(<ContentLoader />);
    const spinner = screen.getByRole('status').querySelector('svg');
    expect(spinner.getAttribute('style')).toContain('color: var(--blue-600)');
    // lucide strokes with currentColor, so the CSS colour above is what paints the icon
    expect(spinner.getAttribute('stroke')).toBe('currentColor');
  });
});
