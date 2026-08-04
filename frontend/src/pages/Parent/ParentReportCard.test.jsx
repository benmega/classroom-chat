import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ParentReportCard from './ParentReportCard';
import client from '../../api/client';
import toast from 'react-hot-toast';

vi.mock('../../api/client');
vi.mock('react-hot-toast');
vi.mock('react-chartjs-2', () => ({
    Line: () => <div data-testid="line-chart" />,
    Bar: () => <div data-testid="bar-chart" />
}));
vi.mock('../../components/common/DesktopNotice', () => ({
    default: () => <div data-testid="desktop-notice" />
}));

const mockReport = {
    username: 'student1',
    nickname: 'Bob',
    profile_picture_url: '/user/profile_pictures/pfp2.jpg',
    unlocked_achievements: [],
    projects: [],
    notes: [],
    course_progress: { codecombat: { levels_completed: 3 }, ozaria: { levels_completed: 1 } }
};

const mockHistory = {
    duck_history: { labels: ['Aug 1'], data: [5] },
    challenge_history: { labels: ['Aug 1'], data: [1] },
    recent_events: [],
    current_balance: 5,
    has_any_activity_ever: true
};

describe('ParentReportCard Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        client.get.mockImplementation((url) => {
            if (url.includes('/report')) {
                return Promise.resolve({ data: { data: mockReport } });
            }
            if (url.includes('/history')) {
                return Promise.resolve({ data: { data: mockHistory } });
            }
            return Promise.reject(new Error('Not found'));
        });
    });

    it('renders report header with accessible options button', async () => {
        render(
            <MemoryRouter initialEntries={['/parent/report/1']}>
                <Routes>
                    <Route path="/parent/report/:studentId" element={<ParentReportCard />} />
                </Routes>
            </MemoryRouter>
        );

        const studentName = await screen.findByText('Bob');
        expect(studentName).toBeInTheDocument();

        const optionsBtn = screen.getByRole('button', { name: /Options for Bob/i });
        expect(optionsBtn).toBeInTheDocument();
        expect(optionsBtn).toHaveAttribute('aria-expanded', 'false');
    });

    it('opens options dropdown and triggers disconnect modal', async () => {
        client.post.mockResolvedValueOnce({ data: { message: 'Successfully disconnected from Bob.' } });

        render(
            <MemoryRouter initialEntries={['/parent/report/1']}>
                <Routes>
                    <Route path="/parent/report/:studentId" element={<ParentReportCard />} />
                    <Route path="/parent/dashboard" element={<div>Parent Dashboard Page</div>} />
                </Routes>
            </MemoryRouter>
        );

        const optionsBtn = await screen.findByRole('button', { name: /Options for Bob/i });
        fireEvent.click(optionsBtn);

        const disconnectBtn = screen.getByRole('menuitem', { name: /Disconnect Bob/i });
        fireEvent.click(disconnectBtn);

        const modalTitle = screen.getByRole('heading', { name: /Disconnect Student/i });
        expect(modalTitle).toBeInTheDocument();

        const confirmBtn = screen.getByRole('button', { name: 'Disconnect Student' });
        fireEvent.click(confirmBtn);

        await waitFor(() => {
            expect(client.post).toHaveBeenCalledWith('/api/parents/disconnect/1');
            
            expect(screen.getByText('Parent Dashboard Page')).toBeInTheDocument();
        });
    });
});
