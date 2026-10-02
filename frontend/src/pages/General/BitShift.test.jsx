import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import BitShift from './BitShift';
import client from '../../api/client';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/useAuthStore';
import confetti from 'canvas-confetti';

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

    describe('keyboard and screen reader access', () => {
        it('exposes the bit/Byte switch as a named control that Tab reaches and Space flips', async () => {
            const user = userEvent.setup();
            render(<BitShift />);
            const toggle = screen.getByRole('switch', { name: 'Byte mode' });
            const byteRow = document.querySelector('.byte-row-container');

            await user.tab();
            expect(toggle).toHaveFocus();
            expect(toggle).not.toBeChecked();
            expect(byteRow).not.toHaveClass('expanded');

            await user.keyboard(' ');
            expect(toggle).toBeChecked();
            expect(byteRow).toHaveClass('expanded');

            await user.keyboard(' ');
            expect(toggle).not.toBeChecked();
            expect(byteRow).not.toHaveClass('expanded');
        });

        it('hides the switch input visually instead of taking it out of the tab order', () => {
            render(<BitShift />);
            const toggle = screen.getByRole('switch', { name: 'Byte mode' });

            // display:none (.d-none) would make the input unfocusable.
            expect(toggle).toHaveClass('sr-only');
            expect(toggle).not.toHaveClass('d-none');
            // The checked and focus styles of the slider rely on this adjacency.
            expect(toggle.nextElementSibling).toHaveClass('toggle-slider');
        });

        it('still flips the switch when the slider label is clicked', () => {
            render(<BitShift />);
            const toggle = screen.getByRole('switch', { name: 'Byte mode' });

            fireEvent.click(toggle.nextElementSibling);

            expect(toggle).toBeChecked();
        });

        it('labels the decimal ducks input and ties it to the balance', () => {
            render(<BitShift />);

            const input = screen.getByRole('spinbutton', { name: 'Ducks to trade (decimal)' });
            expect(input).toHaveAccessibleDescription('Cache: 20');
        });
    });

    describe('the binary check', () => {
        const pressed = () => [0, 1, 2, 3, 4, 5, 6].map((i) => document.getElementById(`bit_duck_${i}`).getAttribute('aria-pressed') === 'true');
        const typeDucks = (value) => fireEvent.change(document.getElementById('digital_ducks'), { target: { value } });

        it('shows nothing about the sum until the user tries to submit', () => {
            render(<BitShift />);

            typeDucks('5');
            fireEvent.click(document.getElementById('bit_duck_0'));

            expect(document.querySelector('.math-check-banner')).toBeNull();
        });

        it('shows the sum of the toggled ducks against the amount after a mismatch, without giving the answer away', () => {
            render(<BitShift />);
            typeDucks('5');
            fireEvent.click(document.getElementById('bit_duck_1'));
            fireEvent.click(document.getElementById('bit_duck_0'));

            submit();

            const banner = document.querySelector('.math-check-banner');
            expect(banner).toHaveClass('mismatch');
            expect(banner).toHaveTextContent('11');
            expect(banner).toHaveTextContent('≠');
            expect(banner).toHaveTextContent('5');
            expect(banner).toHaveTextContent('✗ Mismatch');
            expect(banner).not.toHaveTextContent('101');
        });

        it('takes the banner away again as soon as a duck or the amount is changed', () => {
            render(<BitShift />);
            typeDucks('5');
            submit();
            expect(document.querySelector('.math-check-banner')).not.toBeNull();

            fireEvent.click(document.getElementById('bit_duck_0'));
            expect(document.querySelector('.math-check-banner')).toBeNull();

            submit();
            expect(document.querySelector('.math-check-banner')).not.toBeNull();
            typeDucks('1');
            expect(document.querySelector('.math-check-banner')).toBeNull();
        });

        it('treats an emptied or non-numeric amount as zero', () => {
            render(<BitShift />);
            typeDucks('4');
            typeDucks('');

            submit();

            expect(toast.error).toHaveBeenCalledWith('Must trade at least 1 duck.');
            expect(client.post).not.toHaveBeenCalled();
        });

        it('lets the bits add up to the amount in any combination, not only a single duck', async () => {
            client.post.mockResolvedValueOnce({ data: { status: 'success' } });
            render(<BitShift />);
            typeDucks('45');
            [0, 2, 3, 5].forEach((i) => fireEvent.click(document.getElementById(`bit_duck_${i}`)));

            submit();

            await waitFor(() => expect(client.post).toHaveBeenCalledTimes(1));
            expect(client.post.mock.calls[0][1]).toEqual({
                digital_ducks: 45,
                bit_ducks: [1, 0, 1, 1, 0, 1, 0, 0],
                byte_ducks: Array(8).fill(0),
            });
        });

        it('toggles a duck off again with a second click', () => {
            render(<BitShift />);

            fireEvent.click(document.getElementById('bit_duck_3'));
            expect(pressed()[3]).toBe(true);
            fireEvent.click(document.getElementById('bit_duck_3'));

            expect(pressed()[3]).toBe(false);
        });
    });

    describe('after a successful trade', () => {
        it('clears the amount and every duck, and celebrates', async () => {
            client.post.mockResolvedValueOnce({ data: { status: 'success' } });
            render(<BitShift />);
            prepareValidTrade();

            submit();

            await waitFor(() => expect(mockCheckAuth).toHaveBeenCalledTimes(1));
            expect(confetti).toHaveBeenCalledTimes(1);
            // The form empties in the render that follows
            await waitFor(() => expect(document.getElementById('digital_ducks')).toHaveValue(0));
            [0, 1, 2, 3, 4, 5, 6].forEach((i) => {
                expect(document.getElementById(`bit_duck_${i}`)).toHaveAttribute('aria-pressed', 'false');
            });
            expect(document.querySelector('.math-check-banner')).toBeNull();
            expect(toast.error).not.toHaveBeenCalled();
        });

        it('announces every new achievement, not just the first', async () => {
            client.post.mockResolvedValueOnce({ data: { status: 'success', new_awards: [{ name: 'One' }, { name: 'Two' }] } });
            render(<BitShift />);
            prepareValidTrade();

            submit();

            await waitFor(() => expect(toast.success).toHaveBeenCalledTimes(2));
            expect(toast.success).toHaveBeenCalledWith('Achievement Unlocked: One!', expect.any(Object));
            expect(toast.success).toHaveBeenCalledWith('Achievement Unlocked: Two!', expect.any(Object));
        });

        it('keeps the form as it was when the trade is turned down, so the user can adjust it', async () => {
            client.post.mockResolvedValueOnce({ data: { status: 'error', message: 'Not enough ducks.' } });
            render(<BitShift />);
            prepareValidTrade();

            submit();

            await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Not enough ducks.'));
            expect(confetti).not.toHaveBeenCalled();
            expect(document.getElementById('digital_ducks')).toHaveValue(1);
            expect(document.getElementById('bit_duck_0')).toHaveAttribute('aria-pressed', 'true');
        });

        it('says it is working and blocks a second submit while the request runs', async () => {
            let finish;
            client.post.mockReturnValueOnce(new Promise((resolve) => { finish = resolve; }));
            render(<BitShift />);
            prepareValidTrade();

            submit();

            const button = await screen.findByRole('button', { name: 'Processing...' });
            expect(button).toBeDisabled();
            finish({ data: { status: 'success' } });
            await waitFor(() => expect(screen.getByRole('button', { name: /Submit Exchange/i })).toBeEnabled());
        });
    });

    describe('Byte mode', () => {
        const switchToBytes = () => fireEvent.click(screen.getByRole('switch', { name: 'Byte mode' }));

        it('adds the byte ducks, worth 128 each, to the total and sends them', async () => {
            client.post.mockResolvedValueOnce({ data: { status: 'success' } });
            render(<BitShift />);
            switchToBytes();
            fireEvent.change(document.getElementById('digital_ducks'), { target: { value: '131' } });
            fireEvent.click(document.getElementById('byte_duck_0'));
            fireEvent.click(document.getElementById('bit_duck_0'));
            fireEvent.click(document.getElementById('bit_duck_1'));

            submit();

            await waitFor(() => expect(client.post).toHaveBeenCalledTimes(1));
            expect(client.post.mock.calls[0][1]).toEqual({
                digital_ducks: 131,
                bit_ducks: [1, 1, 0, 0, 0, 0, 0, 0],
                byte_ducks: [1, 0, 0, 0, 0, 0, 0, 0],
            });
        });

        it('forgets the byte ducks when the mode is switched off, so they cannot count unseen', async () => {
            render(<BitShift />);
            switchToBytes();
            fireEvent.click(document.getElementById('byte_duck_1'));
            expect(document.getElementById('byte_duck_1')).toHaveAttribute('aria-pressed', 'true');

            switchToBytes();
            switchToBytes();

            expect(document.getElementById('byte_duck_1')).toHaveAttribute('aria-pressed', 'false');
        });

        it('does not count byte ducks toward the total while the mode is off', () => {
            render(<BitShift />);

            // 128 can only be made with a byte duck, which is not available in bit mode
            fireEvent.change(document.getElementById('digital_ducks'), { target: { value: '128' } });
            submit();

            expect(toast.error).toHaveBeenCalledWith('Binary total does not match the decimal amount entered (128).');
            expect(client.post).not.toHaveBeenCalled();
        });
    });

    describe('the Auto Calculate perk', () => {
        const pressedBits = () => [0, 1, 2, 3, 4, 5, 6].filter((i) => document.getElementById(`bit_duck_${i}`).getAttribute('aria-pressed') === 'true');
        const pressedBytes = () => [0, 1, 2, 3, 4].filter((i) => document.getElementById(`byte_duck_${i}`).getAttribute('aria-pressed') === 'true');
        const autoCalculate = () => fireEvent.click(screen.getByRole('button', { name: /Auto Calculate/i }));

        it('is offered only to a user who has it', () => {
            const { unmount } = render(<BitShift />);
            expect(screen.queryByRole('button', { name: /Auto Calculate/i })).not.toBeInTheDocument();
            unmount();

            useAuthStore.setState({ user: { id: 1, username: 'kid', duck_balance: 20, has_auto_bitshift: true } });
            render(<BitShift />);
            expect(screen.getByRole('button', { name: /Auto Calculate/i })).toBeInTheDocument();
        });

        describe('for a user who has it', () => {
            beforeEach(() => {
                useAuthStore.setState({ user: { id: 1, username: 'kid', duck_balance: 500, has_auto_bitshift: true } });
            });

            it('toggles the bit ducks that make up the amount', () => {
                render(<BitShift />);
                fireEvent.change(document.getElementById('digital_ducks'), { target: { value: '45' } });

                autoCalculate();

                expect(pressedBits()).toEqual([0, 2, 3, 5]);
            });

            it('replaces ducks that were toggled before', () => {
                render(<BitShift />);
                fireEvent.click(document.getElementById('bit_duck_6'));
                fireEvent.change(document.getElementById('digital_ducks'), { target: { value: '1' } });

                autoCalculate();

                expect(pressedBits()).toEqual([0]);
            });

            it('submits what it filled in', async () => {
                client.post.mockResolvedValueOnce({ data: { status: 'success' } });
                render(<BitShift />);
                fireEvent.change(document.getElementById('digital_ducks'), { target: { value: '100' } });
                autoCalculate();

                submit();

                await waitFor(() => expect(client.post).toHaveBeenCalledTimes(1));
                expect(client.post.mock.calls[0][1].bit_ducks).toEqual([0, 0, 1, 0, 0, 1, 1, 0]);
            });

            it('asks for an amount first', () => {
                render(<BitShift />);

                autoCalculate();

                expect(toast.error).toHaveBeenCalledWith('Enter a duck amount first.');
                expect(pressedBits()).toEqual([]);
            });

            it('refuses an amount that does not fit in bits', () => {
                render(<BitShift />);
                fireEvent.change(document.getElementById('digital_ducks'), { target: { value: '128' } });

                autoCalculate();

                expect(toast.error).toHaveBeenCalledWith('Maximum value for current mode is 127.');
                expect(pressedBits()).toEqual([]);
            });

            it('uses the byte ducks too in Byte mode', () => {
                render(<BitShift />);
                fireEvent.click(screen.getByRole('switch', { name: 'Byte mode' }));
                fireEvent.change(document.getElementById('digital_ducks'), { target: { value: '300' } });

                autoCalculate();

                // 300 = 2 x 128 + 44
                expect(pressedBytes()).toEqual([1]);
                expect(pressedBits()).toEqual([2, 3, 5]);
            });

            it('refuses an amount beyond the largest Byte mode value', () => {
                render(<BitShift />);
                fireEvent.click(screen.getByRole('switch', { name: 'Byte mode' }));
                fireEvent.change(document.getElementById('digital_ducks'), { target: { value: '4096' } });

                autoCalculate();

                expect(toast.error).toHaveBeenCalledWith('Maximum value for current mode is 4095.');
            });
        });
    });

});
