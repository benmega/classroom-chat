import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import UserSearchInput from './UserSearchInput';
import Modal from './Modal';
import client from '../../api/client';

vi.mock('../../api/client', () => ({
    default: { get: vi.fn() },
}));

const alice = { id: 1, username: 'alice', nickname: 'Alice', slug: 'alice', profile_picture_url: '/pics/alice.png' };
const bob = { id: 2, username: 'bob', nickname: 'Bobby', slug: 'bob', profile_picture_url: '/pics/bob.png' };

// A request the test resolves by hand, so responses can arrive in any order.
const deferred = () => {
    const d = {};
    d.promise = new Promise((resolve, reject) => {
        d.resolve = resolve;
        d.reject = reject;
    });
    return d;
};
const usersResponse = (users) => ({ data: { data: { users } } });

const DEBOUNCE = 5;
const renderInput = (props = {}) => render(<UserSearchInput debounceMs={DEBOUNCE} {...props} />);
const input = () => screen.getByPlaceholderText('Search users...');
const type = (text) => fireEvent.change(input(), { target: { value: text } });
const dropdown = () => document.querySelector('.search-results-dropdown-common');
const spinner = () => document.querySelector('.search-loader-common');
const requestedUrls = () => client.get.mock.calls.map(([url]) => url);

describe('UserSearchInput', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('searches after the debounce and renders the results', async () => {
        client.get.mockResolvedValue(usersResponse([alice, bob]));
        renderInput();

        type('al');
        expect(client.get).not.toHaveBeenCalled();

        await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());
        expect(screen.getByText('@bob')).toBeInTheDocument();
        expect(requestedUrls()).toEqual(['/user/api/users/search?q=al']);
    });

    it('accepts a top-level users array in the response', async () => {
        client.get.mockResolvedValue({ data: { users: [alice] } });
        renderInput();

        type('al');

        await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());
    });

    it('does not search below the minimum length', async () => {
        renderInput();

        type('a');
        await new Promise((r) => setTimeout(r, DEBOUNCE * 4));

        expect(client.get).not.toHaveBeenCalled();
        expect(dropdown()).toBeNull();
    });

    it('url-encodes the query', async () => {
        client.get.mockResolvedValue(usersResponse([]));
        renderInput();

        type('a b&c');

        await waitFor(() => expect(requestedUrls()).toEqual(['/user/api/users/search?q=a%20b%26c']));
    });

    it('ignores a stale response that arrives after a newer one', async () => {
        const first = deferred();
        const second = deferred();
        client.get.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
        renderInput();

        type('al');
        await waitFor(() => expect(client.get).toHaveBeenCalledTimes(1));
        type('ali');
        await waitFor(() => expect(client.get).toHaveBeenCalledTimes(2));

        // The older request is aborted as soon as the newer search supersedes it.
        expect(client.get.mock.calls[0][1].signal.aborted).toBe(true);
        expect(client.get.mock.calls[1][1].signal.aborted).toBe(false);

        await act(async () => { second.resolve(usersResponse([alice])); });
        await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());

        await act(async () => { first.resolve(usersResponse([bob])); });
        expect(screen.getByText('Alice')).toBeInTheDocument();
        expect(screen.queryByText('Bobby')).not.toBeInTheDocument();
    });

    it('keeps the loading indicator while a newer request is running', async () => {
        const first = deferred();
        const second = deferred();
        client.get.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
        renderInput();

        type('al');
        await waitFor(() => expect(client.get).toHaveBeenCalledTimes(1));
        type('ali');
        await waitFor(() => expect(client.get).toHaveBeenCalledTimes(2));
        expect(spinner()).not.toBeNull();

        // The superseded request settles (here: as a cancellation) - the newer one is still loading.
        await act(async () => { first.reject(Object.assign(new Error('canceled'), { code: 'ERR_CANCELED' })); });
        expect(spinner()).not.toBeNull();
        expect(console.error).not.toHaveBeenCalled();

        await act(async () => { second.resolve(usersResponse([alice])); });
        await waitFor(() => expect(spinner()).toBeNull());
    });

    it('stops loading when the query drops below the minimum length', async () => {
        const first = deferred();
        client.get.mockReturnValueOnce(first.promise);
        renderInput();

        type('al');
        await waitFor(() => expect(spinner()).not.toBeNull());
        type('a');

        await waitFor(() => expect(spinner()).toBeNull());
        expect(client.get).toHaveBeenCalledTimes(1);
        await act(async () => { first.resolve(usersResponse([alice])); });
        expect(dropdown()).toBeNull();
    });

    it('does not reopen the dropdown after Escape when a response arrives later', async () => {
        const pending = deferred();
        client.get.mockReturnValueOnce(pending.promise);
        renderInput();

        type('al');
        await waitFor(() => expect(client.get).toHaveBeenCalledTimes(1));
        fireEvent.keyDown(input(), { key: 'Escape' });
        await act(async () => { pending.resolve(usersResponse([alice])); });

        expect(dropdown()).toBeNull();
    });

    it('closes on Escape and reopens when the user types again', async () => {
        client.get.mockResolvedValue(usersResponse([alice]));
        renderInput();

        type('al');
        await waitFor(() => expect(dropdown()).not.toBeNull());
        fireEvent.keyDown(input(), { key: 'Escape' });
        expect(dropdown()).toBeNull();

        type('ali');
        await waitFor(() => expect(dropdown()).not.toBeNull());
    });

    it('stays closed after picking a result even though the new query triggers another search', async () => {
        client.get.mockResolvedValue(usersResponse([alice]));
        const onChange = vi.fn();
        renderInput({ onChange });

        type('al');
        await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());
        fireEvent.click(screen.getByText('Alice'));

        // Default select behaviour puts the username into the field, which searches again.
        expect(onChange).toHaveBeenLastCalledWith('alice');
        expect(input().value).toBe('alice');
        await waitFor(() => expect(requestedUrls()).toContain('/user/api/users/search?q=alice'));
        await act(async () => { await new Promise((r) => setTimeout(r, DEBOUNCE * 3)); });

        expect(dropdown()).toBeNull();
    });

    it('calls onSelect instead of filling the field when provided', async () => {
        client.get.mockResolvedValue(usersResponse([alice, bob]));
        const onSelect = vi.fn();
        const onChange = vi.fn();
        renderInput({ onSelect, onChange });

        type('b');
        type('bo');
        await waitFor(() => expect(screen.getByText('Bobby')).toBeInTheDocument());
        onChange.mockClear();
        fireEvent.click(screen.getByText('Bobby'));

        expect(onSelect).toHaveBeenCalledWith(bob);
        expect(onChange).not.toHaveBeenCalled();
        expect(input().value).toBe('bo');
        expect(dropdown()).toBeNull();
    });

    it('closes when clicking outside and reopens on focus', async () => {
        client.get.mockResolvedValue(usersResponse([alice]));
        renderInput();

        type('al');
        await waitFor(() => expect(dropdown()).not.toBeNull());
        fireEvent.mouseDown(document.body);
        expect(dropdown()).toBeNull();

        fireEvent.focus(input());
        expect(dropdown()).not.toBeNull();
    });

    it('does not close when clicking inside the component', async () => {
        client.get.mockResolvedValue(usersResponse([alice]));
        renderInput();

        type('al');
        await waitFor(() => expect(dropdown()).not.toBeNull());
        fireEvent.mouseDown(input());

        expect(dropdown()).not.toBeNull();
    });

    it('clears the field and closes the dropdown', async () => {
        client.get.mockResolvedValue(usersResponse([alice]));
        const onChange = vi.fn();
        renderInput({ onChange });

        type('al');
        await waitFor(() => expect(dropdown()).not.toBeNull());
        fireEvent.click(screen.getByTitle('Clear search'));

        expect(input().value).toBe('');
        expect(onChange).toHaveBeenLastCalledWith('');
        expect(dropdown()).toBeNull();
    });

    it('cancels a debounced search when the field is cleared before it fires', async () => {
        renderInput({ debounceMs: 40 });

        type('al');
        fireEvent.click(screen.getByTitle('Clear search'));
        await new Promise((r) => setTimeout(r, 90));

        expect(client.get).not.toHaveBeenCalled();
    });

    it('supports keyboard navigation and Enter to select', async () => {
        client.get.mockResolvedValue(usersResponse([alice, bob]));
        const onSelect = vi.fn();
        renderInput({ onSelect });

        type('al');
        await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());

        fireEvent.keyDown(input(), { key: 'Enter' });
        expect(onSelect).not.toHaveBeenCalled();

        const selected = () => document.querySelector('.search-result-item-common.selected');
        fireEvent.keyDown(input(), { key: 'ArrowDown' });
        expect(selected()).toHaveTextContent('Alice');
        fireEvent.keyDown(input(), { key: 'ArrowDown' });
        fireEvent.keyDown(input(), { key: 'ArrowDown' });
        expect(selected()).toHaveTextContent('Bobby');
        fireEvent.keyDown(input(), { key: 'ArrowUp' });
        expect(selected()).toHaveTextContent('Alice');
        fireEvent.keyDown(input(), { key: 'ArrowUp' });
        expect(selected()).toHaveTextContent('Alice');

        fireEvent.keyDown(input(), { key: 'Enter' });
        expect(onSelect).toHaveBeenCalledWith(alice);
    });

    it('reopens a dismissed dropdown with ArrowDown', async () => {
        client.get.mockResolvedValue(usersResponse([alice]));
        renderInput();

        type('al');
        await waitFor(() => expect(dropdown()).not.toBeNull());
        fireEvent.keyDown(input(), { key: 'Escape' });
        expect(dropdown()).toBeNull();

        fireEvent.keyDown(input(), { key: 'ArrowDown' });
        expect(dropdown()).not.toBeNull();
    });

    it('ignores ArrowDown when there are no results', () => {
        renderInput();

        fireEvent.keyDown(input(), { key: 'ArrowDown' });

        expect(dropdown()).toBeNull();
    });

    it('selects a result by clicking its row', async () => {
        client.get.mockResolvedValue(usersResponse([alice]));
        const onSelect = vi.fn();
        renderInput({ onSelect });

        type('al');
        await waitFor(() => expect(screen.getByText('Alice')).toBeInTheDocument());
        fireEvent.click(screen.getByRole('option', { name: /Alice/ }));

        expect(onSelect).toHaveBeenCalledWith(alice);
    });

    it('logs search failures and leaves an empty, idle input', async () => {
        client.get.mockRejectedValue(new Error('boom'));
        renderInput();

        type('al');

        await waitFor(() => expect(console.error).toHaveBeenCalled());
        await waitFor(() => expect(spinner()).toBeNull());
        expect(dropdown()).toBeNull();
    });

    it('aborts the in-flight search on unmount without touching state afterwards', async () => {
        const pending = deferred();
        client.get.mockReturnValueOnce(pending.promise);
        const { unmount } = renderInput();

        type('al');
        await waitFor(() => expect(client.get).toHaveBeenCalledTimes(1));
        const { signal } = client.get.mock.calls[0][1];
        unmount();

        expect(signal.aborted).toBe(true);
        await act(async () => { pending.resolve(usersResponse([alice])); });
        expect(console.error).not.toHaveBeenCalled();
    });

    describe('combobox semantics and keyboard use', () => {
        const optionsOf = () => screen.getAllByRole('option');

        it('is a labelled combobox that reports whether the list is open', async () => {
            client.get.mockResolvedValue(usersResponse([alice, bob]));
            renderInput();
            const combo = screen.getByRole('combobox', { name: 'Search users...' });

            expect(combo).toHaveAttribute('aria-autocomplete', 'list');
            expect(combo).toHaveAttribute('aria-expanded', 'false');
            expect(combo).not.toHaveAttribute('aria-controls');

            type('al');
            await waitFor(() => expect(combo).toHaveAttribute('aria-expanded', 'true'));
            expect(screen.getByRole('listbox')).toHaveAttribute('id', combo.getAttribute('aria-controls'));
        });

        it('uses the placeholder prop as the accessible name', () => {
            renderInput({ placeholder: 'Search by username or nickname...' });

            expect(screen.getByRole('combobox', { name: 'Search by username or nickname...' })).toBeInTheDocument();
        });

        it('renders the results as options named after the person, with a decorative avatar', async () => {
            client.get.mockResolvedValue(usersResponse([alice, bob]));
            renderInput();

            type('al');
            await waitFor(() => expect(optionsOf()).toHaveLength(2));

            expect(screen.getByRole('option', { name: 'Alice @alice' })).toBeInTheDocument();
            expect(screen.getByRole('option', { name: 'Bobby @bob' })).toBeInTheDocument();
            expect(screen.getByRole('listbox').querySelectorAll('img[alt=""]')).toHaveLength(2);
            optionsOf().forEach((option) => expect(option).not.toHaveAttribute('tabindex'));
            expect(screen.queryByRole('button', { name: /Alice/ })).not.toBeInTheDocument();
        });

        it('points aria-activedescendant at the option picked with the arrow keys', async () => {
            const user = userEvent.setup();
            client.get.mockResolvedValue(usersResponse([alice, bob]));
            renderInput();
            const combo = screen.getByRole('combobox');

            await user.type(combo, 'al');
            await waitFor(() => expect(optionsOf()).toHaveLength(2));
            expect(combo).not.toHaveAttribute('aria-activedescendant');
            optionsOf().forEach((option) => expect(option).toHaveAttribute('aria-selected', 'false'));

            await user.keyboard('{ArrowDown}');
            expect(combo).toHaveAttribute('aria-activedescendant', optionsOf()[0].id);
            expect(optionsOf()[0]).toHaveAttribute('aria-selected', 'true');
            expect(optionsOf()[1]).toHaveAttribute('aria-selected', 'false');

            await user.keyboard('{ArrowDown}');
            expect(combo).toHaveAttribute('aria-activedescendant', optionsOf()[1].id);
            expect(optionsOf()[1]).toHaveAttribute('aria-selected', 'true');

            await user.keyboard('{ArrowUp}');
            expect(combo).toHaveAttribute('aria-activedescendant', optionsOf()[0].id);
            // Focus never leaves the input: the option is only "active".
            expect(combo).toHaveFocus();
        });

        it('gives every option and list a distinct id, also across two instances', async () => {
            client.get.mockResolvedValue(usersResponse([alice, bob]));
            render(
                <>
                    <UserSearchInput debounceMs={DEBOUNCE} placeholder="First" />
                    <UserSearchInput debounceMs={DEBOUNCE} placeholder="Second" />
                </>
            );

            fireEvent.change(screen.getByRole('combobox', { name: 'First' }), { target: { value: 'al' } });
            fireEvent.change(screen.getByRole('combobox', { name: 'Second' }), { target: { value: 'al' } });
            await waitFor(() => expect(screen.getAllByRole('listbox')).toHaveLength(2));

            const ids = [...screen.getAllByRole('listbox'), ...screen.getAllByRole('option')].map((el) => el.id);
            expect(ids.every(Boolean)).toBe(true);
            expect(new Set(ids).size).toBe(ids.length);
        });

        it('selects the active option with Enter', async () => {
            const user = userEvent.setup();
            client.get.mockResolvedValue(usersResponse([alice, bob]));
            const onSelect = vi.fn();
            renderInput({ onSelect });

            await user.type(screen.getByRole('combobox'), 'al');
            await waitFor(() => expect(optionsOf()).toHaveLength(2));
            await user.keyboard('{ArrowDown}{ArrowDown}{Enter}');

            expect(onSelect).toHaveBeenCalledWith(bob);
            expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
            expect(screen.getByRole('combobox')).toHaveAttribute('aria-expanded', 'false');
        });

        it('jumps to the first and last option with Home and End while an option is active', async () => {
            const user = userEvent.setup();
            const carol = { id: 3, username: 'carol', nickname: 'Carol', profile_picture_url: '/pics/carol.png' };
            client.get.mockResolvedValue(usersResponse([alice, bob, carol]));
            const combo = () => screen.getByRole('combobox');
            renderInput();

            await user.type(combo(), 'al');
            await waitFor(() => expect(optionsOf()).toHaveLength(3));
            await user.keyboard('{ArrowDown}');
            expect(combo()).toHaveAttribute('aria-activedescendant', optionsOf()[0].id);

            await user.keyboard('{End}');
            expect(combo()).toHaveAttribute('aria-activedescendant', optionsOf()[2].id);
            await user.keyboard('{Home}');
            expect(combo()).toHaveAttribute('aria-activedescendant', optionsOf()[0].id);
        });

        it('leaves Home and End to the text field when no option is active', async () => {
            client.get.mockResolvedValue(usersResponse([alice, bob]));
            renderInput();

            type('al');
            await waitFor(() => expect(optionsOf()).toHaveLength(2));

            const home = new KeyboardEvent('keydown', { key: 'Home', bubbles: true, cancelable: true });
            input().dispatchEvent(home);

            expect(home.defaultPrevented).toBe(false);
            expect(input()).not.toHaveAttribute('aria-activedescendant');
        });

        it('closes the list on Escape and keeps the key from also closing an enclosing dialog', async () => {
            client.get.mockResolvedValue(usersResponse([alice]));
            renderInput();
            type('al');
            await waitFor(() => expect(optionsOf()).toHaveLength(1));

            const escape = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
            input().dispatchEvent(escape);

            expect(escape.defaultPrevented).toBe(true);
            await waitFor(() => expect(screen.queryByRole('listbox')).not.toBeInTheDocument());
            expect(screen.getByRole('combobox')).toHaveAttribute('aria-expanded', 'false');
        });

        it('lets Escape through to an enclosing dialog while the list is closed', () => {
            renderInput();

            const escape = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
            input().dispatchEvent(escape);

            expect(escape.defaultPrevented).toBe(false);
        });

        it('scrolls the active option into view', async () => {
            const user = userEvent.setup();
            client.get.mockResolvedValue(usersResponse([alice, bob]));
            renderInput();
            await user.type(screen.getByRole('combobox'), 'al');
            await waitFor(() => expect(optionsOf()).toHaveLength(2));
            const scrollIntoView = vi.fn();
            optionsOf().forEach((option) => { option.scrollIntoView = scrollIntoView; });

            await user.keyboard('{ArrowDown}');

            expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest' });
        });

        it('keeps the focus in the input when a row is pressed with the mouse', async () => {
            client.get.mockResolvedValue(usersResponse([alice]));
            renderInput();
            type('al');
            await waitFor(() => expect(optionsOf()).toHaveLength(1));

            const press = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
            optionsOf()[0].dispatchEvent(press);

            expect(press.defaultPrevented).toBe(true);
        });
    });

    describe('inside a modal', () => {
        it('closes the list on the first Escape and the modal only on the second', async () => {
            const user = userEvent.setup();
            const onClose = vi.fn();
            client.get.mockResolvedValue(usersResponse([alice]));
            render(
                <Modal isOpen onClose={onClose} title="Who helped you?">
                    <UserSearchInput debounceMs={DEBOUNCE} />
                </Modal>
            );
            await user.type(screen.getByRole('combobox'), 'al');
            await waitFor(() => expect(screen.getByRole('listbox')).toBeInTheDocument());

            await user.keyboard('{Escape}');
            expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
            expect(onClose).not.toHaveBeenCalled();

            await user.keyboard('{Escape}');
            expect(onClose).toHaveBeenCalledTimes(1);
        });

        it('can pick a result with the arrow keys and Enter without leaving the input', async () => {
            const user = userEvent.setup();
            const onSelect = vi.fn();
            client.get.mockResolvedValue(usersResponse([alice, bob]));
            render(
                <Modal isOpen onClose={vi.fn()} title="Who helped you?">
                    <UserSearchInput debounceMs={DEBOUNCE} onSelect={onSelect} />
                </Modal>
            );

            await user.type(screen.getByRole('combobox'), 'al');
            await waitFor(() => expect(screen.getAllByRole('option')).toHaveLength(2));
            await user.keyboard('{ArrowDown}{Enter}');

            expect(onSelect).toHaveBeenCalledWith(alice);
        });
    });

    describe('value prop', () => {
        it('shows the initial value and follows later changes of the prop', () => {
            const { rerender } = render(<UserSearchInput value="x" debounceMs={DEBOUNCE} />);
            expect(input().value).toBe('x');

            rerender(<UserSearchInput value="reset" debounceMs={DEBOUNCE} />);
            expect(input().value).toBe('reset');

            rerender(<UserSearchInput value={null} debounceMs={DEBOUNCE} />);
            expect(input().value).toBe('');
        });

        it('does not revert typing when the parent keeps passing the same value', () => {
            const onChange = vi.fn();
            render(<UserSearchInput value="x" onChange={onChange} debounceMs={DEBOUNCE} />);

            type('xy');
            expect(input().value).toBe('xy');
            type('xyz');

            expect(input().value).toBe('xyz');
            expect(onChange).toHaveBeenLastCalledWith('xyz');
        });

        it('keeps working as a normally controlled input', () => {
            const Controlled = () => {
                const [text, setText] = React.useState('');
                return <UserSearchInput value={text} onChange={setText} debounceMs={DEBOUNCE} />;
            };
            render(<Controlled />);

            type('hello');

            expect(input().value).toBe('hello');
        });
    });
});
