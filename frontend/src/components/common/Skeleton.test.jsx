import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Skeleton, { SkeletonGroup } from './Skeleton';

describe('Skeleton', () => {
    it('is a decorative block: sized by its props and hidden from assistive technology', () => {
        const { container } = render(<Skeleton width="40px" height="18px" borderRadius="50%" className="extra" />);

        const block = container.firstChild;
        expect(block).toHaveClass('skeleton-loader', 'extra');
        expect(block).toHaveStyle({ width: '40px', height: '18px', borderRadius: '50%' });
        expect(block).toHaveAttribute('aria-hidden', 'true');
    });
});

describe('SkeletonGroup', () => {
    it('is a busy status region that announces what is loading', () => {
        render(
            <SkeletonGroup label="Loading transactions..." className="rows">
                <Skeleton />
            </SkeletonGroup>
        );

        const group = screen.getByRole('status');
        expect(group).toHaveAttribute('aria-busy', 'true');
        expect(group).toHaveClass('rows');
        expect(group).toHaveTextContent('Loading transactions...');
        expect(screen.getByText('Loading transactions...')).toHaveClass('sr-only');
    });

    it('defaults to "Loading…"', () => {
        render(<SkeletonGroup />);

        expect(screen.getByRole('status')).toHaveTextContent('Loading…');
    });
});
