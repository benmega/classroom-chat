import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getApiUrl, getApiBaseUrl, getAbsoluteApiBaseUrl } from './apiUrl';

describe('getApiBaseUrl', () => {
    afterEach(() => vi.unstubAllEnvs());

    it('is empty (same origin) when VITE_API_URL is unset or empty', () => {
        vi.stubEnv('VITE_API_URL', '');
        expect(getApiBaseUrl()).toBe('');
    });

    it('returns the configured URL without a trailing slash', () => {
        vi.stubEnv('VITE_API_URL', 'https://api.example.com');
        expect(getApiBaseUrl()).toBe('https://api.example.com');
        vi.stubEnv('VITE_API_URL', 'https://api.example.com/');
        expect(getApiBaseUrl()).toBe('https://api.example.com');
    });
});

describe('missing VITE_API_URL warning', () => {
    // The warning is printed when the module loads, so each case loads a fresh copy
    const loadFresh = async () => {
        vi.resetModules();
        return import('./apiUrl');
    };
    let warn;

    beforeEach(() => {
        warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    });
    afterEach(() => {
        vi.unstubAllEnvs();
        warn.mockRestore();
    });

    it('warns once, naming the variable and the origin used, when a production build lacks it', async () => {
        vi.stubEnv('PROD', true);
        vi.stubEnv('VITE_API_URL', '');

        const { getApiBaseUrl: fresh } = await loadFresh();
        fresh();
        fresh();

        expect(warn).toHaveBeenCalledTimes(1);
        expect(warn.mock.calls[0][0]).toContain('VITE_API_URL');
        expect(warn.mock.calls[0][0]).toContain(window.location.origin);
    });

    it('still uses the page origin rather than failing', async () => {
        vi.stubEnv('PROD', true);
        vi.stubEnv('VITE_API_URL', '');

        const { getApiBaseUrl: fresh, getApiUrl: freshUrl } = await loadFresh();

        expect(fresh()).toBe('');
        expect(freshUrl('/api/me')).toBe('/api/me');
    });

    it('is silent when a production build has VITE_API_URL', async () => {
        vi.stubEnv('PROD', true);
        vi.stubEnv('VITE_API_URL', 'https://api.example.com');

        await loadFresh();

        expect(warn).not.toHaveBeenCalled();
    });

    it('is silent outside production builds, where the dev proxy makes same origin the norm', async () => {
        vi.stubEnv('PROD', false);
        vi.stubEnv('VITE_API_URL', '');

        await loadFresh();

        expect(warn).not.toHaveBeenCalled();
    });
});

describe('getAbsoluteApiBaseUrl', () => {
    afterEach(() => vi.unstubAllEnvs());

    it('falls back to the page origin when VITE_API_URL is unset', () => {
        vi.stubEnv('VITE_API_URL', '');
        expect(getAbsoluteApiBaseUrl()).toBe(window.location.origin);
    });

    it('returns an absolute VITE_API_URL as is, minus the trailing slash', () => {
        vi.stubEnv('VITE_API_URL', 'https://api.example.com/');
        expect(getAbsoluteApiBaseUrl()).toBe('https://api.example.com');
    });

    it('prefixes a relative VITE_API_URL with the page origin', () => {
        vi.stubEnv('VITE_API_URL', '/backend/');
        expect(getAbsoluteApiBaseUrl()).toBe(`${window.location.origin}/backend`);
    });
});

describe('getApiUrl', () => {
    it('returns empty string if no path is provided', () => {
        expect(getApiUrl('')).toBe('');
        expect(getApiUrl(null)).toBe('');
        expect(getApiUrl(undefined)).toBe('');
    });

    it('returns the path unmodified if it starts with http', () => {
        expect(getApiUrl('http://example.com')).toBe('http://example.com');
        expect(getApiUrl('https://example.com/api')).toBe('https://example.com/api');
    });

    it('returns the path unmodified if it starts with /static/', () => {
        expect(getApiUrl('/static/logo.png')).toBe('/static/logo.png');
    });

    it('prepends base URL to the path', () => {
        expect(getApiUrl('/test')).toBe('/test');
        expect(getApiUrl('test')).toBe('/test');
    });

    it('handles custom base URL from env', () => {
        vi.stubEnv('VITE_API_URL', 'https://api.example.com/');
        expect(getApiUrl('/users')).toBe('https://api.example.com/users');
        expect(getApiUrl('users')).toBe('https://api.example.com/users');
        vi.unstubAllEnvs();
    });

    it('prefixes a relative path with the base URL from env', () => {
        vi.stubEnv('VITE_API_URL', 'https://api.example.com/');
        expect(getApiUrl('/images/logo.png')).toBe('/images/logo.png');
        expect(getApiUrl('/api/me')).toBe('https://api.example.com/api/me');
        vi.unstubAllEnvs();
    });

    it('handles custom base URL without trailing slash', () => {
        vi.stubEnv('VITE_API_URL', 'https://api.example.com');
        expect(getApiUrl('/users')).toBe('https://api.example.com/users');
        vi.unstubAllEnvs();
    });
});
