import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Layout from './Layout';
import * as AuthContext from '../../context/AuthContext';
import * as SocketContext from '../../context/SocketContext';
import * as LayoutHook from '../../hooks/useLayout';

vi.mock('../../context/AuthContext');
vi.mock('../../context/SocketContext');
vi.mock('../../hooks/useLayout');

describe('Layout Header Drawer Icon', () => {
    const mockSocket = { emit: vi.fn(), on: vi.fn(), off: vi.fn() };

    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(SocketContext, 'useSocket').mockReturnValue({ socket: mockSocket });
        vi.spyOn(LayoutHook, 'useLayout').mockReturnValue({
            unreadCount: 0,
            hasUnreadGlobalAnnouncements: false,
            isDropdownOpen: false,
            setIsDropdownOpen: vi.fn(),
            dropdownRef: { current: null },
            toggleDropdown: vi.fn(),
            hamburgerProgress: 1,
            location: { pathname: '/' },
        });
    });

    it('renders drawer badge in header for student users', () => {
        vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
            isAuthenticated: true,
            user: { role: 'student', drawer: '0x01', username: 'student1' },
            logout: vi.fn(),
        });

        render(
            <MemoryRouter>
                <Layout>Test Content</Layout>
            </MemoryRouter>
        );

        expect(screen.getByTestId('header-drawer')).toBeInTheDocument();
    });

    it('does not render drawer badge in header for parent users', () => {
        vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
            isAuthenticated: true,
            user: { role: 'parent', drawer: '0x01', username: 'parent1' },
            logout: vi.fn(),
        });

        render(
            <MemoryRouter>
                <Layout>Test Content</Layout>
            </MemoryRouter>
        );

        expect(screen.queryByTestId('header-drawer')).not.toBeInTheDocument();
    });
});
