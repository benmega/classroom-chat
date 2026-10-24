import React from 'react';
import { screen, within, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import toast from 'react-hot-toast';
import { renderWithProviders } from '../../test/test-utils';
import { server } from '../../test/mocks/server';
import TestList from './TestList';

vi.mock('react-hot-toast', () => ({
    default: { success: vi.fn(), error: vi.fn() },
}));

const quiz = (overrides = {}) => ({
    slug: 'grades-3-5',
    title: 'Grades 3-5',
    description: 'Short description',
    question_count: 30,
    time_limit_minutes: null,
    allow_retakes: true,
    in_progress_attempt_id: null,
    can_start: true,
    attempts: [],
    ...overrides,
});

const serve = (quizzes) =>
    server.use(
        http.get('*/api/quizzes', () => HttpResponse.json({ status: 'success', data: { quizzes }, error: null }))
    );

const rowOf = (title) => screen.getByRole('heading', { name: title }).closest('li');

describe('TestList', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('shows a loading state, then the tests', async () => {
        serve([quiz()]);
        renderWithProviders(<TestList />);

        expect(screen.getByLabelText('Loading')).toBeInTheDocument();
        expect(await screen.findByRole('heading', { name: 'Grades 3-5' })).toBeInTheDocument();
        expect(screen.queryByLabelText('Loading')).not.toBeInTheDocument();
        expect(screen.getByRole('heading', { level: 1, name: 'Tests' })).toBeInTheDocument();
    });

    it('lists title, description and question count', async () => {
        serve([quiz(), quiz({ slug: 'grades-6-8', title: 'Grades 6-8', description: null, question_count: 25 })]);
        renderWithProviders(<TestList />);

        await screen.findByRole('heading', { name: 'Grades 3-5' });
        expect(screen.getAllByRole('listitem')).toHaveLength(2);
        const first = within(rowOf('Grades 3-5'));
        expect(first.getByText('Short description')).toBeInTheDocument();
        expect(first.getByText('30 questions')).toBeInTheDocument();
        expect(within(rowOf('Grades 6-8')).getByText('25 questions')).toBeInTheDocument();
    });

    it('shows the time limit only when there is one', async () => {
        serve([quiz({ time_limit_minutes: 45 }), quiz({ slug: 'b', title: 'B' })]);
        renderWithProviders(<TestList />);

        await screen.findByRole('heading', { name: 'B' });
        expect(within(rowOf('Grades 3-5')).getByText('45 min')).toBeInTheDocument();
        expect(within(rowOf('B')).queryByText(/min$/)).not.toBeInTheDocument();
    });

    it('offers Start for a test that was never taken', async () => {
        serve([quiz()]);
        renderWithProviders(<TestList />);

        const action = await screen.findByRole('link', { name: 'Start' });
        expect(action).toHaveAttribute('href', '/tests/grades-3-5');
        expect(screen.queryByRole('link', { name: /^Result/ })).not.toBeInTheDocument();
    });

    it('offers Resume while an attempt is in progress', async () => {
        serve([quiz({ in_progress_attempt_id: 9, attempts: [{ id: 3, submitted_at: '2026-01-02T10:00:00Z', correct: 18, total: 30, score_percent: 60 }] })]);
        renderWithProviders(<TestList />);

        const action = await screen.findByRole('link', { name: 'Resume' });
        expect(action).toHaveAttribute('href', '/tests/grades-3-5');
        expect(screen.queryByRole('link', { name: 'Retake' })).not.toBeInTheDocument();
    });

    it('offers Retake after a submitted attempt and links each past attempt to its result', async () => {
        serve([quiz({
            attempts: [
                { id: 12, submitted_at: '2026-02-02T10:00:00Z', correct: 18, total: 30, score_percent: 60 },
                { id: 7, submitted_at: '2026-01-02T10:00:00Z', correct: 11, total: 30, score_percent: 37 },
            ],
        })]);
        renderWithProviders(<TestList />);

        expect(await screen.findByRole('link', { name: 'Retake' })).toHaveAttribute('href', '/tests/grades-3-5');
        const latest = screen.getByRole('link', { name: /^Result 18\/30/ });
        expect(latest).toHaveTextContent('18/30');
        expect(latest).toHaveAttribute('href', '/tests/results/12');
        const older = screen.getByRole('link', { name: /^Result 11\/30/ });
        expect(older).toHaveAttribute('href', '/tests/results/7');
    });

    it('disables the action when the test cannot be started', async () => {
        serve([quiz({
            can_start: false,
            allow_retakes: false,
            attempts: [{ id: 12, submitted_at: '2026-02-02T10:00:00Z', correct: 18, total: 30, score_percent: 60 }],
        })]);
        renderWithProviders(<TestList />);

        const action = await screen.findByRole('button', { name: 'Retake' });
        expect(action).toBeDisabled();
        expect(screen.queryByRole('link', { name: 'Retake' })).not.toBeInTheDocument();
        expect(screen.getByRole('link', { name: /^Result 18\/30/ })).toHaveAttribute('href', '/tests/results/12');
    });

    it('omits the date from the result label when it is missing', async () => {
        serve([quiz({ attempts: [{ id: 1, submitted_at: null, correct: 5, total: 30, score_percent: 17 }] })]);
        renderWithProviders(<TestList />);

        expect(await screen.findByRole('link', { name: 'Result 5/30' })).toBeInTheDocument();
    });

    it('shows one short line when there are no tests', async () => {
        serve([]);
        renderWithProviders(<TestList />);

        expect(await screen.findByText('No tests')).toBeInTheDocument();
        expect(screen.queryByRole('list')).not.toBeInTheDocument();
    });

    it('tolerates a response without a quizzes list', async () => {
        server.use(http.get('*/api/quizzes', () => HttpResponse.json({ status: 'success', data: {}, error: null })));
        renderWithProviders(<TestList />);

        expect(await screen.findByText('No tests')).toBeInTheDocument();
    });

    it('toasts the server message and shows one line when loading fails', async () => {
        server.use(http.get('*/api/quizzes', () => HttpResponse.json({ status: 'error', data: null, error: 'Nope' }, { status: 500 })));
        renderWithProviders(<TestList />);

        expect(await screen.findByText('Tests unavailable')).toBeInTheDocument();
        expect(toast.error).toHaveBeenCalledWith('Nope');
    });

    it('does not update after unmount', async () => {
        serve([quiz()]);
        const { unmount } = renderWithProviders(<TestList />);
        unmount();
        await waitFor(() => expect(toast.error).not.toHaveBeenCalled());
    });
});
