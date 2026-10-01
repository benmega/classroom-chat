import React from 'react';
import { renderHook, act } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import useLogout, { isSigningOut } from './useLogout';
import useAuthStore from '../store/useAuthStore';
import { server } from '../test/mocks/server';

vi.mock('react-hot-toast', () => ({ default: { error: vi.fn() } }));

const wrapper = ({ children }) => (
    <MemoryRouter initialEntries={['/admin/dashboard']}>{children}</MemoryRouter>
);

const renderLogout = () => renderHook(() => ({ logout: useLogout(), location: useLocation() }), { wrapper });

describe('useLogout', () => {
    let warn;

    beforeEach(() => {
        warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        useAuthStore.setState({ user: { id: 1, role: 'admin' }, isAuthenticated: true, hamburgerProgress: 0.5 });
    });

    afterEach(() => {
        warn.mockRestore();
    });

    it('signs the user out and goes to the landing page', async () => {
        const { result } = renderLogout();

        await act(async () => {
            await result.current.logout();
        });

        expect(useAuthStore.getState().isAuthenticated).toBe(false);
        expect(useAuthStore.getState().user).toBeNull();
        expect(result.current.location.pathname).toBe('/');
    });

    it.each([
        ['the network is down', () => HttpResponse.error()],
        ['the server fails', () => new HttpResponse(null, { status: 500 })],
    ])('still leaves for the landing page when %s', async (_name, respond) => {
        server.use(http.get('*/user/logout', respond));
        const { result } = renderLogout();

        await act(async () => {
            await expect(result.current.logout()).resolves.toBeUndefined();
        });

        expect(useAuthStore.getState().isAuthenticated).toBe(false);
        expect(result.current.location.pathname).toBe('/');
    });

    it('marks the sign-out as deliberate only while it is running', async () => {
        let release;
        const gate = new Promise((resolve) => { release = resolve; });
        server.use(http.get('*/user/logout', async () => {
            await gate;
            return HttpResponse.json({ success: true });
        }));
        const { result } = renderLogout();
        expect(isSigningOut()).toBe(false);

        let pending;
        act(() => { pending = result.current.logout(); });
        expect(isSigningOut()).toBe(true);

        release();
        await act(async () => { await pending; });
        expect(isSigningOut()).toBe(false);
    });

    it('stops marking the sign-out as deliberate when the request fails', async () => {
        server.use(http.get('*/user/logout', () => HttpResponse.error()));
        const { result } = renderLogout();

        await act(async () => {
            await result.current.logout();
        });

        expect(isSigningOut()).toBe(false);
    });
});
