import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { server } from '../../test/mocks/server';
import AdminTestNew from './AdminTestNew';

vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

const envelope = (data) => HttpResponse.json({ status: 'success', data, error: null });
const failure = (error, status = 400) => HttpResponse.json({ status: 'error', data: null, error }, { status });

const Where = () => <div data-testid="where">{useLocation().pathname}</div>;

const renderPage = () =>
    render(
        <MemoryRouter initialEntries={['/admin/tests/new']}>
            <Routes>
                <Route path="/admin/tests/new" element={<AdminTestNew />} />
                <Route path="/admin/tests" element={<Where />} />
            </Routes>
        </MemoryRouter>,
    );

// Records each POST body and answers with a created quiz
const serve = ({ response } = {}) => {
    const posts = [];
    server.use(http.post('*/api/quizzes/admin', async ({ request }) => {
        posts.push(await request.json());
        return response ? response(posts.length) : envelope({ quiz: { slug: 'new-test', title: 'x' } });
    }));
    return posts;
};

const field = (name) => screen.getByLabelText(name);
const button = (name) => screen.getByRole('button', { name });
const queryButton = (name) => screen.queryByRole('button', { name });
const letters = (q) => screen.getAllByLabelText(new RegExp(`^Q${q} option [A-H]$`)).map((el) => el.getAttribute('aria-label').slice(-1));
const optionValues = (q) => screen.getAllByLabelText(new RegExp(`^Q${q} option [A-H]$`)).map((el) => el.value);
const checkedAnswer = (q) => {
    const checked = screen.getAllByRole('radio', { name: new RegExp(`^Q${q} answer `) }).filter((r) => r.checked);
    expect(checked).toHaveLength(1);
    return checked[0].getAttribute('aria-label').slice(-1);
};

const fillOptions = async (q, texts) => {
    for (let i = 0; i < texts.length; i += 1) {
         
        await userEvent.type(field(`Q${q} option ${String.fromCharCode(65 + i)}`), texts[i]);
    }
};

describe('AdminTestNew', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('initial form', () => {
        it('starts with a required title, a description and one blank question', () => {
            renderPage();

            expect(screen.getByRole('heading', { level: 1, name: 'New test' })).toBeInTheDocument();
            expect(field('Title')).toHaveValue('');
            expect(field('Title')).toBeRequired();
            expect(field('Description')).toHaveValue('');
            expect(field('Description')).not.toBeRequired();
            expect(field('Q1 topic')).toHaveValue('');
            expect(field('Q1 prompt')).toHaveValue('');
            expect(field('Q1 explanation')).toHaveValue('');
            expect(screen.queryByLabelText('Q2 prompt')).not.toBeInTheDocument();
        });

        it('has four blank lettered options with A as the answer', () => {
            renderPage();

            expect(letters(1)).toEqual(['A', 'B', 'C', 'D']);
            expect(optionValues(1)).toEqual(['', '', '', '']);
            expect(screen.getAllByRole('radio')).toHaveLength(4);
            expect(checkedAnswer(1)).toBe('A');
        });

        it('links Cancel back to the tests', () => {
            renderPage();

            expect(screen.getByRole('link', { name: 'Cancel' })).toHaveAttribute('href', '/admin/tests');
        });

        it('cannot remove the only question', () => {
            renderPage();

            expect(button('Remove Q1')).toBeDisabled();
        });
    });

    describe('questions', () => {
        it('adds a question that inherits the previous topic', async () => {
            renderPage();
            await userEvent.type(field('Q1 topic'), 'Logic');
            await userEvent.type(field('Q1 prompt'), 'First');

            await userEvent.click(button('Question'));

            expect(field('Q2 topic')).toHaveValue('Logic');
            expect(field('Q2 prompt')).toHaveValue('');
            expect(optionValues(2)).toEqual(['', '', '', '']);
            expect(checkedAnswer(2)).toBe('A');
            expect(field('Q1 prompt')).toHaveValue('First');
        });

        it('inherits from the last question, not the first', async () => {
            renderPage();
            await userEvent.type(field('Q1 topic'), 'Logic');
            await userEvent.click(button('Question'));
            await userEvent.clear(field('Q2 topic'));
            await userEvent.type(field('Q2 topic'), 'Data');

            await userEvent.click(button('Question'));

            expect(field('Q3 topic')).toHaveValue('Data');
            expect(field('Q1 topic')).toHaveValue('Logic');
        });

        it('adds a blank question when the previous one has no topic', async () => {
            renderPage();
            await userEvent.click(button('Question'));

            expect(field('Q2 topic')).toHaveValue('');
        });

        it('keeps each question separate', async () => {
            renderPage();
            await userEvent.click(button('Question'));
            await userEvent.type(field('Q1 prompt'), 'One');
            await userEvent.type(field('Q2 prompt'), 'Two');
            await userEvent.click(screen.getByRole('radio', { name: 'Q2 answer C' }));

            expect(field('Q1 prompt')).toHaveValue('One');
            expect(field('Q2 prompt')).toHaveValue('Two');
            expect(checkedAnswer(1)).toBe('A');
            expect(checkedAnswer(2)).toBe('C');
        });

        it('enables Remove once there are two questions', async () => {
            renderPage();
            await userEvent.click(button('Question'));

            expect(button('Remove Q1')).toBeEnabled();
            expect(button('Remove Q2')).toBeEnabled();
        });

        it('removes a question, renumbers the rest and keeps their content', async () => {
            renderPage();
            await userEvent.click(button('Question'));
            await userEvent.click(button('Question'));
            await userEvent.type(field('Q1 prompt'), 'One');
            await userEvent.type(field('Q2 prompt'), 'Two');
            await userEvent.type(field('Q3 prompt'), 'Three');
            await userEvent.click(screen.getByRole('radio', { name: 'Q3 answer D' }));

            await userEvent.click(button('Remove Q2'));

            expect(screen.queryByLabelText('Q3 prompt')).not.toBeInTheDocument();
            expect(field('Q1 prompt')).toHaveValue('One');
            expect(field('Q2 prompt')).toHaveValue('Three');
            expect(checkedAnswer(2)).toBe('D');
            expect(button('Remove Q1')).toBeEnabled();
        });

        it('disables Remove again when one question is left', async () => {
            renderPage();
            await userEvent.click(button('Question'));
            await userEvent.type(field('Q2 prompt'), 'Two');

            await userEvent.click(button('Remove Q1'));

            expect(field('Q1 prompt')).toHaveValue('Two');
            expect(button('Remove Q1')).toBeDisabled();
        });
    });

    describe('options', () => {
        it('adds options up to eight, then hides the button', async () => {
            renderPage();

            for (let n = 5; n <= 8; n += 1) {
                 
                await userEvent.click(button('Option'));
                expect(letters(1)).toHaveLength(n);
            }

            expect(letters(1)).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']);
            expect(queryButton('Option')).not.toBeInTheDocument();
            expect(screen.getAllByRole('radio')).toHaveLength(8);
        });

        it('shows the add button again after removing from eight', async () => {
            renderPage();
            for (let n = 0; n < 4; n += 1) {
                 
                await userEvent.click(button('Option'));
            }
            expect(queryButton('Option')).not.toBeInTheDocument();

            await userEvent.click(button('Remove Q1 option H'));

            expect(letters(1)).toHaveLength(7);
            expect(button('Option')).toBeInTheDocument();
        });

        it('adds options per question', async () => {
            renderPage();
            await userEvent.click(button('Question'));

            await userEvent.click(screen.getAllByRole('button', { name: 'Option' })[0]);

            expect(letters(1)).toHaveLength(5);
            expect(letters(2)).toHaveLength(4);
        });

        it('disables option removal at two options', async () => {
            renderPage();
            await userEvent.click(button('Remove Q1 option D'));
            expect(button('Remove Q1 option A')).toBeEnabled();
            await userEvent.click(button('Remove Q1 option C'));

            expect(letters(1)).toEqual(['A', 'B']);
            expect(button('Remove Q1 option A')).toBeDisabled();
            expect(button('Remove Q1 option B')).toBeDisabled();
        });

        it('re-letters the rest and keeps their text after a removal', async () => {
            renderPage();
            await fillOptions(1, ['one', 'two', 'three', 'four']);

            await userEvent.click(button('Remove Q1 option B'));

            expect(letters(1)).toEqual(['A', 'B', 'C']);
            expect(optionValues(1)).toEqual(['one', 'three', 'four']);
        });

        it('keeps the answer when a later option is removed', async () => {
            renderPage();
            await userEvent.click(screen.getByRole('radio', { name: 'Q1 answer B' }));

            await userEvent.click(button('Remove Q1 option D'));

            expect(checkedAnswer(1)).toBe('B');
        });

        it('moves the answer down when an earlier option is removed', async () => {
            renderPage();
            await fillOptions(1, ['one', 'two', 'three', 'four']);
            await userEvent.click(screen.getByRole('radio', { name: 'Q1 answer C' }));

            await userEvent.click(button('Remove Q1 option A'));

            expect(optionValues(1)).toEqual(['two', 'three', 'four']);
            expect(checkedAnswer(1)).toBe('B');
        });

        it('resets the answer to A when the chosen option is removed', async () => {
            renderPage();
            await userEvent.click(screen.getByRole('radio', { name: 'Q1 answer C' }));

            await userEvent.click(button('Remove Q1 option C'));

            expect(letters(1)).toEqual(['A', 'B', 'C']);
            expect(checkedAnswer(1)).toBe('A');
        });

        it('keeps the answer on A when option A is removed', async () => {
            renderPage();

            await userEvent.click(button('Remove Q1 option A'));

            expect(checkedAnswer(1)).toBe('A');
        });

        it('leaves other questions alone when removing an option', async () => {
            renderPage();
            await userEvent.click(button('Question'));
            await userEvent.click(screen.getByRole('radio', { name: 'Q2 answer C' }));
            await userEvent.click(screen.getByRole('radio', { name: 'Q1 answer D' }));

            await userEvent.click(button('Remove Q1 option A'));

            expect(letters(1)).toHaveLength(3);
            expect(letters(2)).toHaveLength(4);
            expect(checkedAnswer(1)).toBe('C');
            expect(checkedAnswer(2)).toBe('C');
        });
    });

    describe('save', () => {
        it('posts the test with lettered options and the answer letter', async () => {
            const posts = serve();
            renderPage();
            await userEvent.type(field('Title'), 'Logic quiz');
            await userEvent.type(field('Description'), 'Weekly');
            await userEvent.type(field('Q1 topic'), 'Logic');
            await userEvent.type(field('Q1 prompt'), 'Pick one');
            await fillOptions(1, ['red', 'green', 'blue', 'gold']);
            await userEvent.click(screen.getByRole('radio', { name: 'Q1 answer B' }));
            await userEvent.type(field('Q1 explanation'), 'Green is right');

            await userEvent.click(button('Save'));

            await waitFor(() => expect(posts).toHaveLength(1));
            expect(posts[0]).toEqual({
                title: 'Logic quiz',
                description: 'Weekly',
                questions: [{
                    domain: 'Logic',
                    prompt: 'Pick one',
                    options: { A: 'red', B: 'green', C: 'blue', D: 'gold' },
                    answer: 'B',
                    explanation: 'Green is right',
                }],
            });
        });

        it('posts every question in order with its own options and answer', async () => {
            const posts = serve();
            renderPage();
            await userEvent.type(field('Title'), 'Two parts');
            await userEvent.type(field('Q1 topic'), 'Logic');
            await userEvent.type(field('Q1 prompt'), 'First');
            await userEvent.click(button('Question'));
            await userEvent.type(field('Q2 prompt'), 'Second');
            await userEvent.click(button('Remove Q2 option D'));
            await userEvent.click(button('Remove Q2 option C'));
            await fillOptions(2, ['yes', 'no']);
            await userEvent.click(screen.getByRole('radio', { name: 'Q2 answer B' }));

            await userEvent.click(button('Save'));

            await waitFor(() => expect(posts).toHaveLength(1));
            expect(posts[0].description).toBe('');
            expect(posts[0].questions).toHaveLength(2);
            expect(posts[0].questions[0]).toMatchObject({ domain: 'Logic', prompt: 'First', answer: 'A' });
            expect(Object.keys(posts[0].questions[0].options)).toEqual(['A', 'B', 'C', 'D']);
            expect(posts[0].questions[1]).toEqual({
                domain: 'Logic', prompt: 'Second', options: { A: 'yes', B: 'no' }, answer: 'B', explanation: '',
            });
        });

        it('sends the re-lettered options after a removal', async () => {
            const posts = serve();
            renderPage();
            await userEvent.type(field('Title'), 'T');
            await fillOptions(1, ['one', 'two', 'three', 'four']);
            await userEvent.click(screen.getByRole('radio', { name: 'Q1 answer D' }));
            await userEvent.click(button('Remove Q1 option A'));

            await userEvent.click(button('Save'));

            await waitFor(() => expect(posts).toHaveLength(1));
            expect(posts[0].questions[0].options).toEqual({ A: 'two', B: 'three', C: 'four' });
            expect(posts[0].questions[0].answer).toBe('C');
        });

        it('does not post without a title', async () => {
            const posts = serve();
            renderPage();

            await userEvent.click(button('Save'));

            await new Promise((resolve) => setTimeout(resolve, 50));
            expect(posts).toEqual([]);
            expect(toast.success).not.toHaveBeenCalled();
            expect(screen.queryByTestId('where')).not.toBeInTheDocument();
        });

        it('toasts Saved and goes back to the tests', async () => {
            serve();
            renderPage();
            await userEvent.type(field('Title'), 'T');

            await userEvent.click(button('Save'));

            await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/admin/tests'));
            expect(toast.success).toHaveBeenCalledWith('Saved');
            expect(toast.error).not.toHaveBeenCalled();
        });

        it('toasts the API error, stays on the form and allows a retry', async () => {
            const posts = serve({
                response: (count) => (count === 1
                    ? failure('Question 1 has no prompt', 422)
                    : envelope({ quiz: { slug: 'new-test', title: 'T' } })),
            });
            renderPage();
            await userEvent.type(field('Title'), 'T');
            await userEvent.type(field('Q1 prompt'), 'Draft');

            await userEvent.click(button('Save'));

            await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Question 1 has no prompt'));
            expect(toast.success).not.toHaveBeenCalled();
            expect(screen.queryByTestId('where')).not.toBeInTheDocument();
            expect(field('Q1 prompt')).toHaveValue('Draft');
            await waitFor(() => expect(button('Save')).toBeEnabled());

            await userEvent.click(button('Save'));

            await waitFor(() => expect(screen.getByTestId('where')).toBeInTheDocument());
            expect(posts).toHaveLength(2);
            expect(toast.success).toHaveBeenCalledWith('Saved');
        });

        it('falls back to a generic message when the failure has no text', async () => {
            serve({ response: () => new HttpResponse(null, { status: 500 }) });
            renderPage();
            await userEvent.type(field('Title'), 'T');

            await userEvent.click(button('Save'));

            await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Failed to save'));
        });

        it('disables Save while the request is in flight', async () => {
            let release;
            const gate = new Promise((resolve) => { release = resolve; });
            const posts = serve({
                response: async () => {
                    await gate;
                    return envelope({ quiz: { slug: 'new-test', title: 'T' } });
                },
            });
            renderPage();
            await userEvent.type(field('Title'), 'T');

            await userEvent.click(button('Save'));
            await waitFor(() => expect(button('Save')).toBeDisabled());
            await userEvent.type(field('Title'), '{Enter}');

            release();
            await waitFor(() => expect(screen.getByTestId('where')).toBeInTheDocument());
            expect(posts).toHaveLength(1);
        });
    });
});
