import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { screen, within, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import toast from 'react-hot-toast';
import { renderWithProviders } from '../../test/test-utils';
import { server } from '../../test/mocks/server';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import AdminTests from './AdminTests';

vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

const envelope = (data) => HttpResponse.json({ status: 'success', data, error: null });
const failure = (error, status = 400) => HttpResponse.json({ status: 'error', data: null, error }, { status });

const makeQuiz = (overrides = {}) => ({
    slug: 'cs-6-8',
    title: 'CS 6-8',
    description: null,
    sort_order: 1,
    is_active: true,
    reveal_answers: true,
    allow_retakes: false,
    time_limit_minutes: 45,
    question_count: 30,
    attempt_count: 3,
    submitted_count: 2,
    average_percent: 71,
    ...overrides,
});

const QUIZZES = [
    makeQuiz(),
    makeQuiz({
        slug: 'cs-9-11', title: 'CS 9-11', sort_order: 2, is_active: false, reveal_answers: false, allow_retakes: true,
        time_limit_minutes: null, attempt_count: 0, submitted_count: 0, average_percent: null,
    }),
];

const ana = { id: 7, username: 'ana', nickname: 'Ana B' };
const bo = { id: 8, username: 'bo', nickname: null };

const RESULTS = [
    {
        id: 101, status: 'submitted', quiz: { slug: 'cs-6-8', title: 'CS 6-8' }, student: ana,
        started_at: '2026-10-01T10:00:00Z', submitted_at: '2026-10-01T10:30:00Z', elapsed_seconds: 1805,
        correct: 21, total: 30, score_percent: 70,
    },
    {
        id: 102, status: 'in_progress', quiz: { slug: 'cs-9-11', title: 'CS 9-11' }, student: bo,
        started_at: '2026-10-02T10:00:00Z', submitted_at: null, elapsed_seconds: 65,
        correct: null, total: 30, score_percent: null,
    },
];

const useServer = ({ quizzes = QUIZZES, results = RESULTS, onResults } = {}) => {
    server.use(
        http.get('*/api/quizzes/admin/results', ({ request }) => {
            const params = Object.fromEntries(new URL(request.url).searchParams);
            onResults?.(params);
            return envelope({ results: results.filter((r) => (!params.quiz || r.quiz.slug === params.quiz)
                && (!params.status || r.status === params.status)) });
        }),
        http.get('*/api/quizzes/admin', () => envelope({ quizzes })),
    );
};

const renderPage = () => renderWithProviders(<><AdminTests /><ConfirmDialog /></>, { route: '/admin/tests' });

const testsTable = async () => screen.findByRole('table', { name: 'Tests' });
const resultsTable = async () => screen.findByRole('table', { name: 'Results' });
const rowFor = (table, text) => within(table).getByText(text).closest('tr');

describe('AdminTests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('tests table', () => {
        it('lists each test with its counts and settings', async () => {
            useServer();
            renderPage();

            const table = await testsTable();
            expect(within(table).getAllByRole('columnheader').map((h) => h.textContent)).toEqual([
                'Title', 'Questions', 'Submitted', 'Avg %', 'Active', 'Answers shown', 'Retakes', 'Time limit (min)',
            ]);

            const first = within(rowFor(table, 'CS 6-8')).getAllByRole('cell').map((c) => c.textContent);
            expect(first.slice(0, 4)).toEqual(['CS 6-8', '30', '2', '71%']);
            expect(screen.getByRole('checkbox', { name: 'Active: CS 6-8' })).toBeChecked();
            expect(screen.getByRole('checkbox', { name: 'Answers shown: CS 6-8' })).toBeChecked();
            expect(screen.getByRole('checkbox', { name: 'Retakes: CS 6-8' })).not.toBeChecked();
            expect(screen.getByRole('spinbutton', { name: 'Time limit (min): CS 6-8' })).toHaveValue(45);

            const second = within(rowFor(table, 'CS 9-11')).getAllByRole('cell').map((c) => c.textContent);
            expect(second.slice(0, 4)).toEqual(['CS 9-11', '30', '0', '-']);
            expect(screen.getByRole('checkbox', { name: 'Active: CS 9-11' })).not.toBeChecked();
            expect(screen.getByRole('checkbox', { name: 'Retakes: CS 9-11' })).toBeChecked();
            expect(screen.getByRole('spinbutton', { name: 'Time limit (min): CS 9-11' })).toHaveValue(null);
        });

        it('shows None when there are no tests', async () => {
            useServer({ quizzes: [], results: [] });
            renderPage();

            const table = await testsTable();
            expect(within(table).getByText('None')).toBeInTheDocument();
        });

        it('toasts when the tests fail to load', async () => {
            server.use(
                http.get('*/api/quizzes/admin/results', () => envelope({ results: [] })),
                http.get('*/api/quizzes/admin', () => failure('Boom', 500)),
            );
            renderPage();

            await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Boom'));
            expect(await testsTable()).toBeInTheDocument();
        });

        it('saves a toggle optimistically and keeps the server copy', async () => {
            useServer();
            let body;
            let release;
            const gate = new Promise((resolve) => { release = resolve; });
            server.use(http.patch('*/api/quizzes/admin/:slug', async ({ request, params }) => {
                body = { slug: params.slug, ...(await request.json()) };
                await gate;
                return envelope({ quiz: makeQuiz({ allow_retakes: true }) });
            }));
            renderPage();
            await testsTable();

            const retakes = screen.getByRole('checkbox', { name: 'Retakes: CS 6-8' });
            await userEvent.click(retakes);

            expect(retakes).toBeChecked();
            release();
            await waitFor(() => expect(body).toEqual({ slug: 'cs-6-8', allow_retakes: true }));
            expect(retakes).toBeChecked();
            expect(toast.error).not.toHaveBeenCalled();
        });

        it('reverts a toggle and toasts the server error when the save fails', async () => {
            useServer();
            server.use(http.patch('*/api/quizzes/admin/:slug', () => failure('Not allowed', 403)));
            renderPage();
            await testsTable();

            const active = screen.getByRole('checkbox', { name: 'Active: CS 6-8' });
            await userEvent.click(active);

            await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Not allowed'));
            expect(active).toBeChecked();
        });

        it('falls back to a generic message when the failure has no error text', async () => {
            useServer();
            server.use(http.patch('*/api/quizzes/admin/:slug', () => new HttpResponse(null, { status: 500 })));
            renderPage();
            await testsTable();

            await userEvent.click(screen.getByRole('checkbox', { name: 'Answers shown: CS 6-8' }));

            await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Failed to save'));
            expect(screen.getByRole('checkbox', { name: 'Answers shown: CS 6-8' })).toBeChecked();
        });

        it('saves a changed time limit on blur', async () => {
            useServer();
            const bodies = [];
            server.use(http.patch('*/api/quizzes/admin/:slug', async ({ request }) => {
                const body = await request.json();
                bodies.push(body);
                return envelope({ quiz: makeQuiz(body) });
            }));
            renderPage();
            await testsTable();

            const input = screen.getByRole('spinbutton', { name: 'Time limit (min): CS 6-8' });
            await userEvent.clear(input);
            await userEvent.type(input, '60');
            await userEvent.tab();

            await waitFor(() => expect(bodies).toEqual([{ time_limit_minutes: 60 }]));
            expect(input).toHaveValue(60);
        });

        it('saves on Enter and does not save an unchanged value', async () => {
            useServer();
            const bodies = [];
            server.use(http.patch('*/api/quizzes/admin/:slug', async ({ request }) => {
                const body = await request.json();
                bodies.push(body);
                return envelope({ quiz: makeQuiz(body) });
            }));
            renderPage();
            await testsTable();

            const input = screen.getByRole('spinbutton', { name: 'Time limit (min): CS 6-8' });
            input.focus();
            await userEvent.tab();
            expect(bodies).toEqual([]);

            input.focus();
            await userEvent.clear(input);
            await userEvent.type(input, '30{Enter}');

            await waitFor(() => expect(bodies).toEqual([{ time_limit_minutes: 30 }]));
        });

        it('clears the time limit with an empty value', async () => {
            useServer();
            const bodies = [];
            server.use(http.patch('*/api/quizzes/admin/:slug', async ({ request }) => {
                const body = await request.json();
                bodies.push(body);
                return envelope({ quiz: makeQuiz(body) });
            }));
            renderPage();
            await testsTable();

            const input = screen.getByRole('spinbutton', { name: 'Time limit (min): CS 6-8' });
            await userEvent.clear(input);
            await userEvent.tab();

            await waitFor(() => expect(bodies).toEqual([{ time_limit_minutes: null }]));
            expect(input).toHaveValue(null);
        });

        it.each(['0', '601', '1.5'])('rejects %s without calling the server', async (value) => {
            useServer();
            const bodies = [];
            server.use(http.patch('*/api/quizzes/admin/:slug', async ({ request }) => {
                bodies.push(await request.json());
                return envelope({ quiz: makeQuiz() });
            }));
            renderPage();
            await testsTable();

            const input = screen.getByRole('spinbutton', { name: 'Time limit (min): CS 6-8' });
            await userEvent.clear(input);
            await userEvent.type(input, value);
            await userEvent.tab();

            expect(toast.error).toHaveBeenCalledWith('Time limit must be 1-600');
            expect(input).toHaveValue(45);
            expect(bodies).toEqual([]);
        });

        it('reverts the time limit when the save fails', async () => {
            useServer();
            server.use(http.patch('*/api/quizzes/admin/:slug', () => failure('Bad limit')));
            renderPage();
            await testsTable();

            const input = screen.getByRole('spinbutton', { name: 'Time limit (min): CS 6-8' });
            await userEvent.clear(input);
            await userEvent.type(input, '90');
            await userEvent.tab();

            await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Bad limit'));
            await waitFor(() => expect(input).toHaveValue(45));
        });
    });

    describe('results table', () => {
        it('lists results with score, percent, time and submitted state', async () => {
            useServer();
            renderPage();

            const table = await resultsTable();
            expect(within(table).getAllByRole('columnheader').map((h) => h.textContent)).toEqual([
                'Student', 'Test', 'Score', '%', 'Time', 'Submitted', 'Actions',
            ]);

            const done = within(rowFor(table, 'Ana B')).getAllByRole('cell').map((c) => c.textContent);
            expect(done.slice(0, 5)).toEqual(['Ana B', 'CS 6-8', '21/30', '70%', '30:05']);
            expect(done[5]).not.toBe('');
            expect(done[5]).not.toBe('In progress');

            const open = within(rowFor(table, 'bo')).getAllByRole('cell').map((c) => c.textContent);
            expect(open.slice(0, 6)).toEqual(['bo', 'CS 9-11', '-/30', '-', '1:05', 'In progress']);
        });

        it('links the student and the score', async () => {
            useServer();
            renderPage();

            const table = await resultsTable();
            expect(within(table).getByRole('link', { name: 'Ana B' })).toHaveAttribute('href', '/admin/users/7');
            expect(within(table).getByRole('link', { name: 'bo' })).toHaveAttribute('href', '/admin/users/8');
            expect(within(table).getByRole('link', { name: 'Result: Ana B, CS 6-8' })).toHaveAttribute('href', '/admin/tests/results/101');
            expect(within(table).getByRole('link', { name: 'Result: bo, CS 9-11' })).toHaveAttribute('href', '/admin/tests/results/102');
        });

        it('shows None when there are no results', async () => {
            useServer({ results: [] });
            renderPage();

            const table = await resultsTable();
            expect(within(table).getByText('None')).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /CSV/ })).toBeDisabled();
        });

        it('toasts when the results fail to load', async () => {
            server.use(
                http.get('*/api/quizzes/admin/results', () => failure('No results', 500)),
                http.get('*/api/quizzes/admin', () => envelope({ quizzes: QUIZZES })),
            );
            renderPage();

            await waitFor(() => expect(toast.error).toHaveBeenCalledWith('No results'));
            expect(await resultsTable()).toBeInTheDocument();
        });

        it('requests every result first, then filters by test and by status', async () => {
            const seen = [];
            useServer({ onResults: (params) => seen.push(params) });
            renderPage();
            const table = await resultsTable();
            expect(seen).toEqual([{}]);

            await userEvent.selectOptions(await screen.findByRole('combobox', { name: 'Test' }), 'cs-9-11');
            await waitFor(() => expect(seen.at(-1)).toEqual({ quiz: 'cs-9-11' }));
            await waitFor(() => expect(within(table).queryByText('Ana B')).not.toBeInTheDocument());
            expect(within(table).getByText('bo')).toBeInTheDocument();

            await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Status' }), 'submitted');
            await waitFor(() => expect(seen.at(-1)).toEqual({ quiz: 'cs-9-11', status: 'submitted' }));
            await waitFor(() => expect(within(table).getByText('None')).toBeInTheDocument());

            await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Test' }), '');
            await waitFor(() => expect(seen.at(-1)).toEqual({ status: 'submitted' }));
        });

        it('offers every test and status in the filters', async () => {
            useServer();
            renderPage();
            await resultsTable();

            const tests = await screen.findByRole('combobox', { name: 'Test' });
            await waitFor(() => expect(within(tests).getAllByRole('option').map((o) => o.textContent)).toEqual(['All tests', 'CS 6-8', 'CS 9-11']));
            const status = screen.getByRole('combobox', { name: 'Status' });
            expect(within(status).getAllByRole('option').map((o) => o.textContent)).toEqual(['All', 'Submitted', 'In progress']);
        });

        it('ignores a slow response for a filter that is no longer selected', async () => {
            let releaseFirst;
            const first = new Promise((resolve) => { releaseFirst = resolve; });
            server.use(
                http.get('*/api/quizzes/admin/results', async ({ request }) => {
                    const params = new URL(request.url).searchParams;
                    if (!params.get('status')) {
                        await first;
                        return envelope({ results: [RESULTS[0]] });
                    }
                    return envelope({ results: [RESULTS[1]] });
                }),
                http.get('*/api/quizzes/admin', () => envelope({ quizzes: QUIZZES })),
            );
            renderPage();
            await testsTable();

            await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Status' }), 'in_progress');
            expect(await screen.findByText('bo')).toBeInTheDocument();

            releaseFirst();
            await new Promise((resolve) => setTimeout(resolve, 50));
            expect(screen.queryByText('Ana B')).not.toBeInTheDocument();
            expect(screen.getByText('bo')).toBeInTheDocument();
        });
    });

    describe('delete', () => {
        it('asks first and deletes the result once confirmed, updating the counts', async () => {
            useServer();
            const deleted = [];
            server.use(http.delete('*/api/quizzes/admin/attempts/:id', ({ params }) => {
                deleted.push(params.id);
                return envelope({ deleted: Number(params.id) });
            }));
            renderPage();
            const tests = await testsTable();
            const table = await resultsTable();
            expect(within(rowFor(tests, 'CS 6-8')).getAllByRole('cell')[2]).toHaveTextContent('2');

            await userEvent.click(within(table).getByRole('button', { name: 'Delete: Ana B, CS 6-8' }));

            const dialog = await screen.findByRole('dialog');
            expect(within(dialog).getByText('Delete result')).toBeInTheDocument();
            expect(within(dialog).getByText('Ana B, CS 6-8')).toBeInTheDocument();
            expect(deleted).toEqual([]);

            await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));

            await waitFor(() => expect(within(table).queryByText('Ana B')).not.toBeInTheDocument());
            expect(deleted).toEqual(['101']);
            expect(within(table).getByText('bo')).toBeInTheDocument();
            expect(within(rowFor(tests, 'CS 6-8')).getAllByRole('cell')[2]).toHaveTextContent('1');
        });

        it('keeps the submitted count when an in-progress attempt is deleted', async () => {
            useServer({ quizzes: [makeQuiz({ slug: 'cs-9-11', title: 'CS 9-11', attempt_count: 1, submitted_count: 4 })] });
            server.use(http.delete('*/api/quizzes/admin/attempts/:id', ({ params }) => envelope({ deleted: Number(params.id) })));
            renderPage();
            const tests = await testsTable();
            const table = await resultsTable();

            await userEvent.click(within(table).getByRole('button', { name: 'Delete: bo, CS 9-11' }));
            await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete' }));

            await waitFor(() => expect(within(table).queryByText('bo')).not.toBeInTheDocument());
            expect(within(rowFor(tests, 'CS 9-11')).getAllByRole('cell')[2]).toHaveTextContent('4');
        });

        it('does nothing when the confirmation is cancelled', async () => {
            useServer();
            const deleted = [];
            server.use(http.delete('*/api/quizzes/admin/attempts/:id', ({ params }) => {
                deleted.push(params.id);
                return envelope({ deleted: Number(params.id) });
            }));
            renderPage();
            const table = await resultsTable();

            await userEvent.click(within(table).getByRole('button', { name: 'Delete: Ana B, CS 6-8' }));
            await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Cancel' }));

            await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
            expect(deleted).toEqual([]);
            expect(within(table).getByText('Ana B')).toBeInTheDocument();
        });

        it('keeps the row and toasts when the delete fails', async () => {
            useServer();
            server.use(http.delete('*/api/quizzes/admin/attempts/:id', () => failure('Gone', 404)));
            renderPage();
            const table = await resultsTable();

            await userEvent.click(within(table).getByRole('button', { name: 'Delete: Ana B, CS 6-8' }));
            await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Delete' }));

            await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Gone'));
            expect(within(table).getByText('Ana B')).toBeInTheDocument();
            expect(within(table).getByRole('button', { name: 'Delete: Ana B, CS 6-8' })).toBeEnabled();
        });
    });

    describe('csv export', () => {
        let created;
        let clicked;

        beforeEach(() => {
            created = [];
            clicked = [];
            window.URL.createObjectURL = vi.fn((blob) => {
                created.push(blob);
                return 'blob:test';
            });
            window.URL.revokeObjectURL = vi.fn();
            vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function click() {
                clicked.push(this.getAttribute('download'));
            });
        });

        afterEach(() => {
            vi.restoreAllMocks();
        });

        it('downloads the listed results as csv', async () => {
            useServer();
            renderPage();
            await resultsTable();

            fireEvent.click(screen.getByRole('button', { name: /CSV/ }));

            expect(clicked).toEqual(['test_results.csv']);
            expect(created).toHaveLength(1);
            expect(window.URL.revokeObjectURL).toHaveBeenCalledWith('blob:test');
            const text = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.readAsText(created[0]);
            });
            const lines = text.split(/\r?\n/);
            expect(lines[0]).toBe('Student,Username,Test,Correct,Total,Percent,Seconds,Submitted');
            expect(lines[1]).toBe('Ana B,ana,CS 6-8,21,30,70,1805,2026-10-01T10:30:00Z');
            expect(lines[2]).toBe('bo,bo,CS 9-11,,30,,65,');
        });

        it('escapes formulas in student names', async () => {
            const evil = { id: 9, username: 'eve', nickname: '=HYPERLINK("http://x")' };
            useServer({ results: [{ ...RESULTS[0], id: 103, student: evil }] });
            renderPage();
            await resultsTable();

            fireEvent.click(screen.getByRole('button', { name: /CSV/ }));

            const text = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.readAsText(created[0]);
            });
            expect(text).toContain(`"'=HYPERLINK(`);
            expect(text).not.toMatch(/^=HYPERLINK/m);
            expect(text).not.toMatch(/(^|,)"?=HYPERLINK/m);
        });
    });
});
