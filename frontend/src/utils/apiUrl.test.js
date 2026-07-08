import { describe, it, expect, vi } from 'vitest';
import { getApiUrl } from './apiUrl';

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

    it('handles custom base URL without trailing slash', () => {
        vi.stubEnv('VITE_API_URL', 'https://api.example.com');
        expect(getApiUrl('/users')).toBe('https://api.example.com/users');
        vi.unstubAllEnvs();
    });
});
