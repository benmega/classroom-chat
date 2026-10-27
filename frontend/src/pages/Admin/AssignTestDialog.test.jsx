import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import toast from 'react-hot-toast';
import { server } from '../../test/mocks/server';
import AssignTestDialog from './AssignTestDialog';

vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

const envelope = (data) => HttpResponse.json({ status: 'success', data, error: null });
const failure = (error, status = 400) => HttpResponse.json({ status: 'error', data: null, error }, { status });

const room = (id, name) => ({ id, name });
const ana = { id: 7, username: 'ana', nickname: 'Ana B' };
const bo = { id: 8, username: 'bo', nickname: null };
const cy = { id: 9, username: 'cy', nickname: 'Cy' };

const ROOMS = [room('c1', 'Period 1'), room('c2', 'Period 2')];

const makeQuiz = (assignments) => ({ slug: 'cs-6-8', title: 'CS 6-8', ...(assignments ? { assignments } : {}) });

const serve = ({ classrooms = ROOMS, users = [ana, bo, cy], onPut, putResponse, onSearch } = {}) => {
    server.use(
        http.get('*/api/admin/classrooms', () => envelope({ classrooms })),
        http.get('*/user/api/users/search', ({ request }) => {
            const q = new URL(request.url).searchParams.get('q');
            onSearch?.(q);
            return envelope({ users: users.filter((u) => `${u.nickname || ''} ${u.username}`.toLowerCase().includes(q.toLowerCase())) });
        }),
        http.put('*/api/quizzes/admin/:slug/assignments', async ({ request, params }) => {
            onPut?.({ slug: params.slug, ...(await request.json()) });
            return putResponse ? putResponse() : envelope({ quiz: makeQuiz({ classrooms: [], students: [] }) });
        }),
    );
};

const renderDialog = (quiz = makeQuiz(), props = {}) => {
    const onClose = vi.fn();
    const onSaved = vi.fn();
    render(<AssignTestDialog quiz={quiz} onClose={onClose} onSaved={onSaved} {...props} />);
    return { onClose, onSaved };
};

const dialog = () => screen.getByRole('dialog', { name: 'Assign: CS 6-8' });
const classBox = async (name) => within(dialog()).findByRole('checkbox', { name });
const addStudent = async (text, optionName) => {
    await userEvent.type(within(dialog()).getByRole('combobox', { name: 'Add student' }), text);
    await userEvent.click(await within(dialog()).findByRole('option', { name: optionName }));
};

describe('AssignTestDialog', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('classes', () => {
        it('shows Loading, then one checkbox per class', async () => {
            let release;
            const gate = new Promise((resolve) => { release = resolve; });
            server.use(http.get('*/api/admin/classrooms', async () => {
                await gate;
                return envelope({ classrooms: ROOMS });
            }));
            renderDialog();

            expect(dialog()).toBeInTheDocument();
            expect(within(dialog()).getByText('Loading')).toBeInTheDocument();
            expect(within(dialog()).queryByRole('checkbox')).not.toBeInTheDocument();

            release();
            expect(await classBox('Period 1')).not.toBeChecked();
            expect(within(dialog()).getByRole('checkbox', { name: 'Period 2' })).not.toBeChecked();
            expect(within(dialog()).queryByText('Loading')).not.toBeInTheDocument();
        });

        it('leaves out the global and archive classes', async () => {
            serve({ classrooms: [room('global', 'Global'), room('c1', 'Period 1'), room('archive', 'Archive')] });
            renderDialog();

            await classBox('Period 1');
            expect(within(dialog()).getAllByRole('checkbox')).toHaveLength(1);
            expect(within(dialog()).queryByText('Global')).not.toBeInTheDocument();
            expect(within(dialog()).queryByText('Archive')).not.toBeInTheDocument();
        });

        it('shows None when there are no classes', async () => {
            serve({ classrooms: [room('global', 'Global')] });
            renderDialog();

            const group = within(dialog()).getByRole('group', { name: 'Classes' });
            expect(await within(group).findByText('None')).toBeInTheDocument();
            expect(within(group).queryByRole('checkbox')).not.toBeInTheDocument();
        });

        it('shows None and toasts when the classes fail to load', async () => {
            server.use(http.get('*/api/admin/classrooms', () => failure('Nope', 500)));
            renderDialog();

            await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Nope'));
            const group = within(dialog()).getByRole('group', { name: 'Classes' });
            expect(await within(group).findByText('None')).toBeInTheDocument();
        });

        it('falls back to a generic message when the load failure has no text', async () => {
            server.use(http.get('*/api/admin/classrooms', () => new HttpResponse(null, { status: 500 })));
            renderDialog();

            await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Failed to load classes'));
        });

        it('ticks the classes the test is already assigned to', async () => {
            serve();
            renderDialog(makeQuiz({ classrooms: [room('c2', 'Period 2')], students: [] }));

            expect(await classBox('Period 2')).toBeChecked();
            expect(within(dialog()).getByRole('checkbox', { name: 'Period 1' })).not.toBeChecked();
        });

        it('does not update after it is closed before the classes load', async () => {
            let release;
            const gate = new Promise((resolve) => { release = resolve; });
            server.use(http.get('*/api/admin/classrooms', async () => {
                await gate;
                return failure('Late', 500);
            }));
            const view = render(<AssignTestDialog quiz={makeQuiz()} onClose={vi.fn()} onSaved={vi.fn()} />);
            view.unmount();

            release();
            await new Promise((resolve) => setTimeout(resolve, 50));
            expect(toast.error).not.toHaveBeenCalled();
        });
    });

    describe('everyone', () => {
        it('shows Everyone while nothing is selected and hides it once something is', async () => {
            serve();
            renderDialog();

            expect(within(dialog()).getByText('Everyone')).toBeInTheDocument();
            await userEvent.click(await classBox('Period 1'));
            expect(within(dialog()).queryByText('Everyone')).not.toBeInTheDocument();
            await userEvent.click(within(dialog()).getByRole('checkbox', { name: 'Period 1' }));
            expect(within(dialog()).getByText('Everyone')).toBeInTheDocument();
        });

        it('does not show Everyone when only students are assigned', async () => {
            serve();
            renderDialog(makeQuiz({ classrooms: [], students: [ana] }));

            await classBox('Period 1');
            expect(within(dialog()).queryByText('Everyone')).not.toBeInTheDocument();
        });
    });

    describe('students', () => {
        it('lists the assigned students as chips, by nickname then username', async () => {
            serve();
            renderDialog(makeQuiz({ classrooms: [], students: [ana, bo] }));

            await classBox('Period 1');
            const group = within(dialog()).getByRole('group', { name: 'Students' });
            expect(within(group).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Ana B', 'bo']);
            expect(within(group).getByRole('button', { name: 'Remove Ana B' })).toBeInTheDocument();
            expect(within(group).getByRole('button', { name: 'Remove bo' })).toBeInTheDocument();
        });

        it('shows no chip list without students', async () => {
            serve();
            renderDialog();

            await classBox('Period 1');
            expect(within(dialog()).queryByRole('list')).not.toBeInTheDocument();
        });

        it('removes a student with the chip button', async () => {
            serve();
            renderDialog(makeQuiz({ classrooms: [], students: [ana, bo] }));

            await classBox('Period 1');
            await userEvent.click(within(dialog()).getByRole('button', { name: 'Remove Ana B' }));

            const group = within(dialog()).getByRole('group', { name: 'Students' });
            expect(within(group).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['bo']);
            await userEvent.click(within(dialog()).getByRole('button', { name: 'Remove bo' }));
            expect(within(dialog()).queryByRole('list')).not.toBeInTheDocument();
            expect(within(dialog()).getByText('Everyone')).toBeInTheDocument();
        });

        it('adds a student found by search and clears the box', async () => {
            const seen = [];
            serve({ onSearch: (q) => seen.push(q) });
            renderDialog();
            await classBox('Period 1');

            await addStudent('an', /Ana B/);

            const group = within(dialog()).getByRole('group', { name: 'Students' });
            expect(within(group).getAllByRole('listitem').map((li) => li.textContent)).toEqual(['Ana B']);
            expect(within(dialog()).getByRole('combobox', { name: 'Add student' })).toHaveValue('');
            expect(within(dialog()).queryByText('Everyone')).not.toBeInTheDocument();
            expect(seen).toEqual(['an']);
        });

        it('does not search for a single character', async () => {
            const seen = [];
            serve({ onSearch: (q) => seen.push(q) });
            renderDialog();
            await classBox('Period 1');

            await userEvent.type(within(dialog()).getByRole('combobox', { name: 'Add student' }), 'a');
            await new Promise((resolve) => setTimeout(resolve, 450));

            expect(seen).toEqual([]);
            expect(within(dialog()).queryByRole('option')).not.toBeInTheDocument();
        });

        it('does not add the same student twice', async () => {
            serve();
            renderDialog(makeQuiz({ classrooms: [], students: [ana] }));
            await classBox('Period 1');

            await addStudent('an', /Ana B/);

            const group = within(dialog()).getByRole('group', { name: 'Students' });
            expect(within(group).getAllByRole('listitem')).toHaveLength(1);
        });

        it('adds a student with only a username', async () => {
            serve({ users: [{ id: 10, username: 'dee', nickname: null }] });
            renderDialog();
            await classBox('Period 1');

            await userEvent.type(within(dialog()).getByRole('combobox', { name: 'Add student' }), 'de');
            await userEvent.click(await within(dialog()).findByRole('option', { name: /dee/ }));

            expect(within(dialog()).getByRole('button', { name: 'Remove dee' })).toBeInTheDocument();
        });
    });

    describe('save', () => {
        it('sends the ticked classes and added students, then reports the quiz and closes', async () => {
            const puts = [];
            const saved = makeQuiz({ classrooms: [room('c1', 'Period 1')], students: [cy] });
            serve({ onPut: (body) => puts.push(body), putResponse: () => envelope({ quiz: saved }) });
            const { onClose, onSaved } = renderDialog();

            await userEvent.click(await classBox('Period 1'));
            await addStudent('cy', /Cy/);
            await userEvent.click(within(dialog()).getByRole('button', { name: 'Save' }));

            await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
            expect(puts).toEqual([{ slug: 'cs-6-8', classroom_ids: ['c1'], student_ids: [9] }]);
            expect(onSaved).toHaveBeenCalledTimes(1);
            expect(onSaved).toHaveBeenCalledWith(saved);
            expect(onSaved.mock.invocationCallOrder[0]).toBeLessThan(onClose.mock.invocationCallOrder[0]);
            expect(toast.error).not.toHaveBeenCalled();
        });

        it('sends empty lists to open the test to everyone', async () => {
            const puts = [];
            serve({ onPut: (body) => puts.push(body) });
            const { onClose } = renderDialog(makeQuiz({ classrooms: [room('c1', 'Period 1')], students: [ana] }));

            await userEvent.click(await classBox('Period 1'));
            await userEvent.click(within(dialog()).getByRole('button', { name: 'Remove Ana B' }));
            await userEvent.click(within(dialog()).getByRole('button', { name: 'Save' }));

            await waitFor(() => expect(onClose).toHaveBeenCalled());
            expect(puts).toEqual([{ slug: 'cs-6-8', classroom_ids: [], student_ids: [] }]);
        });

        it('keeps the existing selection when nothing was changed', async () => {
            const puts = [];
            serve({ onPut: (body) => puts.push(body) });
            const { onClose } = renderDialog(makeQuiz({ classrooms: [room('c2', 'Period 2')], students: [ana, bo] }));

            await classBox('Period 2');
            await userEvent.click(within(dialog()).getByRole('button', { name: 'Save' }));

            await waitFor(() => expect(onClose).toHaveBeenCalled());
            expect(puts).toEqual([{ slug: 'cs-6-8', classroom_ids: ['c2'], student_ids: [7, 8] }]);
        });

        it('closes without reporting when the response has no quiz', async () => {
            serve({ putResponse: () => envelope({}) });
            const { onClose, onSaved } = renderDialog();

            await classBox('Period 1');
            await userEvent.click(within(dialog()).getByRole('button', { name: 'Save' }));

            await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
            expect(onSaved).not.toHaveBeenCalled();
        });

        it('toasts the error, stays open and allows another try', async () => {
            let calls = 0;
            serve({
                putResponse: () => {
                    calls += 1;
                    return calls === 1 ? failure('Unknown class', 404) : envelope({ quiz: makeQuiz({ classrooms: [], students: [] }) });
                },
            });
            const { onClose, onSaved } = renderDialog();

            await classBox('Period 1');
            const save = within(dialog()).getByRole('button', { name: 'Save' });
            await userEvent.click(save);

            await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Unknown class'));
            expect(onClose).not.toHaveBeenCalled();
            expect(onSaved).not.toHaveBeenCalled();
            expect(dialog()).toBeInTheDocument();
            await waitFor(() => expect(save).toBeEnabled());

            await userEvent.click(save);
            await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
            expect(onSaved).toHaveBeenCalledTimes(1);
        });

        it('falls back to a generic message when the save failure has no text', async () => {
            serve({ putResponse: () => new HttpResponse(null, { status: 500 }) });
            renderDialog();

            await classBox('Period 1');
            await userEvent.click(within(dialog()).getByRole('button', { name: 'Save' }));

            await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Failed to save'));
        });

        it('disables Save while the request is in flight', async () => {
            let release;
            const gate = new Promise((resolve) => { release = resolve; });
            const puts = [];
            serve({
                onPut: (body) => puts.push(body),
                putResponse: async () => {
                    await gate;
                    return envelope({ quiz: makeQuiz({ classrooms: [], students: [] }) });
                },
            });
            const { onClose } = renderDialog();

            await classBox('Period 1');
            const save = within(dialog()).getByRole('button', { name: 'Save' });
            await userEvent.click(save);

            await waitFor(() => expect(save).toBeDisabled());
            release();
            await waitFor(() => expect(onClose).toHaveBeenCalled());
            expect(puts).toHaveLength(1);
        });
    });

    describe('closing', () => {
        it('closes on Cancel without saving', async () => {
            const puts = [];
            serve({ onPut: (body) => puts.push(body) });
            const { onClose, onSaved } = renderDialog();

            await classBox('Period 1');
            await userEvent.click(within(dialog()).getByRole('button', { name: 'Cancel' }));

            expect(onClose).toHaveBeenCalledTimes(1);
            expect(onSaved).not.toHaveBeenCalled();
            expect(puts).toEqual([]);
        });

        it('closes with the modal close button', async () => {
            serve();
            const { onClose } = renderDialog();

            await classBox('Period 1');
            await userEvent.click(within(dialog()).getByRole('button', { name: 'Close modal' }));

            expect(onClose).toHaveBeenCalledTimes(1);
        });
    });
});
