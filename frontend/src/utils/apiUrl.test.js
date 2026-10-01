import { describe, it, expect, vi, afterEach } from 'vitest';
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
        // Without VITE_API_URL defined, defaults to empty base URL
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
