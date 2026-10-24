import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { Link, MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import { server } from '../../test/mocks/server';
import TestResult from './TestResult';

vi.mock('../../components/quiz/DiagramFrame', () => ({
    default: ({ html }) => <div data-testid="diagram">{html}</div>,
}));

const result = (overrides = {}) => ({
    id: 12,
    status: 'submitted',
    quiz: { slug: 'grade-6-8', title: 'Olympiad 6-8' },
    student: { id: 33, username: 'sam', nickname: 'Sammy' },
    started_at: '2026-03-04T10:00:00Z',
    submitted_at: '2026-03-04T10:20:00Z',
    elapsed_seconds: 600,
    correct: 2,
    total: 3,
    score_percent: 67,
    wrong: 1,
    skipped: 0,
    domains: [{ domain: 'Logic', correct: 2, total: 3 }],
    review: [
        {
            number: 1, domain: 'Logic', prompt: 'Pick one', diagram_html: null,
            options: [{ letter: 'A', text: 'Yes' }, { letter: 'B', text: 'No' }],
            selected: 'A', answer: 'A', is_correct: true, explanation: 'Obvious',
        },
    ],
    ...overrides,
});

const serve = (body, status = 200) =>
    server.use(
        http.get('*/api/quizzes/attempts/:id', () =>
            status === 200
                ? HttpResponse.json({ status: 'success', data: { attempt: body }, error: null })
                : HttpResponse.json({ status: 'error', data: null, error: 'nope' }, { status }),
        ),
    );

const Where = () => <div data-testid="where">{useLocation().pathname}</div>;

const renderAt = (path) =>
    render(
        <MemoryRouter initialEntries={[path]}>
            <Routes>
                <Route path="/tests/results/:attemptId" element={<TestResult />} />
                <Route path="/parent/tests/results/:attemptId" element={<TestResult />} />
                <Route path="/admin/tests/results/:attemptId" element={<TestResult />} />
                <Route path="/tests/:slug" element={<Where />} />
            </Routes>
        </MemoryRouter>,
    );

describe('TestResult', () => {
    it('shows a loading line, then the result', async () => {
        serve(result());
        renderAt('/tests/results/12');
        const loading = screen.getByLabelText('Loading');
        expect(loading).toHaveAttribute('aria-busy', 'true');
        expect(loading.querySelectorAll('.skeleton-loader').length).toBeGreaterThan(0);
        expect(await screen.findByRole('heading', { name: 'Olympiad 6-8' })).toBeInTheDocument();
        expect(within(screen.getByRole('region', { name: 'Score' })).getByText('2/3')).toBeInTheDocument();
        expect(screen.getByText('Pick one')).toBeInTheDocument();
        expect(screen.queryByLabelText('Loading')).not.toBeInTheDocument();
    });

    it('requests the attempt id from the route', async () => {
        let requested;
        server.use(
            http.get('*/api/quizzes/attempts/:id', ({ params }) => {
                requested = params.id;
                return HttpResponse.json({ status: 'success', data: { attempt: result() }, error: null });
            }),
        );
        renderAt('/tests/results/12');
        await screen.findByRole('heading', { name: 'Olympiad 6-8' });
        expect(requested).toBe('12');
    });

    it('student route: back goes to /tests and the student is not named', async () => {
        serve(result());
        renderAt('/tests/results/12');
        await screen.findByRole('heading', { name: 'Olympiad 6-8' });
        expect(screen.getByRole('link', { name: 'Back to tests' })).toHaveAttribute('href', '/tests');
        expect(screen.queryByText('Sammy')).not.toBeInTheDocument();
    });

    it('parent route: back goes to the student report card and names the student', async () => {
        serve(result());
        renderAt('/parent/tests/results/12');
        await screen.findByRole('heading', { name: 'Olympiad 6-8' });
        expect(screen.getByRole('link', { name: 'Back to report card' })).toHaveAttribute('href', '/parent/report/33');
        expect(screen.getByText('Sammy')).toBeInTheDocument();
    });

    it('parent route: back goes to the dashboard until the student is known', () => {
        serve(result());
        renderAt('/parent/tests/results/12');
        expect(screen.getByRole('link', { name: 'Back to report card' })).toHaveAttribute('href', '/parent/dashboard');
    });

    it('admin route: back goes to /admin/tests and names the student', async () => {
        serve(result());
        renderAt('/admin/tests/results/12');
        await screen.findByRole('heading', { name: 'Olympiad 6-8' });
        expect(screen.getByRole('link', { name: 'Back to admin tests' })).toHaveAttribute('href', '/admin/tests');
        expect(screen.getByText('Sammy')).toBeInTheDocument();
    });

    it.each([403, 404])('shows one short line for a %i', async (status) => {
        serve(null, status);
        renderAt('/tests/results/12');
        expect(await screen.findByRole('alert')).toHaveTextContent('Result not available');
        expect(screen.queryByRole('heading')).not.toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Back to tests' })).toBeInTheDocument();
    });

    it('shows a generic line for other failures', async () => {
        serve(null, 500);
        renderAt('/tests/results/12');
        expect(await screen.findByRole('alert')).toHaveTextContent('Could not load result');
    });

    it('redirects to the test when the owner opens an unfinished attempt', async () => {
        serve({
            id: 12, status: 'in_progress', quiz: { slug: 'grade-6-8', title: 'Olympiad 6-8', time_limit_minutes: null },
            started_at: '2026-03-04T10:00:00Z', deadline: null, elapsed_seconds: 5, answers: {}, flagged: [], questions: [],
        });
        renderAt('/tests/results/12');
        await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/tests/grade-6-8'));
    });

    it('shows the in-progress state to a parent or admin without redirecting', async () => {
        serve({
            id: 12, status: 'in_progress', quiz: { slug: 'grade-6-8', title: 'Olympiad 6-8' },
            student: { id: 33, username: 'sam', nickname: 'Sammy' },
            started_at: '2026-03-04T10:00:00Z', submitted_at: null, elapsed_seconds: 5,
            correct: null, total: 3, score_percent: null,
        });
        renderAt('/parent/tests/results/12');
        expect(await screen.findByText('In progress')).toBeInTheDocument();
        expect(screen.queryByTestId('where')).not.toBeInTheDocument();
    });

    it('has no print button', async () => {
        serve(result());
        renderAt('/tests/results/12');
        await screen.findByRole('heading', { name: 'Olympiad 6-8' });
        expect(screen.queryByRole('button', { name: /print/i })).not.toBeInTheDocument();
    });

    it('does not show a previous result while the next one loads', async () => {
        let release;
        const gate = new Promise((resolve) => { release = resolve; });
        server.use(
            http.get('*/api/quizzes/attempts/:id', async ({ params }) => {
                if (params.id === '2') await gate;
                return HttpResponse.json({
                    status: 'success',
                    data: { attempt: result({ id: Number(params.id), quiz: { slug: 'q', title: `Quiz ${params.id}` } }) },
                    error: null,
                });
            }),
        );
        render(
            <MemoryRouter initialEntries={['/tests/results/1']}>
                <Link to="/tests/results/2">next</Link>
                <Routes>
                    <Route path="/tests/results/:attemptId" element={<TestResult />} />
                </Routes>
            </MemoryRouter>,
        );
        expect(await screen.findByRole('heading', { name: 'Quiz 1' })).toBeInTheDocument();
        await userEvent.click(screen.getByRole('link', { name: 'next' }));
        expect(screen.queryByRole('heading', { name: 'Quiz 1' })).not.toBeInTheDocument();
        expect(screen.getByLabelText('Loading')).toBeInTheDocument();
        release();
        expect(await screen.findByRole('heading', { name: 'Quiz 2' })).toBeInTheDocument();
    });
});
