import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ProfileHeader from './ProfileHeader';

describe('ProfileHeader Component', () => {
    it('renders profile name and role correctly', () => {
        const mockProfile = {
            id: 1,
            username: 'testuser',
            nickname: 'Test User',
            role: 'student',
            title: 'Beginner',
            avatar: null,
            wallpaper: null,
            total_points: 100,
        };

        render(
            <MemoryRouter>
                <ProfileHeader profile={mockProfile} isOwnProfile={true} />
            </MemoryRouter>
        );

        expect(screen.getByText('Test User')).toBeInTheDocument();
        expect(screen.getByText('@testuser')).toBeInTheDocument();
    });

    it('renders edit profile button if it is own profile', () => {
        const mockProfile = {
            id: 1,
            username: 'testuser',
            nickname: 'Test User',
        };

        render(
            <MemoryRouter>
                <ProfileHeader profile={mockProfile} isOwnProfile={true} />
            </MemoryRouter>
        );

        expect(screen.getByRole('link', { name: /edit profile/i })).toHaveAttribute('href', '/settings');
    });

    it('does not render edit profile button if it is not own profile', () => {
        const mockProfile = {
            id: 2,
            username: 'otheruser',
            nickname: 'Other User',
        };

        render(
            <MemoryRouter>
                <ProfileHeader profile={mockProfile} isOwnProfile={false} />
            </MemoryRouter>
        );

        expect(screen.queryByRole('link', { name: /edit profile/i })).not.toBeInTheDocument();
    });
});
