import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import LandingSlideshow from './LandingSlideshow';

const track = (container) => container.querySelector('.slideshow-track');

describe('LandingSlideshow', () => {
    it('shows every slide with its own alt text', () => {
        render(<LandingSlideshow />);

        expect(screen.getAllByRole('img')).toHaveLength(5);
        expect(screen.getByRole('img', { name: 'Ozaria' })).toHaveAttribute('src', '/images/ozaria.png');
        expect(screen.getByRole('group', { name: 'Screenshots of what students build' })).toBeInTheDocument();
    });

    it('plays at first, with a button that offers to pause it', () => {
        const { container } = render(<LandingSlideshow />);

        expect(screen.getByRole('button', { name: 'Pause slideshow' })).toHaveAttribute('type', 'button');
        expect(track(container)).not.toHaveClass('is-paused');
    });

    it('pauses and resumes from the keyboard', async () => {
        const user = userEvent.setup();
        const { container } = render(<LandingSlideshow />);

        await user.tab();
        expect(screen.getByRole('button', { name: 'Pause slideshow' })).toHaveFocus();
        await user.keyboard('{Enter}');

        expect(track(container)).toHaveClass('is-paused');
        expect(screen.getByRole('button', { name: 'Play slideshow' })).toHaveFocus();

        await user.keyboard(' ');

        expect(track(container)).not.toHaveClass('is-paused');
        expect(screen.getByRole('button', { name: 'Pause slideshow' })).toBeInTheDocument();
    });

    it('passes a style through to the window (the mobile layout widens it)', () => {
        const { container } = render(<LandingSlideshow style={{ maxWidth: '100%' }} />);

        expect(container.querySelector('.slideshow-window')).toHaveStyle({ maxWidth: '100%' });
    });
});
