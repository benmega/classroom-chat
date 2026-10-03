import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAdminUserActions, validateUsername, validateAmount, validatePasswordPair } from './useAdminUserActions';
import client from '../api/client';
import toast from 'react-hot-toast';
import { showConfirm } from '../utils/confirm';

vi.mock('../api/client', () => ({
    default: {
        post: vi.fn(),
    },
}));

vi.mock('react-hot-toast', () => ({
    default: {
        success: vi.fn(),
        error: vi.fn(),
    },
}));

vi.mock('../utils/confirm', () => ({
    showConfirm: vi.fn(),
}));

const formWith = (fields) => {
    const formData = new FormData();
    Object.entries(fields).forEach(([key, value]) => formData.append(key, value));
    return formData;
};

const rejection = (data, status = 400) => ({ response: { status, data } });

describe('validators', () => {
    it('validateUsername mirrors the server rules (strip, lower-case, 3-30 of [a-z0-9_])', () => {
        expect(validateUsername('')).toBe('Username is required');
        expect(validateUsername('   ')).toBe('Username is required');
        expect(validateUsername(null)).toBe('Username is required');
        expect(validateUsername(undefined)).toBe('Username is required');

        const format = '3-30 chars, lowercase, numbers, or underscores.';
        expect(validateUsername('ab')).toBe(format);
        expect(validateUsername('a'.repeat(31))).toBe(format);
        expect(validateUsername('has space')).toBe(format);
        expect(validateUsername('dash-ed')).toBe(format);
        expect(validateUsername('dot.ted')).toBe(format);

        expect(validateUsername('abc')).toBe('');
        expect(validateUsername('a'.repeat(30))).toBe('');
        expect(validateUsername('kid_01')).toBe('');
        // The server lower-cases and trims before matching, so these are accepted too.
        expect(validateUsername('  Kid_01 ')).toBe('');
        expect(validateUsername('ALLCAPS')).toBe('');
    });

    it('validateAmount only requires a value', () => {
        expect(validateAmount('')).toBe('Adjustment amount is required');
        expect(validateAmount('   ')).toBe('Adjustment amount is required');
        expect(validateAmount(null)).toBe('Adjustment amount is required');
        expect(validateAmount(undefined)).toBe('Adjustment amount is required');
        expect(validateAmount('0')).toBe('');
        expect(validateAmount('-5')).toBe('');
        expect(validateAmount('2.5')).toBe('');
        expect(validateAmount(10)).toBe('');
    });

    it('validatePasswordPair requires both fields and a match, with no minimum length', () => {
        expect(validatePasswordPair('', '')).toEqual({
            new_password: 'New password is required',
            confirm_password: 'Confirmation is required',
        });
        expect(validatePasswordPair('secret', '')).toEqual({ confirm_password: 'Confirmation is required' });
        expect(validatePasswordPair('', 'secret')).toEqual({ new_password: 'New password is required' });
        expect(validatePasswordPair('one', 'two')).toEqual({ confirm_password: 'Passwords do not match' });
        expect(validatePasswordPair('same', 'same')).toEqual({});
        // A single character is fine: the minimum length is an open decision.
        expect(validatePasswordPair('x', 'x')).toEqual({});
    });
});

describe('useAdminUserActions', () => {
    let setFormLoading;
    let setFormErrors;
    let onSuccess;

    const setup = (options = {}) => renderHook(() => useAdminUserActions({ setFormLoading, setFormErrors, ...options })).result.current;

    beforeEach(() => {
        vi.clearAllMocks();
        client.post.mockReset();
        setFormLoading = vi.fn();
        setFormErrors = vi.fn();
        onSuccess = vi.fn();
        showConfirm.mockResolvedValue(true);
    });

    describe('createUser', () => {
        it('trims the fields, posts the form and reports success', async () => {
            client.post.mockResolvedValueOnce({ data: { success: true } });
            const actions = setup();
            const formData = formWith({ username: '  newkid ', password: ' pw ', ducks: '5' });

            let ok;
            await act(async () => { ok = await actions.createUser(formData, onSuccess); });

            expect(ok).toBe(true);
            expect(client.post).toHaveBeenCalledWith('/api/admin/create_user', formData);
            expect(formData.get('username')).toBe('newkid');
            expect(formData.get('password')).toBe('pw');
            expect(formData.get('ducks')).toBe('5');
            expect(onSuccess).toHaveBeenCalledTimes(1);
            expect(setFormErrors).toHaveBeenCalledWith({});
            expect(setFormLoading.mock.calls).toEqual([[true], [false]]);
        });

        it('accepts a one character password', async () => {
            client.post.mockResolvedValueOnce({ data: { success: true } });
            const actions = setup();

            await act(async () => { await actions.createUser(formWith({ username: 'newkid', password: 'x' }), onSuccess); });

            expect(client.post).toHaveBeenCalledTimes(1);
            expect(onSuccess).toHaveBeenCalled();
        });

        it('reports an empty form as inline errors without calling the server', async () => {
            const actions = setup();

            let ok;
            await act(async () => { ok = await actions.createUser(formWith({ username: '  ', password: ' ' }), onSuccess); });

            expect(ok).toBe(false);
            expect(setFormErrors).toHaveBeenCalledWith({
                username: 'Username is required',
                password: 'Initial password is required',
            });
            expect(client.post).not.toHaveBeenCalled();
            expect(onSuccess).not.toHaveBeenCalled();
            expect(setFormLoading).not.toHaveBeenCalled();
        });

        it.each(['ab', 'a'.repeat(31), 'has space', 'bad-name', 'Ünicode'])(
            'rejects the malformed username %j before the server sees it',
            async (username) => {
                const actions = setup();

                await act(async () => { await actions.createUser(formWith({ username, password: 'pw' }), onSuccess); });

                expect(setFormErrors).toHaveBeenCalledWith({ username: '3-30 chars, lowercase, numbers, or underscores.' });
                expect(client.post).not.toHaveBeenCalled();
            }
        );

        it('lets the server have the final word on a lower-cased username', async () => {
            client.post.mockResolvedValueOnce({ data: { success: true } });
            const actions = setup();

            await act(async () => { await actions.createUser(formWith({ username: 'MixedCase', password: 'pw' }), onSuccess); });

            expect(client.post).toHaveBeenCalledTimes(1);
        });

        it('shows the reason the server gives and releases the form', async () => {
            client.post.mockRejectedValueOnce(rejection({ success: false, message: 'Username already exists' }, 409));
            const actions = setup();

            let ok;
            await act(async () => { ok = await actions.createUser(formWith({ username: 'taken', password: 'pw' }), onSuccess); });

            expect(ok).toBe(false);
            expect(toast.error).toHaveBeenCalledWith('Username already exists');
            expect(onSuccess).not.toHaveBeenCalled();
            expect(setFormLoading.mock.calls).toEqual([[true], [false]]);
        });

        it('falls back to a generic message when the failure has no body', async () => {
            client.post.mockRejectedValueOnce(new Error('Network Error'));
            const actions = setup();

            await act(async () => { await actions.createUser(formWith({ username: 'newkid', password: 'pw' }), onSuccess); });

            expect(toast.error).toHaveBeenCalledWith('Failed to create user.');
        });

        it('does not call onSuccess for a response that is not a success', async () => {
            client.post.mockResolvedValueOnce({ data: { success: false } });
            const actions = setup();

            let ok;
            await act(async () => { ok = await actions.createUser(formWith({ username: 'newkid', password: 'pw' }), onSuccess); });

            expect(ok).toBe(false);
            expect(onSuccess).not.toHaveBeenCalled();
            expect(setFormLoading.mock.calls).toEqual([[true], [false]]);
        });

        it('works without an onSuccess callback', async () => {
            client.post.mockResolvedValueOnce({ data: { success: true } });
            const actions = setup();

            let ok;
            await act(async () => { ok = await actions.createUser(formWith({ username: 'newkid', password: 'pw' })); });

            expect(ok).toBe(true);
        });

        it("shows the server's message for a response that is not a success, else the fallback", async () => {
            client.post.mockResolvedValueOnce({ data: { success: false, message: 'Username already exists' } });
            client.post.mockResolvedValueOnce({ data: { success: false } });
            const actions = setup();
            const create = () => actions.createUser(formWith({ username: 'newkid', password: 'pw' }), onSuccess);

            await act(async () => { await create(); });
            expect(toast.error).toHaveBeenLastCalledWith('Username already exists');

            await act(async () => { await create(); });
            expect(toast.error).toHaveBeenLastCalledWith('Failed to create user.');
            expect(onSuccess).not.toHaveBeenCalled();
        });
    });

    describe.each([
        ['adjustDucks', '/api/admin/adjust_ducks', 'Failed to adjust ducks.'],
        ['adjustPackets', '/api/admin/adjust_packets', 'Failed to adjust packets.'],
    ])('%s', (name, endpoint, fallback) => {
        it('posts the form and reports success', async () => {
            client.post.mockResolvedValueOnce({ data: { success: true } });
            const actions = setup();
            const formData = formWith({ username: 'kid', amount: '-3' });

            let ok;
            await act(async () => { ok = await actions[name](formData, onSuccess); });

            expect(ok).toBe(true);
            expect(client.post).toHaveBeenCalledWith(endpoint, formData);
            expect(onSuccess).toHaveBeenCalledTimes(1);
            expect(setFormErrors).toHaveBeenCalledWith({});
        });

        it('requires an amount', async () => {
            const actions = setup();

            let ok;
            await act(async () => { ok = await actions[name](formWith({ username: 'kid', amount: '' }), onSuccess); });

            expect(ok).toBe(false);
            expect(setFormErrors).toHaveBeenCalledWith({ amount: 'Adjustment amount is required' });
            expect(client.post).not.toHaveBeenCalled();
        });

        it('shows the message the server sends', async () => {
            client.post.mockRejectedValueOnce(rejection({ success: false, message: "User 'kid' not found." }, 404));
            const actions = setup();

            await act(async () => { await actions[name](formWith({ username: 'kid', amount: '1' }), onSuccess); });

            expect(toast.error).toHaveBeenCalledWith("User 'kid' not found.");
            expect(onSuccess).not.toHaveBeenCalled();
        });

        it('shows the error field of an enveloped failure', async () => {
            client.post.mockRejectedValueOnce(rejection({ status: 'error', data: null, error: 'Admin access required' }, 403));
            const actions = setup();

            await act(async () => { await actions[name](formWith({ username: 'kid', amount: '1' }), onSuccess); });

            expect(toast.error).toHaveBeenCalledWith('Admin access required');
        });

        it('falls back to a generic message', async () => {
            client.post.mockRejectedValueOnce(new Error('Network Error'));
            const actions = setup();

            await act(async () => { await actions[name](formWith({ username: 'kid', amount: '1' }), onSuccess); });

            expect(toast.error).toHaveBeenCalledWith(fallback);
        });
    });

    describe('resetPassword', () => {
        it('posts a JSON body without the confirmation field', async () => {
            client.post.mockResolvedValueOnce({ data: { success: true } });
            const actions = setup();

            let ok;
            await act(async () => {
                ok = await actions.resetPassword({ username: 'kid', new_password: 'secret', confirm_password: 'secret' }, onSuccess);
            });

            expect(ok).toBe(true);
            expect(client.post).toHaveBeenCalledWith('/api/admin/reset_password', { username: 'kid', new_password: 'secret' });
            expect(onSuccess).toHaveBeenCalledTimes(1);
        });

        it.each([
            [{ new_password: '', confirm_password: '' }, { new_password: 'New password is required', confirm_password: 'Confirmation is required' }],
            [{ new_password: 'a', confirm_password: 'b' }, { confirm_password: 'Passwords do not match' }],
        ])('rejects %j locally', async (fields, errors) => {
            const actions = setup();

            let ok;
            await act(async () => { ok = await actions.resetPassword({ username: 'kid', ...fields }, onSuccess); });

            expect(ok).toBe(false);
            expect(setFormErrors).toHaveBeenCalledWith(errors);
            expect(client.post).not.toHaveBeenCalled();
        });

        it('shows the server reason', async () => {
            client.post.mockRejectedValueOnce(rejection({ success: false, message: 'Cannot reset password of another admin' }, 403));
            const actions = setup();

            await act(async () => {
                await actions.resetPassword({ username: 'boss', new_password: 'x', confirm_password: 'x' }, onSuccess);
            });

            expect(toast.error).toHaveBeenCalledWith('Cannot reset password of another admin');
        });

        it('falls back to a generic message', async () => {
            client.post.mockRejectedValueOnce(new Error('Network Error'));
            const actions = setup();

            await act(async () => {
                await actions.resetPassword({ username: 'kid', new_password: 'x', confirm_password: 'x' }, onSuccess);
            });

            expect(toast.error).toHaveBeenCalledWith('Failed to reset password.');
        });
    });

    describe('removeUser', () => {
        it('asks first, then posts the username and reports success', async () => {
            client.post.mockResolvedValueOnce({ data: { success: true } });
            const actions = setup();

            let ok;
            await act(async () => { ok = await actions.removeUser('kid', onSuccess); });

            expect(ok).toBe(true);
            expect(showConfirm).toHaveBeenCalledWith(
                'Are you sure you want to PERMANENTLY remove @kid? This cannot be undone.',
                { title: 'Remove User', confirmText: 'Remove', destructive: true }
            );
            const [url, body] = client.post.mock.calls[0];
            expect(url).toBe('/api/admin/remove_user');
            expect(body.get('username')).toBe('kid');
            expect(onSuccess).toHaveBeenCalledTimes(1);
        });

        it('does nothing when the confirmation is cancelled', async () => {
            showConfirm.mockResolvedValue(false);
            const actions = setup();

            let ok;
            await act(async () => { ok = await actions.removeUser('kid', onSuccess); });

            expect(ok).toBe(false);
            expect(client.post).not.toHaveBeenCalled();
            expect(onSuccess).not.toHaveBeenCalled();
            expect(toast.error).not.toHaveBeenCalled();
        });

        it('shows the reason the server gives', async () => {
            client.post.mockRejectedValueOnce(rejection({ success: false, message: 'Cannot remove another admin' }, 403));
            const actions = setup();

            let ok;
            await act(async () => { ok = await actions.removeUser('boss', onSuccess); });

            expect(ok).toBe(false);
            expect(toast.error).toHaveBeenCalledWith('Cannot remove another admin');
            expect(onSuccess).not.toHaveBeenCalled();
        });

        it('falls back to a generic message', async () => {
            client.post.mockRejectedValueOnce(new Error('Network Error'));
            const actions = setup();

            await act(async () => { await actions.removeUser('kid', onSuccess); });

            expect(toast.error).toHaveBeenCalledWith('Failed to remove user.');
        });

        it('does not call onSuccess for a response that is not a success', async () => {
            client.post.mockResolvedValueOnce({ data: {} });
            const actions = setup();

            let ok;
            await act(async () => { ok = await actions.removeUser('kid', onSuccess); });

            expect(ok).toBe(false);
            expect(onSuccess).not.toHaveBeenCalled();
        });

        it('works without an onSuccess callback', async () => {
            client.post.mockResolvedValueOnce({ data: { success: true } });
            const actions = setup();

            let ok;
            await act(async () => { ok = await actions.removeUser('kid'); });

            expect(ok).toBe(true);
        });
    });

    describe('without page state setters', () => {
        it('toasts the first validation error when there is no inline error state', async () => {
            const actions = renderHook(() => useAdminUserActions()).result.current;

            await act(async () => {
                await actions.resetPassword({ username: 'kid', new_password: 'a', confirm_password: 'b' });
            });
            expect(toast.error).toHaveBeenCalledWith('Passwords do not match');

            await act(async () => { await actions.adjustDucks(formWith({ amount: '' })); });
            expect(toast.error).toHaveBeenCalledWith('Adjustment amount is required');
            expect(client.post).not.toHaveBeenCalled();
        });

        it('still posts and succeeds with no setters at all', async () => {
            client.post.mockResolvedValueOnce({ data: { success: true } });
            const actions = renderHook(() => useAdminUserActions()).result.current;

            let ok;
            await act(async () => { ok = await actions.adjustPackets(formWith({ username: 'kid', amount: '2' }), onSuccess); });

            expect(ok).toBe(true);
            expect(onSuccess).toHaveBeenCalled();
        });
    });
});
