import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import AdminLayout from './AdminLayout';
import { mockMatchMedia } from '../../test/mockMatchMedia';
import useAuthStore from '../../store/useAuthStore';
import client from '../../api/client';
import { SidebarProvider } from '../../context/SidebarContext';
import AdminPageHeader from '../admin/AdminPageHeader';

vi.mock('../../api/client', () => ({
    default: {
        get: vi.fn().mockResolvedValue({ data: { status: 'error' } }),
        post: vi.fn().mockResolvedValue({ data: { status: 'success' } }),
    },
}));

const renderLayout = (children) => render(
    <MemoryRouter initialEntries={['/admin/dashboard']}>
        <SidebarProvider>
            <AdminLayout>{children}</AdminLayout>
        </SidebarProvider>
    </MemoryRouter>
);

describe('AdminLayout Component', () => {
    beforeEach(() => {
        useAuthStore.setState({
            isAuthenticated: true,
            user: { role: 'admin', username: 'admin1' },
        });
    });

    it('renders the sidebar and its children for an admin', () => {
        renderLayout(<div>Admin Page Content</div>);

        expect(screen.getByRole('link', { name: 'Admin HQ Home' })).toBeInTheDocument();
        expect(screen.getByText('Admin Page Content')).toBeInTheDocument();
    });

    it('links to the Tests page in the rail', () => {
        renderLayout(<div>Admin Page Content</div>);

        expect(screen.getByRole('link', { name: 'Tests' })).toHaveAttribute('href', '/admin/tests');
    });

    it('shows Access Denied instead of the children for a non-admin', () => {
        useAuthStore.setState({ user: { role: 'student', username: 'student1' } });

        renderLayout(<div>Admin Page Content</div>);

        expect(screen.getByText('Access Denied')).toBeInTheDocument();
        expect(screen.queryByText('Admin Page Content')).not.toBeInTheDocument();
    });

    it('keeps the sidebar mounted and shows an in-content loader while a lazy page loads', async () => {
        let resolveChunk;
        const LazyPage = React.lazy(() => new Promise((resolve) => {
            resolveChunk = () => resolve({ default: () => <div>Lazy Admin Page</div> });
        }));

        renderLayout(<LazyPage />);

        // Sidebar stays on screen; only the <main> content area shows the loader.
        expect(screen.getByRole('link', { name: 'Admin HQ Home' })).toBeInTheDocument();
        const loader = screen.getByRole('status', { name: 'Loading page' });
        expect(screen.getByRole('main')).toContainElement(loader);
        expect(screen.queryByText('Lazy Admin Page')).not.toBeInTheDocument();

        await act(async () => {
            resolveChunk();
        });

        expect(screen.getByText('Lazy Admin Page')).toBeInTheDocument();
        expect(screen.queryByRole('status', { name: 'Loading page' })).not.toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Admin HQ Home' })).toBeInTheDocument();
    });
});

describe('AdminLayout mobile menu', () => {
    beforeEach(() => {
        useAuthStore.setState({
            isAuthenticated: true,
            user: { role: 'admin', username: 'admin1' },
        });
    });

    it('has a menu button that is not a submit button and starts collapsed', () => {
        renderLayout(<div>Admin Page Content</div>);

        const menu = screen.getByRole('button', { name: 'Open Sidebar' });
        expect(menu).toHaveAttribute('type', 'button');
        expect(menu).toHaveAttribute('aria-expanded', 'false');
    });

    it('opens the sidebar from the keyboard and reports it with aria-expanded', async () => {
        const user = userEvent.setup();
        const { container } = renderLayout(<div>Admin Page Content</div>);
        const menu = screen.getByRole('button', { name: 'Open Sidebar' });
        expect(container.querySelector('.admin-app-container')).not.toHaveClass('mobile-open');

        menu.focus();
        await user.keyboard('{Enter}');

        expect(container.querySelector('.admin-app-container')).toHaveClass('mobile-open');
        expect(menu).toHaveAttribute('aria-expanded', 'true');

        await user.click(screen.getByRole('button', { name: 'Close sidebar' }));

        expect(container.querySelector('.admin-app-container')).not.toHaveClass('mobile-open');
        expect(menu).toHaveAttribute('aria-expanded', 'false');
    });

    it('closes the open menu when the route changes', async () => {
        const user = userEvent.setup();
        const { container } = render(
            <MemoryRouter initialEntries={['/admin']}>
                <SidebarProvider>
                    <AdminLayout><div>Admin Page Content</div></AdminLayout>
                </SidebarProvider>
            </MemoryRouter>
        );

        await user.click(screen.getByRole('button', { name: 'Open Sidebar' }));
        expect(container.querySelector('.admin-app-container')).toHaveClass('mobile-open');

        await user.click(screen.getByRole('link', { name: 'User Management' }));

        expect(container.querySelector('.admin-app-container')).not.toHaveClass('mobile-open');
    });

    it('is the only menu button on a page that has a page header', () => {
        renderLayout(<AdminPageHeader title="User Directory" />);

        expect(screen.getByRole('heading', { level: 1, name: 'User Directory' })).toBeInTheDocument();
        // "Close menu" is the overlay behind the open drawer; the only control that opens the menu is Open Sidebar
        expect(screen.getAllByRole('button', { name: /menu|sidebar/i }).map((b) => b.getAttribute('aria-label')))
            .toEqual(['Close menu', 'Close sidebar', 'Open Sidebar']);
    });
});

describe('AdminLayout logout', () => {
    // The probe sits outside AdminLayout: signing out turns the layout into Access Denied
    const LocationProbe = () => <div data-testid="location">{useLocation().pathname}</div>;

    const renderWithLocation = () => render(
        <MemoryRouter initialEntries={['/admin/dashboard']}>
            <SidebarProvider>
                <AdminLayout><div>Admin Page Content</div></AdminLayout>
                <LocationProbe />
            </SidebarProvider>
        </MemoryRouter>
    );

    beforeEach(() => {
        useAuthStore.setState({
            isAuthenticated: true,
            user: { role: 'admin', username: 'admin1' },
        });
    });

    it('signs out and returns to the landing page through the router', async () => {
        renderWithLocation();

        await userEvent.click(screen.getByRole('button', { name: 'Logout' }));

        await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('/'));
        expect(useAuthStore.getState().isAuthenticated).toBe(false);
        expect(client.post).toHaveBeenCalledWith('/user/logout');
    });

    it('still leaves the admin area when the logout request fails', async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        renderWithLocation();
        client.post.mockRejectedValueOnce(new Error('Network Error'));

        await userEvent.click(screen.getByRole('button', { name: 'Logout' }));

        await waitFor(() => expect(screen.getByTestId('location').textContent).toBe('/'));
        expect(useAuthStore.getState().isAuthenticated).toBe(false);
        warn.mockRestore();
    });
});
describe('AdminLayout skip link and focus', () => {
    beforeEach(() => {
        useAuthStore.setState({
            isAuthenticated: true,
            user: { role: 'admin', username: 'admin1' },
        });
    });

    it('makes "Skip to content" the first control in the tab order and lands focus on main', async () => {
        const user = userEvent.setup();
        renderLayout(<div>Admin Page Content</div>);
        const main = screen.getByRole('main');
        expect(main).toHaveAttribute('id', 'main-content');
        expect(main).toHaveAttribute('tabindex', '-1');

        await user.tab();
        const skip = screen.getByRole('link', { name: 'Skip to content' });
        expect(skip).toHaveFocus();
        expect(skip).toHaveAttribute('href', '#main-content');

        await user.keyboard('{Enter}');
        expect(main).toHaveFocus();
    });

    it('moves focus to main when the route changes, but not on the first render', async () => {
        const user = userEvent.setup();
        renderLayout(<div>Admin Page Content</div>);
        const main = screen.getByRole('main');
        expect(main).not.toHaveFocus();

        await user.click(screen.getByRole('link', { name: 'User Management' }));

        expect(main).toHaveFocus();
    });
});

describe('AdminLayout sidebar as a drawer', () => {
    const DRAWER = '(max-width: 800px)';
    let media;

    beforeEach(() => {
        media = mockMatchMedia([DRAWER]);
        useAuthStore.setState({
            isAuthenticated: true,
            user: { role: 'admin', username: 'admin1' },
        });
    });
    afterEach(() => media.restore());

    const sidebar = (container) => container.querySelector('aside.admin-sidebar');

    it('is inert while closed and wired to the Open Sidebar button with aria-controls', () => {
        const { container } = renderLayout(<div>Admin Page Content</div>);

        expect(sidebar(container)).toHaveAttribute('inert');
        const menu = screen.getByRole('button', { name: 'Open Sidebar' });
        expect(menu).toHaveAttribute('aria-controls', sidebar(container).id);
        expect(sidebar(container).id).toBe('admin-sidebar');
    });

    it('opens with focus inside, closes on Escape and returns focus to the button', async () => {
        const user = userEvent.setup();
        const { container } = renderLayout(<div>Admin Page Content</div>);
        const menu = screen.getByRole('button', { name: 'Open Sidebar' });

        await user.click(menu);

        expect(sidebar(container)).not.toHaveAttribute('inert');
        expect(screen.getByRole('button', { name: 'Close sidebar' })).toHaveFocus();

        await user.keyboard('{Escape}');

        expect(container.querySelector('.admin-app-container')).not.toHaveClass('mobile-open');
        expect(sidebar(container)).toHaveAttribute('inert');
        expect(menu).toHaveFocus();
    });

    it('names the overlay "Close menu", keeps it out of the tab order and closes on click', async () => {
        const user = userEvent.setup();
        const { container } = renderLayout(<div>Admin Page Content</div>);
        await user.click(screen.getByRole('button', { name: 'Open Sidebar' }));

        const overlay = screen.getByRole('button', { name: 'Close menu' });
        expect(overlay).toHaveAttribute('tabindex', '-1');
        await user.click(overlay);

        expect(container.querySelector('.admin-app-container')).not.toHaveClass('mobile-open');
    });

    it('is never inert, and Escape does nothing, in the desktop layout where the rail is always on screen', async () => {
        media.set(DRAWER, false);
        const user = userEvent.setup();
        const { container } = renderLayout(<div>Admin Page Content</div>);

        expect(sidebar(container)).not.toHaveAttribute('inert');

        await user.click(screen.getByRole('button', { name: 'Open Sidebar' }));
        await user.keyboard('{Escape}');

        expect(container.querySelector('.admin-app-container')).toHaveClass('mobile-open');
    });

    it('closes an open drawer when the window grows into the desktop layout', async () => {
        const user = userEvent.setup();
        const { container } = renderLayout(<div>Admin Page Content</div>);
        await user.click(screen.getByRole('button', { name: 'Open Sidebar' }));
        expect(container.querySelector('.admin-app-container')).toHaveClass('mobile-open');

        media.set(DRAWER, false);

        expect(container.querySelector('.admin-app-container')).not.toHaveClass('mobile-open');
        expect(sidebar(container)).not.toHaveAttribute('inert');
    });
});
