import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProfileSkeleton from './ProfileSkeleton';

describe('ProfileSkeleton', () => {
    it('renders a polite status live region with label "Loading Profile..."', () => {
        render(<ProfileSkeleton />);

        const status = screen.getByRole('status');
        expect(status).toBeInTheDocument();
        expect(status).toHaveAttribute('aria-busy', 'true');
        expect(status).toHaveTextContent('Loading Profile...');
    });

    it('renders the profile skeleton layout elements', () => {
        const { container } = render(<ProfileSkeleton />);

        expect(screen.getByTestId('profile-skeleton')).toBeInTheDocument();
        expect(container.querySelector('.profile-header-card')).toBeInTheDocument();
        expect(container.querySelector('.avatar-wrapper')).toBeInTheDocument();
        expect(container.querySelector('.dashboard-grid')).toBeInTheDocument();
        expect(container.querySelector('.column-left')).toBeInTheDocument();
        expect(container.querySelector('.column-right')).toBeInTheDocument();

        const skeletons = container.querySelectorAll('.skeleton-loader');
        expect(skeletons.length).toBeGreaterThan(10);
    });
});
