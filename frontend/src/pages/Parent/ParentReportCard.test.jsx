import React from 'react';

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ParentReportCard from './ParentReportCard';
import client from '../../api/client';
// eslint-disable-next-line
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

const attempt = (overrides = {}) => ({
    id: 5,
    status: 'submitted',
    quiz: { slug: 'grade-3-5', title: 'Olympiad 3-5' },
    student: { id: 1, username: 'student1', nickname: 'Bob' },
    started_at: '2026-03-04T10:00:00Z',
    submitted_at: '2026-03-04T10:20:00Z',
    elapsed_seconds: 1200,
    correct: 24,
    total: 30,
    score_percent: 80,
    ...overrides,
});

// Serves the report and history, plus the student's test attempts (none by default)
const serve = ({ report = mockReport, history = mockHistory, attempts = [], attemptsError = null } = {}) => {
    client.get.mockImplementation((url) => {
        if (url.includes('/report')) return Promise.resolve({ data: { data: report } });
        if (url.includes('/history')) return Promise.resolve({ data: { data: history } });
        if (url.includes('/api/quizzes/students/')) {
            return attemptsError
                ? Promise.reject(attemptsError)
                : Promise.resolve({ data: { data: { student: { id: 1 }, attempts } } });
        }
        return Promise.reject(new Error('Not found'));
    });
};

const renderCard = () =>
    render(
        <MemoryRouter initialEntries={['/parent/report/1']}>
            <Routes>
                <Route path="/parent/report/:studentId" element={<ParentReportCard />} />
            </Routes>
        </MemoryRouter>
    );

describe('ParentReportCard Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        serve();
    });

    it.skip('renders report header with accessible options button', async () => {
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

    it.skip('opens options dropdown and triggers disconnect modal', async () => {
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

    it('shows the day an achievement was earned from a UTC timestamp, with or without the UTC mark', async () => {
        const report = {
            ...mockReport,
            unlocked_achievements: [
                { id: 1, name: 'Marked', slug: 'marked', earned_at: '2024-05-01T23:30:00Z' },
                { id: 2, name: 'Bare', slug: 'bare', earned_at: '2024-05-01T23:30:00' },
            ],
        };
        client.get.mockImplementation((url) => {
            if (url.includes('/report')) return Promise.resolve({ data: { data: report } });
            if (url.includes('/history')) return Promise.resolve({ data: { data: mockHistory } });
            return Promise.reject(new Error('Not found'));
        });

        render(
            <MemoryRouter initialEntries={['/parent/report/1']}>
                <Routes>
                    <Route path="/parent/report/:studentId" element={<ParentReportCard />} />
                </Routes>
            </MemoryRouter>
        );

        const expected = `Earned ${new Date('2024-05-01T23:30:00Z').toLocaleDateString()}`;
        expect(await screen.findAllByText(expected)).toHaveLength(2);
    });

    it('does not show the empty state for a 3D-only student', async () => {
        const threeDReport = {
            ...mockReport,
            td_levels: 3,
            cc_levels: 0,
            oz_levels: 0,
            slug: 'student3d',
            course_progress: {
                codecombat: { levels_completed: 0, breakdown: [] },
                ozaria: { levels_completed: 0, breakdown: [] },
                '3d-modeling': {
                    levels_completed: 3,
                    breakdown: [
                        { course_name: 'TinkerCAD 1', course_id: '3d-1', levels_completed: 3, levels_total: 6 }
                    ]
                }
            }
        };
        client.get.mockImplementation((url) => {
            if (url.includes('/report')) return Promise.resolve({ data: { data: threeDReport } });
            if (url.includes('/history')) {
                return Promise.resolve({
                    data: { data: { duck_history: { labels: [], data: [] }, challenge_history: { labels: [], data: [] }, recent_events: [] } }
                });
            }
            return Promise.reject(new Error('Not found'));
        });

        render(
            <MemoryRouter initialEntries={['/parent/report/1']}>
                <Routes>
                    <Route path="/parent/report/:studentId" element={<ParentReportCard />} />
                </Routes>
            </MemoryRouter>
        );

        expect(await screen.findByText('TinkerCAD 1')).toBeInTheDocument();
        expect(screen.queryByText(/You'll be able to see your child's activity here/i)).not.toBeInTheDocument();
    });

    describe('Tests section', () => {
        it('is hidden when the student has no attempts', async () => {
            renderCard();
            expect(await screen.findByText('Bob')).toBeInTheDocument();
            await waitFor(() => expect(client.get).toHaveBeenCalledWith('/api/quizzes/students/1/attempts'));
            expect(screen.queryByRole('heading', { name: /Tests/ })).not.toBeInTheDocument();
        });

        it('is hidden when the attempts request fails', async () => {
            serve({ attemptsError: { response: { status: 403 } } });
            renderCard();
            expect(await screen.findByText('Bob')).toBeInTheDocument();
            await waitFor(() => expect(client.get).toHaveBeenCalledWith('/api/quizzes/students/1/attempts'));
            expect(screen.queryByRole('heading', { name: /Tests/ })).not.toBeInTheDocument();
        });

        it('lists submitted attempts with score and percent, linked to the result', async () => {
            serve({ attempts: [attempt(), attempt({ id: 4, quiz: { slug: 'g', title: 'Olympiad 6-8' }, correct: 9, total: 30, score_percent: 30 })] });
            renderCard();

            expect(await screen.findByRole('heading', { name: /Tests/ })).toBeInTheDocument();
            const first = screen.getByRole('link', { name: /Olympiad 3-5/ });
            expect(first).toHaveAttribute('href', '/parent/tests/results/5');
            expect(first).toHaveTextContent('24/30');
            expect(first).toHaveTextContent('80%');
            expect(first).toHaveTextContent(new Date('2026-03-04T10:20:00Z').toLocaleDateString());
            const second = screen.getByRole('link', { name: /Olympiad 6-8/ });
            expect(second).toHaveAttribute('href', '/parent/tests/results/4');
            expect(second).toHaveTextContent('9/30');
            expect(second).toHaveTextContent('30%');
        });

        it('shows an unfinished attempt as In progress, without a link', async () => {
            serve({
                attempts: [attempt({ id: 6, status: 'in_progress', submitted_at: null, correct: null, score_percent: null, quiz: { slug: 'g', title: 'Olympiad 9-11' } })],
            });
            renderCard();

            expect(await screen.findByText('Olympiad 9-11')).toBeInTheDocument();
            expect(screen.getByText('In progress')).toBeInTheDocument();
            expect(screen.queryByRole('link', { name: /Olympiad 9-11/ })).not.toBeInTheDocument();
        });

        it('replaces the welcome state when the only activity is test attempts', async () => {
            serve({
                report: { ...mockReport, course_progress: {} },
                history: { duck_history: { labels: [], data: [] }, challenge_history: { labels: [], data: [] }, recent_events: [] },
                attempts: [attempt()],
            });
            renderCard();

            expect(await screen.findByRole('link', { name: /Olympiad 3-5/ })).toBeInTheDocument();
            expect(screen.queryByText(/You'll be able to see your child's activity here/i)).not.toBeInTheDocument();
        });
    });
});
