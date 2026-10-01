import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import BitShift from './BitShift';
import client from '../../api/client';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/useAuthStore';

vi.mock('../../api/client', () => ({
    default: { post: vi.fn() },
}));

vi.mock('react-hot-toast', () => ({
    default: { success: vi.fn(), error: vi.fn() },
}));

const mockCheckAuth = vi.fn();

// Trade a single duck: 1 decimal = bit 0 on.
const prepareValidTrade = () => {
    fireEvent.change(document.getElementById('digital_ducks'), { target: { value: '1' } });
    fireEvent.click(document.getElementById('bit_duck_0'));
};
const submit = () => fireEvent.submit(document.querySelector('form.trade-form'));

describe('BitShift', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useAuthStore.setState({ user: { id: 1, username: 'kid', duck_balance: 20 }, checkAuth: mockCheckAuth });
    });

    it('rejects a trade of zero ducks without calling the server', () => {
        render(<BitShift />);

        submit();

        expect(toast.error).toHaveBeenCalledWith('Must trade at least 1 duck.');
        expect(client.post).not.toHaveBeenCalled();
    });

    it('rejects a binary total that does not match the decimal amount', () => {
        render(<BitShift />);
        fireEvent.change(document.getElementById('digital_ducks'), { target: { value: '3' } });
        fireEvent.click(document.getElementById('bit_duck_0'));

        submit();

        expect(toast.error).toHaveBeenCalledWith('Binary total does not match the decimal amount entered (3).');
        expect(client.post).not.toHaveBeenCalled();
    });

    it('submits a matching trade, refreshes the balance and announces new achievements', async () => {
        client.post.mockResolvedValueOnce({ data: { status: 'success', new_awards: [{ name: 'Binary Brain' }] } });
        render(<BitShift />);
        prepareValidTrade();

        submit();

        await waitFor(() => expect(mockCheckAuth).toHaveBeenCalled());
        expect(client.post).toHaveBeenCalledWith(
            '/duck_trade/submit_trade',
            { digital_ducks: 1, bit_ducks: [1, 0, 0, 0, 0, 0, 0, 0], byte_ducks: Array(8).fill(0) },
            expect.any(Object)
        );
        expect(toast.success).toHaveBeenCalledWith('Achievement Unlocked: Binary Brain!', expect.any(Object));
    });

    it('shows the message of a trade the server turns down in the response body', async () => {
        client.post.mockResolvedValueOnce({ data: { status: 'error', message: 'You already have a pending trade.' } });
        render(<BitShift />);
        prepareValidTrade();

        submit();

        await waitFor(() => expect(toast.error).toHaveBeenCalledWith('You already have a pending trade.'));
        expect(mockCheckAuth).not.toHaveBeenCalled();
    });

    it('falls back to a generic message when the turned-down trade carries no text', async () => {
        client.post.mockResolvedValueOnce({ data: { status: 'error' } });
        render(<BitShift />);
        prepareValidTrade();

        submit();

        await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Trade failed.'));
    });

    it('shows the message of a failed trade request', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        client.post.mockRejectedValueOnce({ response: { data: { status: 'error', message: 'You must be logged in.' } } });
        render(<BitShift />);
        prepareValidTrade();

        submit();

        await waitFor(() => expect(toast.error).toHaveBeenCalledWith('You must be logged in.'));
    });

    it('also understands an error field and a plain failure', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        client.post.mockRejectedValueOnce({ response: { data: { error: 'Trading is closed.' } } });
        client.post.mockRejectedValueOnce(new Error('Network Error'));
        render(<BitShift />);
        prepareValidTrade();

        submit();
        await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Trading is closed.'));

        submit();
        await waitFor(() => expect(toast.error).toHaveBeenCalledWith('An unexpected error occurred.'));
    });
});
