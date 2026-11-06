import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Loading from './Loading';

describe('Loading', () => {
    it('is a status region that announces its label', () => {
        render(<Loading label="Loading achievements..." />);

        const status = screen.getByRole('status');
        expect(status).toHaveTextContent('Loading achievements...');
    });

    it('defaults to "Loading…"', () => {
        render(<Loading />);

        expect(screen.getByRole('status')).toHaveTextContent('Loading…');
    });

    it('hides the label from sight but not from screen readers unless showLabel is set', () => {
        const { rerender } = render(<Loading label="Please wait" />);
        expect(screen.getByText('Please wait')).toHaveClass('sr-only');

        rerender(<Loading label="Please wait" showLabel />);
        expect(screen.getByText('Please wait')).not.toHaveClass('sr-only');
        expect(screen.getByText('Please wait')).toHaveClass('ui-loading__label');
    });

    it('keeps the spinner out of the accessibility tree', () => {
        const { container } = render(<Loading />);

        expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    });

    it.each([
        ['block', 'DIV', 32],
        ['fullpage', 'DIV', 48],
        ['inline', 'SPAN', 16],
    ])('renders the %s variant as a %s with a %ipx spinner', (variant, tag, size) => {
        const { container } = render(<Loading variant={variant} />);

        const status = screen.getByRole('status');
        expect(status.tagName).toBe(tag);
        expect(status).toHaveClass('ui-loading', `ui-loading--${variant}`);
        expect(container.querySelector('svg')).toHaveAttribute('width', String(size));
    });

    it('lets the caller size the spinner and add a class', () => {
        const { container } = render(<Loading size={48} className="kiosk-loading-indicator" />);

        expect(container.querySelector('svg')).toHaveAttribute('width', '48');
        expect(screen.getByRole('status')).toHaveClass('kiosk-loading-indicator');
    });
});
