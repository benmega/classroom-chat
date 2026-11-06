import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Layout from './Layout';
import { useLayout } from '../../hooks/useLayout';

// Mock child components
vi.mock('./ParentNavRail', () => ({
    default: () => <div data-testid="parent-nav-rail">ParentNavRail</div>
}));

vi.mock('./DesktopNavRail', () => ({
    default: () => <div data-testid="desktop-nav-rail">DesktopNavRail</div>
}));

vi.mock('./MobileSidebar', () => ({
    default: ({ isSidebarOpen }) => <div data-testid="mobile-sidebar" data-open={isSidebarOpen}>MobileSidebar</div>
}));

vi.mock('../common/UserSearch', () => ({
    default: () => <div data-testid="user-search">UserSearch</div>
}));

vi.mock('../common/Tutorial', () => ({
    default: () => <div data-testid="tutorial">Tutorial</div>
}));

vi.mock('../../hooks/useLayout', () => ({
    useLayout: vi.fn(),
}));

describe('Layout Component', () => {
    const defaultLayoutContext = {
        user: { role: 'student', username: 'student1' },
        isAuthenticated: true,
        isDropdownOpen: false,
        setIsDropdownOpen: vi.fn(),
        dropdownRef: { current: null },
        isSidebarOpen: false,
        setSidebarOpen: vi.fn(),
        toggleSidebar: vi.fn(),
        toggleDropdown: vi.fn(),
        handleLogout: vi.fn(),
        isGuestPage: false,
        isChatPage: false,
        location: { pathname: '/' },
        hamburgerProgress: 0,
        activityUnreadCount: 0,
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders correctly for unauthenticated user (guest page)', () => {
        useLayout.mockReturnValue({
            ...defaultLayoutContext,
            isAuthenticated: false,
            user: null,
            isGuestPage: true,
        });

        render(
            <MemoryRouter>
                <Layout>
                    <div>Page Content</div>
                </Layout>
            </MemoryRouter>
        );

        expect(screen.getByText('Page Content')).toBeInTheDocument();
        expect(screen.queryByTestId('tutorial')).not.toBeInTheDocument();
        expect(screen.queryByTestId('desktop-nav-rail')).not.toBeInTheDocument();
        expect(screen.queryByTestId('parent-nav-rail')).not.toBeInTheDocument();
        expect(screen.queryByText('Login')).not.toBeInTheDocument();
    });

    it('renders correctly for student user', () => {
        useLayout.mockReturnValue({
            ...defaultLayoutContext,
            user: { role: 'student', username: 'student1' },
            isAuthenticated: true,
        });

        render(
            <MemoryRouter>
                <Layout>
                    <div>Student Content</div>
                </Layout>
            </MemoryRouter>
        );

        expect(screen.getByTestId('tutorial')).toBeInTheDocument();
        expect(screen.getByTestId('desktop-nav-rail')).toBeInTheDocument();
        expect(screen.getByTestId('user-search')).toBeInTheDocument();
        expect(screen.queryByTestId('parent-nav-rail')).not.toBeInTheDocument();
        
        // Hamburger toggle for mobile
        expect(screen.getByLabelText(/Toggle Sidebar/i)).toBeInTheDocument();
        expect(screen.getByTestId('mobile-sidebar')).toBeInTheDocument();
    });

    it('shows the duck balance in the header and no badge for the removed locker drawer', () => {
        useLayout.mockReturnValue({
            ...defaultLayoutContext,
            user: { role: 'student', username: 'student1', duck_balance: 12 },
            isAuthenticated: true,
        });

        render(
            <MemoryRouter>
                <Layout>
                    <div>Student Content</div>
                </Layout>
            </MemoryRouter>
        );

        expect(screen.getByTestId('nav-bit-shift')).toHaveTextContent('12');
        expect(screen.queryByText('Drawer')).not.toBeInTheDocument();
        expect(screen.queryByText('N/A')).not.toBeInTheDocument();
    });

    it('renders correctly for parent user', () => {
        useLayout.mockReturnValue({
            ...defaultLayoutContext,
            user: { role: 'parent', username: 'parent1' },
            isAuthenticated: true,
        });

        render(
            <MemoryRouter>
                <Layout>
                    <div>Parent Content</div>
                </Layout>
            </MemoryRouter>
        );

        expect(screen.getByTestId('parent-nav-rail')).toBeInTheDocument();
        expect(screen.queryByTestId('desktop-nav-rail')).not.toBeInTheDocument();
        expect(screen.getByTestId('user-search')).toBeInTheDocument();
        expect(screen.getByTestId('mobile-sidebar')).toBeInTheDocument();
        
        // Logo link for parent should point to dashboard
        const logoLink = screen.getByRole('link', { name: /Classroom Chat Logo/i });
        expect(logoLink.getAttribute('href')).toBe('/parent/dashboard');
    });

    it('toggles sidebar and dropdown appropriately', async () => {
        const toggleSidebar = vi.fn();
        const toggleDropdown = vi.fn();
        
        useLayout.mockReturnValue({
            ...defaultLayoutContext,
            toggleSidebar,
            toggleDropdown,
        });

        render(
            <MemoryRouter>
                <Layout>
                    <div>Content</div>
                </Layout>
            </MemoryRouter>
        );

        const hamburgerBtn = screen.getByLabelText(/Toggle Sidebar/i);
        await userEvent.click(hamburgerBtn);
        expect(toggleSidebar).toHaveBeenCalledTimes(1);
    });

    it('keeps the nav rail mounted and shows an in-content loader while a lazy page loads', async () => {
        useLayout.mockReturnValue({ ...defaultLayoutContext });

        let resolveChunk;
        const LazyPage = React.lazy(() => new Promise((resolve) => {
            resolveChunk = () => resolve({ default: () => <div>Lazy Page Content</div> });
        }));

        render(
            <MemoryRouter>
                <Layout>
                    <LazyPage />
                </Layout>
            </MemoryRouter>
        );

        // Layout chrome stays on screen; only the <main> content area shows the loader.
        expect(screen.getByTestId('desktop-nav-rail')).toBeInTheDocument();
        expect(screen.getByTestId('user-search')).toBeInTheDocument();
        const loader = screen.getByRole('status', { name: 'Loading page' });
        expect(screen.getByRole('main')).toContainElement(loader);
        expect(screen.queryByText('Lazy Page Content')).not.toBeInTheDocument();

        await act(async () => {
            resolveChunk();
        });

        expect(screen.getByText('Lazy Page Content')).toBeInTheDocument();
        expect(screen.queryByRole('status', { name: 'Loading page' })).not.toBeInTheDocument();
        expect(screen.getByTestId('desktop-nav-rail')).toBeInTheDocument();
    });
});
describe('Layout skip link and focus handling', () => {
    const context = {
        user: { role: 'student', username: 'student1' },
        isAuthenticated: true,
        isSidebarOpen: false,
        setSidebarOpen: vi.fn(),
        toggleSidebar: vi.fn(),
        handleLogout: vi.fn(),
        isGuestPage: false,
        isChatPage: false,
        location: { pathname: '/profile' },
        hamburgerProgress: 0,
        activityUnreadCount: 0,
    };

    const renderAt = (pathname, children = <div>Page Content</div>) => {
        useLayout.mockReturnValue({ ...context, location: { pathname } });
        const ui = (inner) => (
            <MemoryRouter>
                <Layout>{inner}</Layout>
            </MemoryRouter>
        );
        const view = render(ui(children));
        return {
            ...view,
            goTo: (next, inner = children) => {
                useLayout.mockReturnValue({ ...context, location: { pathname: next } });
                view.rerender(ui(inner));
            },
        };
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('gives main an id and tabIndex so the skip link and route changes can focus it', () => {
        renderAt('/profile');

        const main = screen.getByRole('main');
        expect(main).toHaveAttribute('id', 'main-content');
        expect(main).toHaveAttribute('tabindex', '-1');
    });

    it('puts "Skip to content" first in the tab order; activating it focuses main', async () => {
        const user = userEvent.setup();
        renderAt('/profile');

        await user.tab();
        const skip = screen.getByRole('link', { name: 'Skip to content' });
        expect(skip).toHaveFocus();
        expect(skip).toHaveAttribute('href', '#main-content');

        await user.keyboard('{Enter}');
        expect(screen.getByRole('main')).toHaveFocus();
    });

    it('points the hamburger at the sidebar it opens', () => {
        renderAt('/profile');

        const hamburger = screen.getByRole('button', { name: 'Toggle Sidebar' });
        expect(hamburger).toHaveAttribute('aria-controls', 'mobile-sidebar');
        expect(hamburger).toHaveAttribute('aria-expanded', 'false');
    });

    it('does not move focus on the first render', () => {
        renderAt('/profile');

        expect(screen.getByRole('main')).not.toHaveFocus();
        expect(document.body).toHaveFocus();
    });

    it('moves focus to the new main when the pathname changes', () => {
        const { goTo } = renderAt('/profile');
        const before = screen.getByRole('main');

        goTo('/achievements');

        const after = screen.getByRole('main');
        expect(after).not.toBe(before); // main is remounted per path
        expect(after).toHaveFocus();
    });

    it('leaves focus alone when the page already focused something inside itself', () => {
        // like a page that focuses its search field when it mounts
        const FocusesItself = () => {
            const ref = React.useRef(null);
            React.useEffect(() => ref.current.focus(), []);
            return <input ref={ref} aria-label="Search" />;
        };
        const { goTo } = renderAt('/profile');

        goTo('/chat', <FocusesItself />);

        expect(screen.getByLabelText('Search')).toHaveFocus();
    });

    it('does not steal focus when the same path re-renders', () => {
        const { goTo } = renderAt('/profile');
        const button = screen.getByRole('button', { name: 'Toggle Sidebar' });
        button.focus();

        goTo('/profile');

        expect(button).toHaveFocus();
    });
});
