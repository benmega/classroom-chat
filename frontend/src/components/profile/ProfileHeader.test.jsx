import React from 'react';
import { vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
                <ProfileHeader target={mockProfile} isOwner={true} />
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
                <ProfileHeader target={mockProfile} isOwner={true} />
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
                <ProfileHeader target={mockProfile} isOwner={false} />
            </MemoryRouter>
        );

        expect(screen.queryByRole('link', { name: /edit profile/i })).not.toBeInTheDocument();
    });

    describe('profile photo', () => {
        const profile = { id: 1, username: 'testuser', nickname: 'Test User' };
        const renderHeader = (props) => {
            const pfpInputRef = React.createRef();
            render(
                <MemoryRouter>
                    <ProfileHeader target={profile} pfpInputRef={pfpInputRef} onPfpChange={vi.fn()} {...props} />
                </MemoryRouter>
            );
            return pfpInputRef;
        };

        it('is a named button for the owner that opens the file picker with the mouse', () => {
            const pfpInputRef = renderHeader({ isOwner: true });
            const clickSpy = vi.spyOn(pfpInputRef.current, 'click').mockImplementation(() => {});

            fireEvent.click(screen.getByRole('button', { name: 'Change profile photo' }));

            expect(clickSpy).toHaveBeenCalledTimes(1);
        });

        it('opens the file picker from the keyboard for the owner', async () => {
            const user = userEvent.setup();
            const pfpInputRef = renderHeader({ isOwner: true });
            const clickSpy = vi.spyOn(pfpInputRef.current, 'click').mockImplementation(() => {});

            await user.tab();
            const button = screen.getByRole('button', { name: 'Change profile photo' });
            expect(button).toHaveFocus();
            await user.keyboard('{Enter}');
            await user.keyboard(' ');

            expect(clickSpy).toHaveBeenCalledTimes(2);
        });

        it('is not a button or tab stop for visitors, who cannot change it', () => {
            renderHeader({ isOwner: false });

            expect(screen.queryByRole('button', { name: 'Change profile photo' })).not.toBeInTheDocument();
            const wrapper = screen.getByRole('img', { name: 'testuser' }).closest('.avatar-wrapper');
            expect(wrapper).not.toHaveAttribute('role');
            expect(wrapper).not.toHaveAttribute('tabindex');
            expect(wrapper).not.toHaveAttribute('aria-label');
        });

        it('keeps the picture description for visitors', () => {
            renderHeader({ isOwner: false });

            expect(screen.getByRole('img', { name: 'testuser' })).toBeInTheDocument();
        });
    });
});
