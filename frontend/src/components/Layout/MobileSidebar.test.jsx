import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import MobileSidebar from './MobileSidebar';
import { mockMatchMedia } from '../../test/mockMatchMedia';
import client from '../../api/client';
import useAuthStore from '../../store/useAuthStore';


vi.mock('../../api/client', () => ({
    default: {
        get: vi.fn(),
    },
}));

vi.mock('../../store/useAuthStore', () => ({
    default: vi.fn(),
}));

vi.mock('../../utils/apiUrl', () => ({
    getApiUrl: (url) => `mocked-url-${url}`,
}));

describe('MobileSidebar Component', () => {
    const defaultProps = {
        user: { role: 'student', username: 'student1' },
        isParent: false,
        isSidebarOpen: true,
        setSidebarOpen: vi.fn(),
        handleLogout: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();

        useAuthStore.mockReturnValue({
            unreadCount: 0,
            activityUnreadCount: 0,
        });
    });

    it('renders student navigation correctly', () => {
        render(
            <MemoryRouter>
                <MobileSidebar {...defaultProps} />
            </MemoryRouter>
        );

        expect(screen.getByText(/Chat/i)).toBeInTheDocument();
        expect(screen.getByText(/Profile/i)).toBeInTheDocument();
        expect(screen.getByText(/Learning Path/i)).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Tests' })).toHaveAttribute('href', '/tests');
        expect(screen.queryByText(/Admin Panel/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/My Children/i)).not.toBeInTheDocument();
    });

    it('renders admin navigation correctly', () => {
        render(
            <MemoryRouter>
                <MobileSidebar {...defaultProps} user={{ role: 'admin', username: 'admin1' }} />
            </MemoryRouter>
        );

        expect(screen.getByText(/Admin Panel/i)).toBeInTheDocument();
        expect(screen.getByText(/Chat/i)).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Tests' })).toBeInTheDocument();
    });

    it('renders parent navigation and fetches children correctly', async () => {
        const mockChildren = [
            { id: 1, username: 'child1', nickname: 'Child One', profile_picture_url: 'child1.jpg' },
            { id: 2, username: 'child2', nickname: 'Child Two', profile_picture_url: 'Default_pfp.jpg' },
        ];
        client.get.mockResolvedValueOnce({ data: { children: mockChildren } });

        render(
            <MemoryRouter>
                <MobileSidebar {...defaultProps} isParent={true} user={{ role: 'parent', username: 'parent1' }} />
            </MemoryRouter>
        );

        expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
        
        await waitFor(() => {
            expect(screen.getByText(/My Children/i)).toBeInTheDocument();
            expect(screen.getByText(/Child One's Report/i)).toBeInTheDocument();
            expect(screen.getByText(/Child Two's Report/i)).toBeInTheDocument();
        });

        expect(client.get).toHaveBeenCalledWith(
            '/api/parents/children',
            expect.objectContaining({ signal: expect.any(AbortSignal) })
        );
        expect(screen.queryByText(/Chat/i)).not.toBeInTheDocument();
        expect(screen.queryByRole('link', { name: 'Tests' })).not.toBeInTheDocument();
    });

    it('shows unread badges correctly', () => {
        useAuthStore.mockReturnValue({
            unreadCount: 3,
            activityUnreadCount: 5,
        });

        render(
            <MemoryRouter>
                <MobileSidebar {...defaultProps} user={{ ...defaultProps.user, has_activity: true }} />
            </MemoryRouter>
        );

        const badges = screen.getAllByText(/[35]/);
        expect(badges.some(b => b.textContent === '3')).toBe(true);
        expect(badges.some(b => b.textContent === '5')).toBe(true);
    });

    it('calls close on overlay click', async () => {
        const setSidebarOpen = vi.fn();
        const { container } = render(
            <MemoryRouter>
                <MobileSidebar {...defaultProps} setSidebarOpen={setSidebarOpen} />
            </MemoryRouter>
        );

        const overlay = container.querySelector('.mobile-overlay');
        await userEvent.click(overlay);
        expect(setSidebarOpen).toHaveBeenCalledWith(false);
    });

    it('calls close on close button click', async () => {
        const setSidebarOpen = vi.fn();
        render(
            <MemoryRouter>
                <MobileSidebar {...defaultProps} setSidebarOpen={setSidebarOpen} />
            </MemoryRouter>
        );

        const closeBtn = screen.getByLabelText(/Close navigation/i);
        await userEvent.click(closeBtn);
        expect(setSidebarOpen).toHaveBeenCalledWith(false);
    });

    it('calls handleLogout when logout button is clicked', async () => {
        const handleLogout = vi.fn();
        render(
            <MemoryRouter>
                <MobileSidebar {...defaultProps} handleLogout={handleLogout} />
            </MemoryRouter>
        );

        const logoutBtn = screen.getByText(/Logout/i);
        await userEvent.click(logoutBtn);
        expect(handleLogout).toHaveBeenCalled();
        expect(defaultProps.setSidebarOpen).toHaveBeenCalledWith(false);
    });
});
describe('MobileSidebar keyboard and screen-reader behaviour', () => {
    const defaultProps = {
        user: { role: 'student', username: 'student1' },
        isParent: false,
        handleLogout: vi.fn(),
    };

    // The parent owns the open state, as Layout does through the sidebar context
    const Harness = ({ initiallyOpen = false, onSetOpen }) => {
        const [open, setOpen] = React.useState(initiallyOpen);
        const set = (value) => { onSetOpen?.(value); setOpen(value); };
        return (
            <MemoryRouter>
                <button type="button" onClick={() => set(true)}>Open menu</button>
                <MobileSidebar {...defaultProps} isSidebarOpen={open} setSidebarOpen={set} />
            </MemoryRouter>
        );
    };

    beforeEach(() => {
        useAuthStore.mockReturnValue({ unreadCount: 0, activityUnreadCount: 0 });
    });

    it('is inert while closed, so its links are not in the tab order, and is not once open', async () => {
        const { container } = render(<Harness />);
        const aside = container.querySelector('aside');

        expect(aside).toHaveAttribute('inert');
        expect(container.querySelector('.mobile-overlay')).toHaveAttribute('inert');

        await userEvent.click(screen.getByRole('button', { name: 'Open menu' }));

        expect(aside).not.toHaveAttribute('inert');
        expect(container.querySelector('.mobile-overlay')).not.toHaveAttribute('inert');
    });

    it('keeps the id the hamburger button points at with aria-controls', () => {
        const { container } = render(<Harness />);

        expect(container.querySelector('aside')).toHaveAttribute('id', 'mobile-sidebar');
    });

    it('moves focus in when opened, closes on Escape and gives focus back to the button that opened it', async () => {
        const onSetOpen = vi.fn();
        const { container } = render(<Harness onSetOpen={onSetOpen} />);
        const opener = screen.getByRole('button', { name: 'Open menu' });

        await userEvent.click(opener);
        expect(screen.getByRole('button', { name: 'Close navigation' })).toHaveFocus();

        await userEvent.keyboard('{Escape}');

        expect(onSetOpen).toHaveBeenLastCalledWith(false);
        expect(container.querySelector('aside')).toHaveAttribute('inert');
        expect(opener).toHaveFocus();
    });

    it('names the overlay "Close menu", keeps it out of the tab order and closes on click', async () => {
        const onSetOpen = vi.fn();
        render(<Harness initiallyOpen onSetOpen={onSetOpen} />);

        const overlay = screen.getByRole('button', { name: 'Close menu' });
        expect(overlay).toHaveAttribute('tabindex', '-1');
        expect(overlay.tagName).toBe('BUTTON');

        await userEvent.click(overlay);
        expect(onSetOpen).toHaveBeenCalledWith(false);
    });

    describe('when the window is widened', () => {
        let media;
        beforeEach(() => { media = mockMatchMedia(); });
        afterEach(() => media.restore());

        it('closes the open drawer once the desktop layout (which hides it) takes over', () => {
            const onSetOpen = vi.fn();
            render(<Harness initiallyOpen onSetOpen={onSetOpen} />);
            expect(onSetOpen).not.toHaveBeenCalled();

            media.set('(min-width: 801px)', true);

            expect(onSetOpen).toHaveBeenCalledWith(false);
        });

        it('does nothing while the drawer is closed', () => {
            const onSetOpen = vi.fn();
            render(<Harness onSetOpen={onSetOpen} />);

            media.set('(min-width: 801px)', true);

            expect(onSetOpen).not.toHaveBeenCalled();
        });
    });
});
