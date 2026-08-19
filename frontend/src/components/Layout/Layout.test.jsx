import React from 'react';
import { render, screen } from '@testing-library/react';
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
            user: { role: 'student', username: 'student1', drawer: 'Draw1' },
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

        const profileToggle = screen.getByTestId('profile-toggle');
        await userEvent.click(profileToggle);
        expect(toggleDropdown).toHaveBeenCalledTimes(1);
    });

    it('calls handleLogout when logout is clicked from dropdown', async () => {
        const handleLogout = vi.fn();
        const setIsDropdownOpen = vi.fn();

        useLayout.mockReturnValue({
            ...defaultLayoutContext,
            handleLogout,
            setIsDropdownOpen,
        });

        render(
            <MemoryRouter>
                <Layout>
                    <div>Content</div>
                </Layout>
            </MemoryRouter>
        );

        const logoutBtn = screen.getByText('Logout');
        await userEvent.click(logoutBtn);
        expect(handleLogout).toHaveBeenCalledTimes(1);
        expect(setIsDropdownOpen).toHaveBeenCalledWith(false);
    });
});
