import { describe, it, expect, vi, afterEach } from 'vitest';
import { getApiUrl } from './apiUrl';

describe('getApiUrl', () => {
    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('returns empty string for falsy path', () => {
        expect(getApiUrl(null)).toBe('');
        expect(getApiUrl(undefined)).toBe('');
        expect(getApiUrl('')).toBe('');
    });

    it('returns the same path if it starts with http', () => {
        expect(getApiUrl('http://example.com/api')).toBe('http://example.com/api');
        expect(getApiUrl('https://example.com/api')).toBe('https://example.com/api');
    });

    it('returns the same path if it starts with /static/', () => {
        expect(getApiUrl('/static/images/logo.png')).toBe('/static/images/logo.png');
    });

    it('prepends VITE_API_URL to the path', () => {
        vi.stubEnv('VITE_API_URL', 'http://localhost:5000');
        expect(getApiUrl('/users')).toBe('http://localhost:5000/users');
        expect(getApiUrl('users')).toBe('http://localhost:5000/users');
    });

    it('handles VITE_API_URL with trailing slash', () => {
        vi.stubEnv('VITE_API_URL', 'http://localhost:5000/');
        expect(getApiUrl('/users')).toBe('http://localhost:5000/users');
        expect(getApiUrl('users')).toBe('http://localhost:5000/users');
    });

    it('handles empty VITE_API_URL', () => {
        vi.stubEnv('VITE_API_URL', '');
        expect(getApiUrl('/users')).toBe('/users');
        expect(getApiUrl('users')).toBe('/users');
    });
});
