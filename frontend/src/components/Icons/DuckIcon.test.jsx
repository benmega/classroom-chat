import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import DuckIcon from './DuckIcon';

const gradientIds = (container) => Array.from(container.querySelectorAll('radialGradient')).map((el) => el.id);
const referencedIds = (svg) => Array.from(svg.querySelectorAll('[fill^="url("]')).map((el) => el.getAttribute('fill').slice(4, -1));

describe('DuckIcon', () => {
    it('is hidden from assistive technology and cannot take focus', () => {
        const { container } = render(<DuckIcon />);
        const svg = container.querySelector('svg');

        expect(svg).toHaveAttribute('aria-hidden', 'true');
        expect(svg).toHaveAttribute('focusable', 'false');
    });

    it('gives every icon its own gradient id', () => {
        const { container } = render(
            <>
                <DuckIcon />
                <DuckIcon />
                <DuckIcon />
            </>
        );

        const ids = gradientIds(container);
        expect(ids).toHaveLength(3);
        expect(ids.every((id) => /^duckGradient-[\w-]+$/.test(id))).toBe(true);
        expect(new Set(ids).size).toBe(3);
    });

    it('fills its highlights from its own gradient, not from another icon\'s', () => {
        const { container } = render(
            <>
                <DuckIcon />
                <DuckIcon />
            </>
        );

        const [first, second] = Array.from(container.querySelectorAll('svg'));
        const [firstId] = gradientIds(first);
        const [secondId] = gradientIds(second);

        expect(referencedIds(first)).toEqual([`#${firstId}`, `#${firstId}`]);
        expect(referencedIds(second)).toEqual([`#${secondId}`, `#${secondId}`]);
        expect(firstId).not.toBe(secondId);
    });

    it('keeps its size, colour and class props', () => {
        const { container } = render(<DuckIcon size={32} color="white" className="stat-icon" />);
        const svg = container.querySelector('svg');

        expect(svg).toHaveAttribute('width', '32');
        expect(svg).toHaveClass('duck-icon', 'stat-icon');
        expect(svg.querySelector('path').getAttribute('fill')).toBe('white');
    });
});
