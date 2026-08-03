import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import AdminUserDashboard from './AdminUserDashboard';
import client from '../../api/client';

vi.mock('../../api/client', () => ({
    default: {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
    }
}));

vi.mock('react-hot-toast', () => ({
    default: {
        success: vi.fn(),
        error: vi.fn(),
    }
}));

vi.mock('../../hooks/useSidebar', () => ({
    default: () => ({
        isOpen: true,
        toggleSidebar: vi.fn(),
    })
}));

vi.mock('react-router-dom', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        useNavigate: () => vi.fn(),
        useParams: () => ({ userId: '1' })
    };
});

describe('AdminUserDashboard Component Redesign', () => {
    const mockStudent = {
        id: 1,
        username: 'johndoe',
        nickname: 'John D',
        email: 'john@example.com',
        role: 'student',
        active_track: 'cs',
        can_chat: true,
        is_admin: false,
        is_approved: true,
        duck_balance: 150,
        packets: 5,
        drawer: '0xA6',
        is_online: true,
        current_activity: 'CS 1 - Intro'
    };

    beforeEach(() => {
        vi.clearAllMocks();
        client.get.mockImplementation((url) => {
            if (url.includes('/api/admin/user/1') && !url.includes('connection_card')) {
                return Promise.resolve({ data: { user: mockStudent } });
            }
            if (url.includes('/api/admin/users')) {
                return Promise.resolve({ data: { users: [] } });
            }
            if (url.includes('/api/project-templates')) {
                return Promise.resolve({ data: { data: { templates: { 'Game Template': { description: 'Fun game' } } } } });
            }
            if (url.includes('connection_card')) {
                return Promise.resolve({ data: { status: 'success', data: { connection_code: 'CODE999' } } });
            }
            if (url.includes('/api/admin/students/1/parents')) {
                return Promise.resolve({ data: { success: true, parents: [] } });
            }
            return Promise.resolve({ data: {} });
        });
    });

    it('renders hero status bar and prominent track selector', async () => {
        render(
            <BrowserRouter>
                <AdminUserDashboard />
            </BrowserRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('John D')).toBeInTheDocument();
            expect(screen.getByText('@johndoe')).toBeInTheDocument();
        });

        // Top Status Indicator
        expect(screen.getByText('Online Now')).toBeInTheDocument();
        expect(screen.getByText('CS 1 - Intro')).toBeInTheDocument();

        // Mute toggle button
        expect(screen.getByText('Chat Enabled')).toBeInTheDocument();

        // Prominent track buttons
        expect(screen.getByText('Computer Science')).toBeInTheDocument();
        expect(screen.getByText('Ozaria')).toBeInTheDocument();
        expect(screen.getByText('Game Development')).toBeInTheDocument();
        expect(screen.getByText('Web Development')).toBeInTheDocument();
    });

    it('triggers track update when clicking track pill', async () => {
        client.put.mockResolvedValueOnce({ data: { status: 'success', message: 'User updated' } });

        render(
            <BrowserRouter>
                <AdminUserDashboard />
            </BrowserRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Game Development')).toBeInTheDocument();
        });

        const gdTrackBtn = screen.getByText('Game Development').closest('button');
        fireEvent.click(gdTrackBtn);

        expect(client.put).toHaveBeenCalledWith(
            '/api/admin/user/1',
            expect.objectContaining({ active_track: 'gd' })
        );
    });

    it('handles quick duck preset click', async () => {
        render(
            <BrowserRouter>
                <AdminUserDashboard />
            </BrowserRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('+1')).toBeInTheDocument();
        });

        const preset1Btn = screen.getByText('+1');
        fireEvent.click(preset1Btn);

        const duckInputs = screen.getAllByPlaceholderText('+/-');
        expect(duckInputs[0].value).toBe('1');
    });
});
