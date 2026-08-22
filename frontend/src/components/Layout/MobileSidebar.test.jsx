import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import MobileSidebar from './MobileSidebar';
import client from '../../api/client';
import useAuthStore from '../../store/useAuthStore';

// Mock dependencies
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
        // Default store state
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

        expect(client.get).toHaveBeenCalledWith(expect.stringContaining('/api/parents/children'));
        expect(screen.queryByText(/Chat/i)).not.toBeInTheDocument();
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
