import React, { useState } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen, waitFor, act, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AdminPanel from './AdminPanel';
import adminQueryClient from './adminQueryClient';
import client from '../api/client';

vi.mock('../api/client', () => ({
    default: {
        get: vi.fn(),
        put: vi.fn(),
        post: vi.fn(),
        delete: vi.fn(),
    },
}));

// Rendering the real react-admin panel is slow on a busy machine; the default 5s is too tight.
vi.setConfig({ testTimeout: 20000 });

const col = (name, type, extra = {}) => ({
    name, type, nullable: true, primary_key: false, foreign_keys: [], ...extra,
});

// Distinct resource names keep the module-level schema cache from leaking between tests.
const SCHEMAS = {
    Message: [
        col('id', 'INTEGER', { primary_key: true, nullable: false }),
        col('user_id', 'INTEGER', { nullable: false, foreign_keys: ['users.id'] }),
        col('content', 'TEXT', { nullable: false }),
        col('message_type', 'ENUM', { nullable: false, enums: ['text', 'link', 'code_snippet'] }),
        col('is_struck', 'BOOLEAN'),
        col('created_at', 'DATETIME'),
        col('edited_at', 'DATETIME'),
    ],
    ProjectTemplate: [
        col('id', 'INTEGER', { primary_key: true, nullable: false }),
        col('name', 'STRING', { nullable: false }),
        col('concepts', 'JSON'),
    ],
    User: [
        col('id', 'INTEGER', { primary_key: true, nullable: false }),
        col('_username', 'STRING', { nullable: false }),
        col('password_hash', 'STRING', { nullable: false }),
        col('last_daily_duck', 'DATE'),
    ],
    Course: [
        col('id', 'STRING', { primary_key: true, nullable: false }),
        col('name', 'STRING', { nullable: false }),
    ],
    Skill: [
        col('id', 'INTEGER', { primary_key: true, nullable: false }),
        col('name', 'STRING', { nullable: false }),
    ],
    Classroom: [
        col('id', 'STRING', { primary_key: true, nullable: false }),
        col('name', 'STRING', { nullable: false }),
    ],
    Challenge: [
        col('id', 'INTEGER', { primary_key: true, nullable: false }),
        col('name', 'STRING', { nullable: false }),
        col('difficulty', 'STRING'),
        col('value', 'INTEGER'),
    ],
    Achievement: [
        col('id', 'INTEGER', { primary_key: true, nullable: false }),
        col('name', 'STRING', { nullable: false }),
    ],
    DuckTransaction: [
        col('id', 'INTEGER', { primary_key: true, nullable: false }),
        col('reason', 'STRING'),
    ],
};

const RECORDS = {
    Message: [{
        id: 5, user_id: 3, content: 'hello world', message_type: 'link', is_struck: false,
        created_at: '2024-05-01T10:30:15', edited_at: null,
    }],
    ProjectTemplate: [
        { id: 1, name: 'Dragon', concepts: ['loops', 'turtle'] },
        { id: 2, name: 'Phoenix', concepts: null },
    ],
    User: [
        { id: 3, _username: 'bob', last_daily_duck: '2024-05-01' },
        { id: 4, _username: 'alice', last_daily_duck: null },
    ],
    Course: [{ id: 'c1', name: 'Course One' }],
    Skill: [{ id: 1, name: 'Skill One' }],
    Classroom: [],
    Challenge: [{ id: 1, name: 'Challenge One', difficulty: 'easy', value: 5 }],
    Achievement: [{ id: 1, name: 'Gold star' }],
    DuckTransaction: [{ id: 1, reason: 'Daily bonus' }],
};

const httpError = (status, error) =>
    Object.assign(new Error(`Request failed with status code ${status}`), {
        response: { status, data: { error } },
    });

/** Fake backend for the admin CRUD endpoints. */
function fakeBackend(url) {
    const [path, qs = ''] = url.split('?');
    const search = new URLSearchParams(qs);
    let match = path.match(/^\/api\/admin\/crud\/schema\/(\w+)$/);
    if (match) {
        if (!SCHEMAS[match[1]]) return Promise.reject(httpError(404, 'Resource not found'));
        return Promise.resolve({ data: { resource: match[1], fields: SCHEMAS[match[1]] } });
    }
    match = path.match(/^\/api\/admin\/crud\/(\w+)\/(\w+)$/);
    if (match) {
        const record = (RECORDS[match[1]] || []).find(r => String(r.id) === match[2]);
        return record
            ? Promise.resolve({ data: { data: record } })
            : Promise.reject(httpError(404, 'Item not found'));
    }
    match = path.match(/^\/api\/admin\/crud\/(\w+)$/);
    let rows = RECORDS[match[1]] || [];
    const ids = search.getAll('id');
    if (ids.length) rows = rows.filter(r => ids.includes(String(r.id)));
    const q = search.get('q');
    if (q) rows = rows.filter(r => String(r._username || r.name).toLowerCase().includes(q.toLowerCase()));
    return Promise.resolve({ data: { data: rows, total: rows.length } });
}

/** Mount the panel where App.jsx does: under /admin/advanced-crud/* of the app's router. */
function renderPanel(path, element = <AdminPanel />) {
    return render(
        <MemoryRouter initialEntries={[`/admin/advanced-crud${path}`]}>
            <Routes>
                <Route path="/admin/advanced-crud/*" element={element} />
            </Routes>
        </MemoryRouter>
    );
}

const requestedUrls = () => client.get.mock.calls.map(call => call[0]);

describe('AdminPanel', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // The panel's query cache outlives a single render; start every test from an empty one
        adminQueryClient.clear();
        client.get.mockImplementation(fakeBackend);
        client.put.mockImplementation((url, data) => Promise.resolve({ data: { data } }));
        client.post.mockImplementation((url, data) => Promise.resolve({ data: { data: { id: 99, ...data } } }));
    });

    describe('list views', () => {
        it('shows schema columns, with references displayed through the referenced _username', async () => {
            renderPanel('/Message');

            expect(await screen.findByText('hello world')).toBeInTheDocument();
            // user_id 3 resolves through the User resource's _username (a getMany)
            expect(await screen.findByText('bob')).toBeInTheDocument();
            expect(requestedUrls()).toContain('/api/admin/crud/schema/Message');
        });

        it('resolves all references of a page with one request', async () => {
            RECORDS.Skill = [
                { id: 1, name: 'Skill One', user_id: 3 },
                { id: 2, name: 'Skill Two', user_id: 4 },
            ];
            SCHEMAS.Skill = [...SCHEMAS.Skill.slice(0, 2), col('user_id', 'INTEGER', { foreign_keys: ['users.id'] })];
            renderPanel('/Skill');

            expect(await screen.findByText('alice')).toBeInTheDocument();
            expect(screen.getByText('bob')).toBeInTheDocument();
            const userRequests = requestedUrls().filter(url => url.startsWith('/api/admin/crud/User'));
            expect(userRequests).toHaveLength(1);
            expect(new URLSearchParams(userRequests[0].split('?')[1]).getAll('id').sort()).toEqual(['3', '4']);
        });

        it('shows JSON columns as JSON text', async () => {
            renderPanel('/ProjectTemplate');

            expect(await screen.findByText('["loops","turtle"]')).toBeInTheDocument();
            // A missing value is an empty cell, not the text "null"
            expect(screen.getByText('Phoenix')).toBeInTheDocument();
            expect(screen.queryByText('null')).not.toBeInTheDocument();
        });

        it('hides fields listed in HIDDEN_FIELDS', async () => {
            renderPanel('/User');

            expect(await screen.findByText('alice')).toBeInTheDocument();
            expect(screen.queryByText(/password hash/i)).not.toBeInTheDocument();
        });
    });

    describe('layout', () => {
        it('tags the react-admin layout so the panel styles can be scoped to it, and renders no sidebar', async () => {
            const { container } = renderPanel('/Message');

            expect(await screen.findByText('hello world')).toBeInTheDocument();
            // AdminPanel.css scopes its .RaLayout-appFrame rule under this class instead of a global !important rule
            const frame = container.querySelector('.RaLayout-appFrame');
            expect(frame.closest('.admin-crud-layout')).not.toBeNull();
            // The sidebar is nulled out in CustomLayout, which is why no .RaSidebar-root rule is needed
            expect(container.querySelector('.RaSidebar-root')).toBeNull();
        });
    });

    describe('schema loading', () => {
        it('shows a spinner, then an alert naming the resource when the schema cannot be loaded', async () => {
            const { container } = renderPanel('/Note');

            const alert = await screen.findByRole('alert');
            expect(alert).toHaveTextContent('Could not load the Note schema: Resource not found');
            expect(alert).toHaveClass('admin-schema-error');
            expect(container.querySelector('p.admin-schema-error')).toBeNull();
        });

        it('falls back to the error message when the server sent no error text', async () => {
            client.get.mockImplementation(() => Promise.reject(new Error('Network Error')));
            renderPanel('/BannedWords');

            expect(await screen.findByRole('alert')).toHaveTextContent('Could not load the BannedWords schema: Network Error');
        });

        it('does not update state when the view unmounts before the schema arrives', async () => {
            const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            let settle;
            client.get.mockImplementation(url => (
                url === '/api/admin/crud/schema/Classroom'
                    ? new Promise(resolve => { settle = () => resolve({ data: { fields: SCHEMAS.Classroom } }); })
                    : fakeBackend(url)
            ));
            const { unmount } = renderPanel('/Classroom');
            await waitFor(() => expect(settle).toBeTypeOf('function'));

            unmount();
            await act(async () => { settle(); });

            expect(errorSpy).not.toHaveBeenCalled();
            errorSpy.mockRestore();
        });

        it('ignores a schema failure that arrives after unmount', async () => {
            let fail;
            client.get.mockImplementation(url => (
                url === '/api/admin/crud/schema/Configuration'
                    ? new Promise((resolve, reject) => { fail = () => reject(httpError(500, 'late')); })
                    : fakeBackend(url)
            ));
            const { unmount } = renderPanel('/Configuration');
            await waitFor(() => expect(fail).toBeTypeOf('function'));

            unmount();
            await act(async () => { fail(); });

            expect(screen.queryByRole('alert')).not.toBeInTheDocument();
        });
    });

    describe('switching resources', () => {
        /** Make the schema request of one resource wait until the test lets it through. */
        function holdSchema(resource) {
            const held = {};
            client.get.mockImplementation(url => (
                url === `/api/admin/crud/schema/${resource}`
                    ? new Promise(resolve => { held.release = () => resolve({ data: { fields: SCHEMAS[resource] } }); })
                    : fakeBackend(url)
            ));
            return held;
        }

        it('ignores a schema that arrives after the user moved on to another resource', async () => {
            const held = holdSchema('DuckTransaction');
            renderPanel('/DuckTransaction');
            await waitFor(() => expect(held.release).toBeTypeOf('function'));

            await userEvent.click(screen.getByText(/^challenges$/i));
            expect(await screen.findByText('Challenge One')).toBeInTheDocument();

            await act(async () => { held.release(); });

            expect(screen.getByText('Challenge One')).toBeInTheDocument();
            expect(screen.queryByText('Daily bonus')).not.toBeInTheDocument();
        });

        it('does not show the columns of the previous resource while the next schema loads', async () => {
            const held = holdSchema('Achievement');
            renderPanel('/Challenge');
            expect(await screen.findByText('Challenge One')).toBeInTheDocument();
            expect(screen.getByText('Difficulty')).toBeInTheDocument();

            await userEvent.click(screen.getByText(/^achievements$/i));
            await waitFor(() => expect(held.release).toBeTypeOf('function'));

            expect(screen.queryByText('Difficulty')).not.toBeInTheDocument();

            await act(async () => { held.release(); });
            expect(await screen.findByText('Gold star')).toBeInTheDocument();
            expect(screen.queryByText('Difficulty')).not.toBeInTheDocument();
        });

        it('does not keep the schema error of one resource on the next resource', async () => {
            renderPanel('/Note');
            expect(await screen.findByRole('alert')).toHaveTextContent('Could not load the Note schema');

            await userEvent.click(screen.getByText(/^challenges$/i));

            expect(await screen.findByText('Challenge One')).toBeInTheDocument();
            expect(screen.queryByRole('alert')).not.toBeInTheDocument();
        });
    });

    describe('edit form', () => {
        it('renders typed inputs for each column type', async () => {
            renderPanel('/Message/5');

            // TEXT -> multiline textarea
            const content = await screen.findByLabelText('Content');
            expect(content.tagName).toBe('TEXTAREA');
            expect(content).toHaveValue('hello world');

            // ENUM -> select limited to the declared values
            await userEvent.click(screen.getByRole('combobox', { name: /message type/i }));
            const options = within(await screen.findByRole('listbox')).getAllByRole('option').map(o => o.textContent);
            expect(options).toEqual(expect.arrayContaining(['text', 'link', 'code_snippet']));
            await userEvent.keyboard('{Escape}');

            // DATETIME -> datetime-local input, time kept (not truncated to a date)
            const created = screen.getByLabelText(/created at/i);
            expect(created).toHaveAttribute('type', 'datetime-local');
            expect(created).toHaveValue('2024-05-01T10:30');
            expect(created).toBeDisabled();
            expect(screen.getByLabelText(/edited at/i)).toHaveAttribute('type', 'datetime-local');
        });

        it('shows the referenced record through displayField in the autocomplete', async () => {
            renderPanel('/Message/5');

            const userInput = await screen.findByRole('combobox', { name: /^user/i });
            await waitFor(() => expect(userInput).toHaveValue('bob'));
        });

        it('searches references with q', async () => {
            renderPanel('/Message/5');

            const userInput = await screen.findByRole('combobox', { name: /^user/i });
            await waitFor(() => expect(userInput).toHaveValue('bob'));
            await userEvent.clear(userInput);
            await userEvent.type(userInput, 'ali');

            await waitFor(() => {
                const searched = requestedUrls().filter(url => /[?&]q=ali/.test(url));
                expect(searched.length).toBeGreaterThan(0);
            });
            expect(await screen.findByRole('option', { name: 'alice' })).toBeInTheDocument();
        });

        it('renders numeric columns as number inputs', async () => {
            renderPanel('/Challenge/1');

            const value = await screen.findByLabelText(/^value/i);
            expect(value).toHaveAttribute('type', 'number');
            expect(value).toHaveValue(5);
        });

        it('keeps date-only columns as date inputs', async () => {
            renderPanel('/User/3');

            const duck = await screen.findByLabelText(/last daily duck/i);
            expect(duck).toHaveAttribute('type', 'date');
            expect(duck).toHaveValue('2024-05-01');
            expect(screen.queryByLabelText(/password hash/i)).not.toBeInTheDocument();
        });

        it('shows JSON columns as formatted text and saves them back as JSON, not as a string', async () => {
            renderPanel('/ProjectTemplate/1');

            const concepts = await screen.findByLabelText('Concepts');
            expect(concepts.tagName).toBe('TEXTAREA');
            expect(JSON.parse(concepts.value)).toEqual(['loops', 'turtle']);

            // Edit another field and save: the untouched JSON column must round-trip as a list
            await userEvent.type(screen.getByLabelText(/^name/i), '!');
            await userEvent.click(screen.getByRole('button', { name: /save/i }));

            // Edit saves are undoable: react-admin sends the request once the notification closes
            await waitFor(() => expect(client.put).toHaveBeenCalledTimes(1), { timeout: 9000 });
            expect(client.put.mock.calls[0][0]).toBe('/api/admin/crud/ProjectTemplate/1');
            expect(client.put.mock.calls[0][1]).toMatchObject({ name: 'Dragon!', concepts: ['loops', 'turtle'] });
        }, 20000);

        it('rejects invalid JSON without sending it, and shows what was typed', async () => {
            renderPanel('/ProjectTemplate/1');

            const concepts = await screen.findByLabelText('Concepts');
            await userEvent.clear(concepts);
            await userEvent.click(concepts);
            await userEvent.paste('[1, 2');
            expect(concepts).toHaveValue('[1, 2');

            await userEvent.click(screen.getByRole('button', { name: /save/i }));

            expect(await screen.findByText('Invalid JSON')).toBeInTheDocument();
            expect(client.put).not.toHaveBeenCalled();
        });

        it('sends a cleared JSON column as null', async () => {
            renderPanel('/ProjectTemplate/1');

            await userEvent.clear(await screen.findByLabelText('Concepts'));
            await userEvent.click(screen.getByRole('button', { name: /save/i }));

            await waitFor(() => expect(client.put).toHaveBeenCalledTimes(1), { timeout: 9000 });
            expect(client.put.mock.calls[0][1].concepts).toBeNull();
        }, 20000);
    });

    describe('create form', () => {
        it('omits the primary key and posts the entered values', async () => {
            renderPanel('/ProjectTemplate/create');

            const name = await screen.findByLabelText(/^name/i);
            expect(screen.queryByLabelText(/^id/i)).not.toBeInTheDocument();
            await userEvent.type(name, 'New template');
            await userEvent.click(screen.getByRole('button', { name: /save/i }));

            await waitFor(() => expect(client.post).toHaveBeenCalledTimes(1));
            expect(client.post.mock.calls[0][0]).toBe('/api/admin/crud/ProjectTemplate');
            expect(client.post.mock.calls[0][1]).toMatchObject({ name: 'New template' });
        });

        it('parses JSON typed into a JSON column', async () => {
            renderPanel('/ProjectTemplate/create');

            await userEvent.type(await screen.findByLabelText(/^name/i), 'T');
            await userEvent.click(screen.getByLabelText('Concepts'));
            await userEvent.paste('{"a": [1, 2]}');
            await userEvent.click(screen.getByRole('button', { name: /save/i }));

            await waitFor(() => expect(client.post).toHaveBeenCalledTimes(1));
            expect(client.post.mock.calls[0][1]).toMatchObject({ name: 'T', concepts: { a: [1, 2] } });
        });

        it('does not post invalid JSON', async () => {
            renderPanel('/ProjectTemplate/create');

            await userEvent.type(await screen.findByLabelText(/^name/i), 'T');
            await userEvent.click(screen.getByLabelText('Concepts'));
            await userEvent.paste('{oops');
            await userEvent.click(screen.getByRole('button', { name: /save/i }));

            expect(await screen.findByText('Invalid JSON')).toBeInTheDocument();
            expect(client.post).not.toHaveBeenCalled();
        });

        it('posts a chosen enum value and a datetime with its time', async () => {
            renderPanel('/Message/create');

            await userEvent.type(await screen.findByLabelText('Content'), 'hi');
            await userEvent.click(screen.getByRole('combobox', { name: /message type/i }));
            await userEvent.click(await screen.findByRole('option', { name: 'code_snippet' }));
            fireDatetime(screen.getByLabelText(/edited at/i), '2024-06-02T08:15');
            await userEvent.click(screen.getByRole('button', { name: /save/i }));

            await waitFor(() => expect(client.post).toHaveBeenCalledTimes(1));
            expect(client.post.mock.calls[0][1]).toMatchObject({
                content: 'hi',
                message_type: 'code_snippet',
                edited_at: '2024-06-02T08:15',
            });
        });

        it('lets a Course be created with its own id', async () => {
            renderPanel('/Course/create');

            const id = await screen.findByLabelText(/^id/i);
            expect(id).toBeEnabled();
        });
    });

    describe('remounting', () => {
        it('keeps unsaved form input when AdminPanel re-renders', async () => {
            // A parent re-render re-renders AdminPanel (as an auth store update does in the app)
            function Host() {
                const [renders, setRenders] = useState(0);
                return (
                    <>
                        <button onClick={() => setRenders(renders + 1)}>re-render {renders}</button>
                        <AdminPanel />
                    </>
                );
            }
            renderPanel('/ProjectTemplate/1', <Host />);

            const name = await screen.findByLabelText(/^name/i);
            await userEvent.type(name, ' extra');
            expect(name).toHaveValue('Dragon extra');

            await userEvent.click(screen.getByRole('button', { name: /re-render/ }));
            expect(screen.getByRole('button', { name: 're-render 1' })).toBeInTheDocument();

            const after = screen.getByLabelText(/^name/i);
            expect(after).toBe(name); // same DOM node: the view was not remounted
            expect(after).toHaveValue('Dragon extra');
        });
    });

    it('lists only resources that exist (no Conversation entry)', async () => {
        renderPanel('/Message');

        await screen.findByText('hello world');
        expect(screen.queryByText('Conversations')).not.toBeInTheDocument();
        expect(screen.getByText(/^challenge ?logs$/i)).toBeInTheDocument();
    });
});

/** Set a datetime-local input the way a browser would (React ignores plain value assignment). */
function fireDatetime(input, value) {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    act(() => {
        setter.call(input, value);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        input.blur();
    });
}
