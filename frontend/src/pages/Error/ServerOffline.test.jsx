import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ServerOffline from './ServerOffline';
import useAuthStore from '../../store/useAuthStore';

const DEFAULT_URL = 'https://e5fsaweh7l.execute-api.ap-southeast-1.amazonaws.com/server-start';
const TOTAL_MS = 300 * 1000;

const wakeButton = () => screen.getByRole('button', { name: /Wake Up the Classroom Chat/i });
const advance = (ms) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });
const clickWake = async () => {
    await act(async () => { fireEvent.click(wakeButton()); });
};

describe('ServerOffline', () => {
    let fetchMock;
    let checkAuth;
    let reload;
    let originalLocation;

    beforeEach(() => {
        vi.useFakeTimers();
        fetchMock = vi.fn().mockResolvedValue({ ok: true });
        vi.stubGlobal('fetch', fetchMock);
        // The server stays down unless a test says otherwise.
        checkAuth = vi.fn().mockResolvedValue();
        useAuthStore.setState({ isServerOffline: true, checkAuth });

        reload = vi.fn();
        originalLocation = window.location;
        delete window.location;
        window.location = { ...originalLocation, reload };
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        window.location = originalLocation;
        vi.unstubAllGlobals();
        vi.unstubAllEnvs();
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    it('shows the sleeping screen with a wake-up button', () => {
        render(<ServerOffline />);

        expect(screen.getByText('Classroom Chat is Sleeping')).toBeInTheDocument();
        expect(wakeButton()).toBeInTheDocument();
        expect(fetchMock).not.toHaveBeenCalled();
    });

    describe('waking the server', () => {
        it('posts to the default wake-up endpoint and shows the countdown', async () => {
            render(<ServerOffline />);

            await clickWake();

            expect(fetchMock).toHaveBeenCalledTimes(1);
            const [url, options] = fetchMock.mock.calls[0];
            expect(url).toBe(DEFAULT_URL);
            expect(options).toMatchObject({ method: 'POST', mode: 'cors' });
            expect(options.signal).toBeInstanceOf(AbortSignal);
            expect(screen.getByText('Starting up...')).toBeInTheDocument();
            expect(screen.getByText('5:00')).toBeInTheDocument();
        });

        it('uses VITE_WAKEUP_API_URL when it is set', async () => {
            vi.stubEnv('VITE_WAKEUP_API_URL', 'https://wake.example.test/start');
            render(<ServerOffline />);

            await clickWake();

            expect(fetchMock.mock.calls[0][0]).toBe('https://wake.example.test/start');
        });

        it('falls back to the default endpoint when the variable is empty', async () => {
            vi.stubEnv('VITE_WAKEUP_API_URL', '');
            render(<ServerOffline />);

            await clickWake();

            expect(fetchMock.mock.calls[0][0]).toBe(DEFAULT_URL);
        });

        it('counts down and rotates the fun messages', async () => {
            render(<ServerOffline />);
            await clickWake();
            expect(screen.getByText('🔌 Plugging in...')).toBeInTheDocument();

            await advance(60 * 1000);

            expect(screen.getByText('4:00')).toBeInTheDocument();
            expect(screen.queryByText('🔌 Plugging in...')).not.toBeInTheDocument();
        });

        it('polls the backend every 8 seconds', async () => {
            render(<ServerOffline />);
            await clickWake();

            await advance(7900);
            expect(checkAuth).not.toHaveBeenCalled();
            await advance(100);
            expect(checkAuth).toHaveBeenCalledTimes(1);
            await advance(8000);
            expect(checkAuth).toHaveBeenCalledTimes(2);
        });

        it('keeps polling after a failed check', async () => {
            checkAuth.mockRejectedValue(new Error('down'));
            render(<ServerOffline />);
            await clickWake();

            await advance(16000);

            expect(checkAuth).toHaveBeenCalledTimes(2);
            expect(screen.getByText('Starting up...')).toBeInTheDocument();
        });
    });

    describe('when the wake-up request fails', () => {
        it('shows an error for a non-OK response', async () => {
            fetchMock.mockResolvedValue({ ok: false });
            render(<ServerOffline />);

            await clickWake();

            expect(screen.getByText('Error waking server. Try again soon.')).toBeInTheDocument();
            expect(wakeButton()).toBeInTheDocument();
        });

        it('shows an error when the request rejects', async () => {
            fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
            render(<ServerOffline />);

            await clickWake();

            expect(screen.getByText('Error waking server. Try again soon.')).toBeInTheDocument();
        });

        it('gives up on a hung request after 10 seconds and shows the error', async () => {
            fetchMock.mockImplementation((url, { signal }) => new Promise((resolve, reject) => {
                signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
            }));
            render(<ServerOffline />);

            await clickWake();
            expect(screen.getByText('Starting up...')).toBeInTheDocument();
            await advance(9900);
            expect(screen.getByText('Starting up...')).toBeInTheDocument();
            await advance(200);

            expect(screen.getByText('Error waking server. Try again soon.')).toBeInTheDocument();
            expect(screen.queryByText('Starting up...')).not.toBeInTheDocument();
            expect(wakeButton()).toBeInTheDocument();
        });

        it('does not abort a request that completed in time', async () => {
            render(<ServerOffline />);
            await clickWake();
            const { signal } = fetchMock.mock.calls[0][1];

            await advance(20 * 1000);

            expect(signal.aborted).toBe(false);
            expect(screen.getByText('Starting up...')).toBeInTheDocument();
        });
    });

    describe('when the countdown reaches 100%', () => {
        it('checks the server once more instead of reloading the page', async () => {
            render(<ServerOffline />);
            await clickWake();
            checkAuth.mockClear();

            await advance(TOTAL_MS + 200);

            expect(reload).not.toHaveBeenCalled();
            // The 8 s poll still ran along the way; the final check is one more call after it.
            expect(checkAuth).toHaveBeenCalled();
        });

        it('returns to the idle screen with a hint when the server is still down', async () => {
            render(<ServerOffline />);
            await clickWake();

            await advance(TOTAL_MS + 200);

            expect(reload).not.toHaveBeenCalled();
            expect(screen.getByText('Still starting up - try again in a minute')).toBeInTheDocument();
            expect(screen.getByText('Classroom Chat is Sleeping')).toBeInTheDocument();
            expect(wakeButton()).toBeInTheDocument();
        });

        it('stops all timers once it is back at the idle screen', async () => {
            render(<ServerOffline />);
            await clickWake();
            await advance(TOTAL_MS + 200);
            checkAuth.mockClear();

            await advance(60 * 1000);

            expect(checkAuth).not.toHaveBeenCalled();
            expect(vi.getTimerCount()).toBe(0);
        });

        it('lets the user start over with a fresh countdown', async () => {
            render(<ServerOffline />);
            await clickWake();
            await advance(TOTAL_MS + 200);

            await clickWake();

            expect(fetchMock).toHaveBeenCalledTimes(2);
            expect(screen.getByText('5:00')).toBeInTheDocument();
            expect(screen.queryByText('Still starting up - try again in a minute')).not.toBeInTheDocument();
        });

        it('leaves the page to the app when the server has come up', async () => {
            render(<ServerOffline />);
            await clickWake();
            // The final check succeeds: the store clears the offline flag, and App unmounts this page.
            checkAuth.mockImplementation(async () => useAuthStore.setState({ isServerOffline: false }));

            await advance(TOTAL_MS + 200);

            expect(reload).not.toHaveBeenCalled();
            expect(screen.queryByText('Still starting up - try again in a minute')).not.toBeInTheDocument();
            expect(screen.getByText('Starting up...')).toBeInTheDocument();
        });

        it('treats a failing final check as the server still being down', async () => {
            render(<ServerOffline />);
            await clickWake();
            checkAuth.mockRejectedValue(new Error('still down'));

            await advance(TOTAL_MS + 200);

            expect(screen.getByText('Still starting up - try again in a minute')).toBeInTheDocument();
        });
    });

    describe('unmounting', () => {
        it('clears the countdown, message and poll timers', async () => {
            const { unmount } = render(<ServerOffline />);
            await clickWake();
            expect(vi.getTimerCount()).toBeGreaterThan(0);

            unmount();

            expect(vi.getTimerCount()).toBe(0);
        });

        it('aborts a wake-up request that is still in flight, without reporting an error', async () => {
            let signal;
            fetchMock.mockImplementation((url, options) => new Promise((resolve, reject) => {
                signal = options.signal;
                signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
            }));
            const { unmount } = render(<ServerOffline />);
            await clickWake();

            unmount();
            await advance(0);

            expect(signal.aborted).toBe(true);
            expect(console.error).not.toHaveBeenCalled();
            expect(vi.getTimerCount()).toBe(0);
        });
    });
});
