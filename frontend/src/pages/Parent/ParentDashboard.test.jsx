import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import ParentDashboard from './ParentDashboard';
import client from '../../api/client';


vi.mock('../../api/client');
vi.mock('react-hot-toast');
vi.mock('../../components/common/DesktopNotice', () => ({
    default: () => <div data-testid="desktop-notice" />
}));


vi.mock('../../utils/confirm', () => ({
    showConfirm: vi.fn()
}));

const mockChildren = [
    {
        id: 1,
        username: 'student1',
        nickname: 'Alice',
        profile_picture_url: '/user/profile_pictures/pfp1.jpg',
        current_activity: 'Coding',
        last_activity_time: new Date().toISOString()
    }
];

const mockReport = {
    username: 'student1',
    nickname: 'Alice',
    profile_picture_url: '/user/profile_pictures/pfp1.jpg',
    unlocked_achievements: [],
    projects: [],
    notes: [],
    course_progress: { codecombat: { levels_completed: 5 }, ozaria: { levels_completed: 2 } }
};

const mockHistory = {
    duck_history: { labels: ['Aug 1'], data: [10] },
    challenge_history: { labels: ['Aug 1'], data: [2] },
    recent_events: [
        { type: 'challenge', label: 'Completed level 1', timestamp: new Date().toISOString(), icon: 'zap' }
    ],
    current_balance: 10,
    has_any_activity_ever: true
};

describe('ParentDashboard Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        client.get.mockImplementation((url) => {
            if (url.includes('/api/parents/children')) {
                return Promise.resolve({ data: { children: mockChildren } });
            }
            if (url.includes('/report')) {
                return Promise.resolve({ data: { data: mockReport } });
            }
            if (url.includes('/history')) {
                return Promise.resolve({ data: { data: mockHistory } });
            }
            return Promise.reject(new Error('Not found'));
        });
    });

    it('renders family members list with accessible options menu', async () => {
        render(
            <MemoryRouter>
                <ParentDashboard />
            </MemoryRouter>
        );

        const studentNames = await screen.findAllByText('Alice');
        expect(studentNames.length).toBeGreaterThan(0);

        const optionsBtn = screen.getByRole('button', { name: /Options for Alice/i });
        expect(optionsBtn).toBeInTheDocument();
        expect(optionsBtn).toHaveAttribute('aria-expanded', 'false');
    });

    it('opens dropdown and displays accessible Disconnect Student option', async () => {
        render(
            <MemoryRouter>
                <ParentDashboard />
            </MemoryRouter>
        );

        const optionsBtn = await screen.findByRole('button', { name: /Options for Alice/i });
        fireEvent.click(optionsBtn);

        expect(optionsBtn).toHaveAttribute('aria-expanded', 'true');

        const disconnectBtns = screen.getAllByText(/Remove Child/i);
        expect(disconnectBtns[0]).toBeInTheDocument();
    });

    it('prompts confirm and disconnects student on confirm', async () => {
        const { showConfirm } = await import('../../utils/confirm');
        showConfirm.mockResolvedValue(true);
        client.post.mockResolvedValueOnce({ data: { message: 'Successfully disconnected from Alice.' } });

        render(
            <MemoryRouter>
                <ParentDashboard />
            </MemoryRouter>
        );

        const optionsBtn = await screen.findByRole('button', { name: /Options for Alice/i });
        fireEvent.click(optionsBtn);

        const disconnectBtns = screen.getAllByText(/Remove Child/i);
        fireEvent.click(disconnectBtns[0]);

        await waitFor(() => {
            expect(showConfirm).toHaveBeenCalledWith('Remove Alice?', { title: 'Remove Child', destructive: true });
        });
        await waitFor(() => {
            expect(client.post).toHaveBeenCalledWith('/api/parents/disconnect/1');
        });
    });
});
