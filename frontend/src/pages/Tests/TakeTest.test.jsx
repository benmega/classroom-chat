import React from 'react';
import { screen, within, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Routes, Route, useLocation } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { http, HttpResponse, delay } from 'msw';
import toast from 'react-hot-toast';
import { renderWithProviders } from '../../test/test-utils';
import { server } from '../../test/mocks/server';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import TakeTest from './TakeTest';
import useAuthStore from '../../store/useAuthStore';

vi.mock('react-hot-toast', () => ({
    default: { success: vi.fn(), error: vi.fn() },
}));

const envelope = (data, status = 200) => HttpResponse.json({ status: 'success', data, error: null }, { status });
const failure = (error, status, extra = {}) =>
    HttpResponse.json({ status: 'error', data: null, error, ...extra }, { status });

const makeQuestions = () =>
    [1, 2, 3, 4].map((number) => ({
        number,
        domain: number % 2 ? 'Algorithms' : 'Data',
        prompt: `Prompt ${number}`,
        options: ['A', 'B', 'C'].map((letter) => ({ letter, text: `Option ${letter}${number}` })),
        diagram_html: number === 2 ? '<svg id="d2"></svg>' : null,
    }));

const makeAttempt = (overrides = {}) => ({
    id: 77,
    status: 'in_progress',
    quiz: { slug: 'grades-3-5', title: 'Grades 3-5', time_limit_minutes: null },
    started_at: '2026-03-01T10:00:00Z',
    deadline: null,
    elapsed_seconds: 0,
    answers: {},
    flagged: [],
    questions: makeQuestions(),
    ...overrides,
});

let saves;
let submits;
let starts;

const serve = ({ attempt = makeAttempt(), onSave, onSubmit } = {}) => {
    server.use(
        http.post('*/api/quizzes/:slug/attempts', ({ params }) => {
            starts.push(params.slug);
            return envelope({ attempt }, 200);
        }),
        http.patch('*/api/quizzes/attempts/:id', async ({ request, params }) => {
            const body = await request.json();
            saves.push({ id: params.id, body });
            if (onSave) return onSave(body);
            return envelope({ attempt: { id: Number(params.id), ...body } });
        }),
        http.post('*/api/quizzes/attempts/:id/submit', async ({ request, params }) => {
            const body = await request.json();
            submits.push({ id: params.id, body });
            if (onSubmit) return onSubmit(body);
            return envelope({ attempt: { id: Number(params.id), status: 'submitted' } });
        })
    );
};

const Where = () => <div data-testid="where">{useLocation().pathname}</div>;

const renderTake = (slug = 'grades-3-5') =>
    renderWithProviders(
        <>
            <Routes>
                <Route path="/tests" element={<div>Test list</div>} />
                <Route path="/tests/results/:id" element={<div>Result page</div>} />
                <Route path="/tests/:slug" element={<TakeTest />} />
            </Routes>
            <Where />
            <ConfirmDialog />
        </>,
        { route: `/tests/${slug}` }
    );

const optionNamed = (text) => screen.getByRole('radio', { name: new RegExp(text) });

describe('TakeTest', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        saves = [];
        submits = [];
        starts = [];
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe('question view', () => {
        it('starts the attempt for the slug and shows the first question', async () => {
            serve();
            renderTake();

            expect(screen.getByLabelText('Loading')).toBeInTheDocument();
            expect(await screen.findByText('Prompt 1')).toBeInTheDocument();
            expect(starts).toEqual(['grades-3-5']);
            expect(screen.getByRole('heading', { name: 'Grades 3-5' })).toBeInTheDocument();
            expect(screen.getByText('1 of 4')).toBeInTheDocument();
            expect(screen.getByText('Algorithms')).toBeInTheDocument();
            expect(screen.queryByTitle(/diagram/)).not.toBeInTheDocument();
        });

        it('offers the options as a labelled radio group with letters', async () => {
            serve();
            renderTake();

            const group = await screen.findByRole('radiogroup', { name: 'Prompt 1' });
            const radios = within(group).getAllByRole('radio');
            expect(radios).toHaveLength(3);
            expect(radios[0]).toHaveAccessibleName(/Option A1/);
            expect(group).toHaveTextContent('A');
            expect(group).toHaveTextContent('Option C1');
            expect(radios.every((radio) => !radio.checked)).toBe(true);
        });

        it('renders the diagram in a frame when the question has one', async () => {
            serve();
            renderTake();
            await screen.findByText('Prompt 1');

            await userEvent.click(screen.getByRole('button', { name: 'Next' }));

            const frame = await screen.findByTitle('Question 2 diagram');
            expect(frame.getAttribute('srcdoc')).toContain('<svg id="d2"></svg>');
            expect(frame.getAttribute('sandbox')).toBe('allow-same-origin');
        });

        it('gives each question its own diagram frame', async () => {
            const questions = makeQuestions().map((q) => (
                q.number === 3 ? { ...q, diagram_html: '<svg id="d3"></svg>' } : q
            ));
            serve({ attempt: makeAttempt({ questions }) });
            renderTake();
            await screen.findByText('Prompt 1');
            const next = screen.getByRole('button', { name: 'Next' });
            await userEvent.click(next);
            const first = await screen.findByTitle('Question 2 diagram');
            await userEvent.click(next);

            const second = await screen.findByTitle('Question 3 diagram');
            expect(second).not.toBe(first);
            expect(second.getAttribute('srcdoc')).toContain('id="d3"');
        });

        it('selects an answer and marks it in the palette and the progress count', async () => {
            serve();
            renderTake();
            await screen.findByText('Prompt 1');
            expect(screen.getByText('0/4')).toBeInTheDocument();

            await userEvent.click(optionNamed('Option B1'));

            expect(optionNamed('Option B1')).toBeChecked();
            expect(screen.getByRole('button', { name: 'Question 1, answered' })).toBeInTheDocument();
            expect(screen.getByText('1/4')).toBeInTheDocument();
        });

        it('changes the answer within a question', async () => {
            serve();
            renderTake();
            await screen.findByText('Prompt 1');

            await userEvent.click(optionNamed('Option A1'));
            await userEvent.click(optionNamed('Option C1'));

            expect(optionNamed('Option A1')).not.toBeChecked();
            expect(optionNamed('Option C1')).toBeChecked();
            expect(screen.getByText('1/4')).toBeInTheDocument();
        });

        it('can be answered from the keyboard', async () => {
            serve();
            renderTake();
            await screen.findByText('Prompt 1');

            await userEvent.tab();
            expect(optionNamed('Option A1')).toHaveFocus();
            await userEvent.keyboard(' ');

            expect(optionNamed('Option A1')).toBeChecked();
        });

        it('moves with Prev and Next and stops at the ends', async () => {
            serve();
            renderTake();
            await screen.findByText('Prompt 1');
            const prev = screen.getByRole('button', { name: 'Prev' });
            const next = screen.getByRole('button', { name: 'Next' });
            expect(prev).toBeDisabled();

            await userEvent.click(next);
            expect(screen.getByText('Prompt 2')).toBeInTheDocument();
            expect(screen.getByText('2 of 4')).toBeInTheDocument();
            expect(screen.getByText('Data')).toBeInTheDocument();
            await userEvent.click(next);
            await userEvent.click(next);
            expect(screen.getByText('4 of 4')).toBeInTheDocument();
            expect(next).toBeDisabled();

            await userEvent.click(prev);
            expect(screen.getByText('Prompt 3')).toBeInTheDocument();
        });

        it('keeps each question its own answer when moving around', async () => {
            serve();
            renderTake();
            await screen.findByText('Prompt 1');
            await userEvent.click(optionNamed('Option B1'));
            await userEvent.click(screen.getByRole('button', { name: 'Next' }));
            expect(optionNamed('Option B2')).not.toBeChecked();
            await userEvent.click(optionNamed('Option C2'));

            await userEvent.click(screen.getByRole('button', { name: 'Prev' }));

            expect(optionNamed('Option B1')).toBeChecked();
        });

        it('jumps with the palette and marks the current question', async () => {
            serve();
            renderTake();
            await screen.findByText('Prompt 1');
            const palette = screen.getByRole('navigation', { name: 'Questions' });
            expect(within(palette).getAllByRole('button')).toHaveLength(4);
            expect(within(palette).getByRole('button', { name: 'Question 1, unanswered' })).toHaveAttribute('aria-current', 'step');

            await userEvent.click(within(palette).getByRole('button', { name: 'Question 3, unanswered' }));

            expect(screen.getByText('Prompt 3')).toBeInTheDocument();
            expect(within(palette).getByRole('button', { name: 'Question 3, unanswered' })).toHaveAttribute('aria-current', 'step');
            expect(within(palette).getByRole('button', { name: 'Question 1, unanswered' })).not.toHaveAttribute('aria-current');
        });

        it('flags and unflags a question', async () => {
            serve();
            renderTake();
            await screen.findByText('Prompt 1');
            const flag = screen.getByRole('button', { name: 'Flag' });
            expect(flag).toHaveAttribute('aria-pressed', 'false');

            await userEvent.click(flag);
            expect(flag).toHaveAttribute('aria-pressed', 'true');
            expect(screen.getByRole('button', { name: 'Question 1, unanswered, flagged' })).toBeInTheDocument();

            await userEvent.click(flag);
            expect(flag).toHaveAttribute('aria-pressed', 'false');
            expect(screen.getByRole('button', { name: 'Question 1, unanswered' })).toBeInTheDocument();
        });

        it('restores answers, flags and elapsed time of a resumed attempt', async () => {
            serve({ attempt: makeAttempt({ answers: { 1: 'C', 3: 'A' }, flagged: [3], elapsed_seconds: 125 }) });
            renderTake();

            await screen.findByText('Prompt 1');
            expect(optionNamed('Option C1')).toBeChecked();
            expect(screen.getByText('2/4')).toBeInTheDocument();
            expect(screen.getByRole('button', { name: 'Question 3, answered, flagged' })).toBeInTheDocument();
            expect(screen.getByRole('timer', { name: 'Time' })).toHaveTextContent(/^02:0[5-9]$/);
        });

        it('says so when the attempt has no questions', async () => {
            serve({ attempt: makeAttempt({ questions: [] }) });
            renderTake();

            expect(await screen.findByText('No questions')).toBeInTheDocument();
            expect(screen.getByRole('link', { name: 'Tests' })).toHaveAttribute('href', '/tests');
        });
    });

    describe('load failures', () => {
        it('shows the server message and a link back on 403', async () => {
            server.use(http.post('*/api/quizzes/:slug/attempts', () => failure('No retakes', 403)));
            renderTake();

            expect(await screen.findByText('No retakes')).toBeInTheDocument();
            expect(screen.getByRole('link', { name: 'Tests' })).toHaveAttribute('href', '/tests');
            expect(toast.error).not.toHaveBeenCalled();
        });

        it('falls back to a short line on a 403 without a message', async () => {
            server.use(http.post('*/api/quizzes/:slug/attempts', () => new HttpResponse(null, { status: 403 })));
            renderTake();

            expect(await screen.findByText('Not available')).toBeInTheDocument();
        });

        it('shows not found on 404', async () => {
            server.use(http.post('*/api/quizzes/:slug/attempts', () => failure('Quiz not found', 404)));
            renderTake('nope');

            expect(await screen.findByText('Test not found')).toBeInTheDocument();
            expect(screen.getByRole('link', { name: 'Tests' })).toBeInTheDocument();
            expect(toast.error).not.toHaveBeenCalled();
        });

        it('toasts and shows one line on other errors', async () => {
            server.use(http.post('*/api/quizzes/:slug/attempts', () => failure('Boom', 500)));
            renderTake();

            expect(await screen.findByText('Failed to load test')).toBeInTheDocument();
            expect(toast.error).toHaveBeenCalledWith('Boom');
            expect(screen.getByRole('link', { name: 'Tests' })).toBeInTheDocument();
        });
    });

    describe('autosave', () => {
        const setup = async (options) => {
            vi.useFakeTimers({ shouldAdvanceTime: true });
            serve(options);
            const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
            const view = renderTake();
            await screen.findByText('Prompt 1');
            return { user, ...view };
        };

        it('debounces answer saves by about 800 ms into one request', async () => {
            const { user } = await setup();

            await user.click(optionNamed('Option A1'));
            await act(() => vi.advanceTimersByTimeAsync(500));
            await user.click(optionNamed('Option B1'));
            await act(() => vi.advanceTimersByTimeAsync(500));
            expect(saves).toHaveLength(0);

            await act(() => vi.advanceTimersByTimeAsync(400));
            await waitFor(() => expect(saves).toHaveLength(1));
            expect(saves[0].id).toBe('77');
            expect(saves[0].body.answers).toEqual({ 1: 'B' });
            expect(saves[0].body.flagged).toEqual([]);
            expect(saves[0].body.elapsed_seconds).toBeGreaterThanOrEqual(1);
        });

        it('shows a tiny saving then saved state', async () => {
            const { user } = await setup();
            expect(screen.queryByRole('status')).not.toBeInTheDocument();

            await user.click(optionNamed('Option A1'));
            await act(() => vi.advanceTimersByTimeAsync(900));

            expect(await screen.findByRole('status')).toHaveTextContent(/^Saved$/);
        });

        it('saves flags too', async () => {
            const { user } = await setup();

            await user.click(screen.getByRole('button', { name: 'Flag' }));
            await act(() => vi.advanceTimersByTimeAsync(900));

            await waitFor(() => expect(saves).toHaveLength(1));
            expect(saves[0].body.flagged).toEqual([1]);
        });

        it('saves elapsed time every 15 seconds even when nothing changed', async () => {
            await setup({ attempt: makeAttempt({ elapsed_seconds: 40 }) });
            expect(saves).toHaveLength(0);

            await act(() => vi.advanceTimersByTimeAsync(15000));

            await waitFor(() => expect(saves).toHaveLength(1));
            expect(saves[0].body.elapsed_seconds).toBeGreaterThanOrEqual(55);
            expect(screen.queryByRole('status')).not.toBeInTheDocument();
        });

        it('saves when the page is hidden', async () => {
            await setup();

            const original = Object.getOwnPropertyDescriptor(Document.prototype, 'visibilityState');
            Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
            try {
                act(() => {
                    document.dispatchEvent(new Event('visibilitychange'));
                });
                await waitFor(() => expect(saves).toHaveLength(1), { timeout: 5000 });
            } finally {
                delete document.visibilityState;
                if (original) Object.defineProperty(Document.prototype, 'visibilityState', original);
            }
        });

        it('does not save when the page becomes visible again', async () => {
            await setup();

            act(() => {
                document.dispatchEvent(new Event('visibilitychange'));
            });
            await act(() => vi.advanceTimersByTimeAsync(100));

            expect(saves).toHaveLength(0);
        });

        it('saves on pagehide', async () => {
            await setup();

            act(() => {
                window.dispatchEvent(new Event('pagehide'));
            });

            await waitFor(() => expect(saves).toHaveLength(1));
        });

        it('saves unsaved changes when leaving the page', async () => {
            const { user, unmount } = await setup();
            await user.click(optionNamed('Option C1'));

            unmount();

            await waitFor(() => expect(saves).toHaveLength(1));
            expect(saves[0].body.answers).toEqual({ 1: 'C' });
        });

        it('does not save on leaving when nothing changed', async () => {
            const { unmount } = await setup();

            unmount();
            await act(() => vi.advanceTimersByTimeAsync(2000));

            expect(saves).toHaveLength(0);
        });

        it('shows Not saved on failure and retries on the next interval', async () => {
            let fail = true;
            const { user } = await setup({
                onSave: (body) => (fail ? failure('Down', 500) : envelope({ attempt: { id: 77, ...body } })),
            });

            await user.click(optionNamed('Option A1'));
            await act(() => vi.advanceTimersByTimeAsync(900));
            expect(await screen.findByText('Not saved')).toBeInTheDocument();

            fail = false;
            await act(() => vi.advanceTimersByTimeAsync(15000));
            await waitFor(() => expect(saves.length).toBeGreaterThanOrEqual(2));
            expect(saves.at(-1).body.answers).toEqual({ 1: 'A' });
        });

        it('queues a change made while a save is in flight', async () => {
            const { user } = await setup({
                onSave: async (body) => {
                    await delay(300);
                    return envelope({ attempt: { id: 77, ...body } });
                },
            });

            await user.click(optionNamed('Option A1'));
            await act(() => vi.advanceTimersByTimeAsync(850));
            await user.click(optionNamed('Option B1'));
            await act(() => vi.advanceTimersByTimeAsync(850));

            await act(() => vi.advanceTimersByTimeAsync(1500));
            await waitFor(() => expect(saves).toHaveLength(2));
            expect(saves[0].body.answers).toEqual({ 1: 'A' });
            expect(saves[1].body.answers).toEqual({ 1: 'B' });
        });

        it('submits for grading when a save reports the time is up', async () => {
            const { user } = await setup({ onSave: () => failure('Expired', 409, { expired: true }) });

            await user.click(optionNamed('Option A1'));
            await act(() => vi.advanceTimersByTimeAsync(900));

            await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/tests/results/77'));
            expect(submits).toHaveLength(1);
            expect(submits[0].id).toBe('77');
            expect(submits[0].body).toEqual({});
            expect(saves).toHaveLength(1);
            expect(screen.queryByText('Time expired')).not.toBeInTheDocument();
        });

        it('shows the expired line only when that submit fails too', async () => {
            const { user } = await setup({
                onSave: () => failure('Expired', 409, { expired: true }),
                onSubmit: () => failure('Expired', 409, { expired: true }),
            });

            await user.click(optionNamed('Option A1'));
            await act(() => vi.advanceTimersByTimeAsync(900));

            expect(await screen.findByText('Time expired')).toBeInTheDocument();
            expect(screen.getByRole('link', { name: 'Tests' })).toHaveAttribute('href', '/tests');
            expect(submits).toHaveLength(1);
        });

        it('clears Not saved after a later quiet save succeeds', async () => {
            let fail = true;
            const { user } = await setup({
                onSave: (body) => (fail ? failure('Down', 500) : envelope({ attempt: { id: 77, ...body } })),
            });

            await user.click(optionNamed('Option A1'));
            await act(() => vi.advanceTimersByTimeAsync(900));
            expect(await screen.findByText('Not saved')).toBeInTheDocument();

            fail = false;
            await act(() => vi.advanceTimersByTimeAsync(15000));

            await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/^Saved$/));
        });

        it('keeps a quiet save quiet while nothing was wrong', async () => {
            await setup();

            await act(() => vi.advanceTimersByTimeAsync(15000));

            await waitFor(() => expect(saves).toHaveLength(1));
            expect(screen.queryByRole('status')).not.toBeInTheDocument();
        });

        it('shows the state of a queued save by its own quiet flag, not the first one', async () => {
            let release;
            const gate = new Promise((resolve) => { release = resolve; });
            const { user } = await setup({
                onSave: async (body) => {
                    if (saves.length === 1) await gate;
                    return envelope({ attempt: { id: 77, ...body } });
                },
            });

            await act(() => vi.advanceTimersByTimeAsync(15000)); // quiet save, held on the wire
            await waitFor(() => expect(saves).toHaveLength(1));
            await user.click(optionNamed('Option B1'));
            await act(() => vi.advanceTimersByTimeAsync(900)); // answer save queues behind it
            expect(saves).toHaveLength(1);

            release();

            await waitFor(() => expect(saves).toHaveLength(2));
            expect(saves[1].body.answers).toEqual({ 1: 'B' });
            await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/^Saved$/));
        });

        it('goes to the result when a save finds the attempt already submitted', async () => {
            const { user } = await setup({ onSave: () => failure('Already submitted', 409) });

            await user.click(optionNamed('Option A1'));
            await act(() => vi.advanceTimersByTimeAsync(900));

            await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/tests/results/77'));
        });
    });

    describe('clock', () => {
        it('counts up from the elapsed time', async () => {
            vi.useFakeTimers({ shouldAdvanceTime: true });
            serve({ attempt: makeAttempt({ elapsed_seconds: 59 }) });
            renderTake();
            await screen.findByText('Prompt 1');
            const clock = screen.getByRole('timer', { name: 'Time' });
            expect(clock).toHaveTextContent(/^00:59|01:00$/);

            await act(() => vi.advanceTimersByTimeAsync(5000));

            expect(clock).toHaveTextContent(/^01:0[3-6]$/);
        });

        it('shows hours once past an hour', async () => {
            serve({ attempt: makeAttempt({ elapsed_seconds: 3725 }) });
            renderTake();
            await screen.findByText('Prompt 1');

            expect(screen.getByRole('timer')).toHaveTextContent(/^1:02:0[5-8]$/);
        });

        it('counts down to the deadline', async () => {
            vi.useFakeTimers({ shouldAdvanceTime: true });
            const deadline = new Date(Date.now() + 125_000).toISOString();
            serve({ attempt: makeAttempt({ deadline }) });
            renderTake();
            await screen.findByText('Prompt 1');
            const clock = screen.getByRole('timer', { name: 'Time left' });
            expect(clock).toHaveTextContent(/^02:0[3-5]$/);
            expect(clock).not.toHaveClass('take-test-clock-low');

            await act(() => vi.advanceTimersByTimeAsync(70_000));

            expect(clock).toHaveTextContent(/^00:5\d$/);
            expect(clock).toHaveClass('take-test-clock-low');
        });

        it('submits by itself at zero without asking', async () => {
            vi.useFakeTimers({ shouldAdvanceTime: true });
            const deadline = new Date(Date.now() + 3000).toISOString();
            const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
            serve({ attempt: makeAttempt({ deadline }) });
            renderTake();
            await screen.findByText('Prompt 1');
            await user.click(optionNamed('Option A1'));

            await act(() => vi.advanceTimersByTimeAsync(4500));

            await waitFor(() => expect(submits).toHaveLength(1));
            expect(submits[0].id).toBe('77');
            expect(submits[0].body.answers).toEqual({ 1: 'A' });
            expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
            await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/tests/results/77'));
            expect(submits).toHaveLength(1);
        });

        it('retries a failed automatic submit once after a few seconds', async () => {
            vi.useFakeTimers({ shouldAdvanceTime: true });
            const deadline = new Date(Date.now() + 2000).toISOString();
            let calls = 0;
            serve({
                attempt: makeAttempt({ deadline }),
                onSubmit: () => {
                    calls += 1;
                    return calls === 1 ? HttpResponse.error() : envelope({ attempt: { id: 77 } });
                },
            });
            renderTake();
            await screen.findByText('Prompt 1');

            await act(() => vi.advanceTimersByTimeAsync(3500));
            await waitFor(() => expect(submits).toHaveLength(1));
            await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Failed to submit'));
            expect(screen.getByRole('button', { name: 'Submit' })).toBeEnabled();
            expect(screen.getByTestId('where')).toHaveTextContent('/tests/grades-3-5');

            await act(() => vi.advanceTimersByTimeAsync(5500));

            await waitFor(() => expect(submits).toHaveLength(2));
            await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/tests/results/77'));
        });

        it('leaves the Submit button working when the automatic retry fails as well', async () => {
            vi.useFakeTimers({ shouldAdvanceTime: true });
            const deadline = new Date(Date.now() + 2000).toISOString();
            let fail = true;
            serve({
                attempt: makeAttempt({ deadline }),
                onSubmit: () => (fail ? HttpResponse.error() : envelope({ attempt: { id: 77 } })),
            });
            const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
            renderTake();
            await screen.findByText('Prompt 1');

            await act(() => vi.advanceTimersByTimeAsync(3500));
            await act(() => vi.advanceTimersByTimeAsync(5500));
            await waitFor(() => expect(submits).toHaveLength(2));
            await waitFor(() => expect(screen.getByRole('button', { name: 'Submit' })).toBeEnabled());
            await act(() => vi.advanceTimersByTimeAsync(20000));
            expect(submits).toHaveLength(2); // only one automatic retry

            fail = false;
            await user.click(screen.getByRole('button', { name: 'Submit' }));
            await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Submit' }));

            await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/tests/results/77'));
            expect(submits).toHaveLength(3);
        });

        it('submits straight away when the deadline already passed', async () => {
            const deadline = new Date(Date.now() - 60_000).toISOString();
            serve({ attempt: makeAttempt({ deadline }) });
            renderTake();

            await waitFor(() => expect(submits).toHaveLength(1));
            await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/tests/results/77'));
        });

        it('ignores an unreadable deadline and counts up', async () => {
            serve({ attempt: makeAttempt({ deadline: 'not a date' }) });
            renderTake();
            await screen.findByText('Prompt 1');

            expect(screen.getByRole('timer', { name: 'Time' })).toBeInTheDocument();
            expect(submits).toHaveLength(0);
        });
    });

    describe('submit', () => {
        it('refreshes the user after submitting so the duck balance is current', async () => {
            const checkAuth = vi.spyOn(useAuthStore.getState(), 'checkAuth').mockResolvedValue(undefined);
            try {
                serve();
                renderTake();
                await screen.findByText('Prompt 1');

                await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
                const dialog = await screen.findByRole('dialog', { name: 'Submit' });
                await userEvent.click(within(dialog).getByRole('button', { name: 'Submit' }));

                await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/tests/results/77'));
                expect(checkAuth).toHaveBeenCalledWith(true);
            } finally {
                checkAuth.mockRestore();
            }
        });

        it('confirms with the unanswered count, then submits and opens the result', async () => {
            serve();
            renderTake();
            await screen.findByText('Prompt 1');
            await userEvent.click(optionNamed('Option B1'));
            await userEvent.click(screen.getByRole('button', { name: 'Flag' }));

            await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

            const dialog = await screen.findByRole('dialog', { name: 'Submit' });
            expect(dialog).toHaveTextContent('3 unanswered');
            expect(submits).toHaveLength(0);

            await userEvent.click(within(dialog).getByRole('button', { name: 'Submit' }));

            await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/tests/results/77'));
            expect(submits).toHaveLength(1);
            expect(submits[0].body).toEqual({
                answers: { 1: 'B' },
                flagged: [1],
                elapsed_seconds: expect.any(Number),
            });
            expect(screen.getByText('Result page')).toBeInTheDocument();
        });

        it('says all answered when nothing is missing', async () => {
            serve({ attempt: makeAttempt({ answers: { 1: 'A', 2: 'B', 3: 'C', 4: 'A' } }) });
            renderTake();
            await screen.findByText('Prompt 1');

            await userEvent.click(screen.getByRole('button', { name: 'Submit' }));

            expect(await screen.findByRole('dialog')).toHaveTextContent('All answered');
        });

        it('stays on the test when the confirmation is declined', async () => {
            serve();
            renderTake();
            await screen.findByText('Prompt 1');

            await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
            const dialog = await screen.findByRole('dialog');
            await userEvent.click(within(dialog).getByRole('button', { name: 'Back' }));

            await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
            expect(submits).toHaveLength(0);
            expect(screen.getByText('Prompt 1')).toBeInTheDocument();
        });

        it('toasts and lets the student retry when the submit fails', async () => {
            let fail = true;
            serve({
                onSubmit: () => (fail ? failure('Try later', 500) : envelope({ attempt: { id: 77 } })),
            });
            renderTake();
            await screen.findByText('Prompt 1');

            await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
            await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Submit' }));

            await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Try later'));
            expect(screen.getByRole('button', { name: 'Submit' })).toBeEnabled();
            expect(screen.getByText('Prompt 1')).toBeInTheDocument();

            fail = false;
            await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
            await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Submit' }));
            await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/tests/results/77'));
        });

        it('disables answering and a second submit while submitting', async () => {
            serve({
                onSubmit: async () => {
                    await delay(200);
                    return envelope({ attempt: { id: 77 } });
                },
            });
            renderTake();
            await screen.findByText('Prompt 1');

            await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
            await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Submit' }));

            await waitFor(() => expect(screen.getByRole('button', { name: 'Submit' })).toBeDisabled());
            expect(optionNamed('Option A1')).toBeDisabled();
            await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/tests/results/77'));
            expect(submits).toHaveLength(1);
        });

        it('shows the expired line when the submit is refused as late', async () => {
            serve({ onSubmit: () => failure('Expired', 409, { expired: true }) });
            renderTake();
            await screen.findByText('Prompt 1');

            await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
            await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Submit' }));

            expect(await screen.findByText('Time expired')).toBeInTheDocument();
            expect(screen.getByRole('link', { name: 'Tests' })).toBeInTheDocument();
        });

        it('waits for a save in flight before submitting, and stops saving meanwhile', async () => {
            vi.useFakeTimers({ shouldAdvanceTime: true });
            let release;
            const gate = new Promise((resolve) => { release = resolve; });
            const order = [];
            serve({
                onSave: async (body) => {
                    order.push('save-start');
                    await gate;
                    order.push('save-end');
                    return envelope({ attempt: { id: 77, ...body } });
                },
                onSubmit: () => {
                    order.push('submit');
                    return envelope({ attempt: { id: 77 } });
                },
            });
            const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
            renderTake();
            await screen.findByText('Prompt 1');
            await user.click(optionNamed('Option B1'));
            await act(() => vi.advanceTimersByTimeAsync(900));
            await waitFor(() => expect(saves).toHaveLength(1));

            await user.click(screen.getByRole('button', { name: 'Submit' }));
            await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Submit' }));
            await act(() => vi.advanceTimersByTimeAsync(20000)); // interval ticks while submitting

            expect(submits).toHaveLength(0);
            expect(saves).toHaveLength(1);

            release();

            await waitFor(() => expect(submits).toHaveLength(1));
            expect(order).toEqual(['save-start', 'save-end', 'submit']);
            expect(saves).toHaveLength(1);
            expect(submits[0].body.answers).toEqual({ 1: 'B' });
            await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/tests/results/77'));
        });

        it('does not submit when the save it waited for found the attempt already submitted', async () => {
            vi.useFakeTimers({ shouldAdvanceTime: true });
            let release;
            const gate = new Promise((resolve) => { release = resolve; });
            serve({
                onSave: async () => {
                    await gate;
                    return failure('Already submitted', 409);
                },
            });
            const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
            renderTake();
            await screen.findByText('Prompt 1');
            await user.click(optionNamed('Option B1'));
            await act(() => vi.advanceTimersByTimeAsync(900));
            await waitFor(() => expect(saves).toHaveLength(1));
            await user.click(screen.getByRole('button', { name: 'Submit' }));
            await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Submit' }));

            release();

            await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/tests/results/77'));
            expect(submits).toHaveLength(0);
        });

        it('opens the result when the attempt was already submitted elsewhere', async () => {
            serve({ onSubmit: () => failure('Already submitted', 409) });
            renderTake();
            await screen.findByText('Prompt 1');

            await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
            await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Submit' }));

            await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/tests/results/77'));
        });
    });
});
