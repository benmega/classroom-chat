import { describe, it, expect, vi } from 'vitest';
import { formatLargeNumber, formatStaticUrl } from './formatters';
import * as apiUrlModule from './apiUrl';

vi.mock('./apiUrl', () => ({
    getApiUrl: vi.fn((url) => `MOCKED_API_URL${url}`)
}));

describe('formatLargeNumber', () => {
    it('returns "0" for null or undefined', () => {
        expect(formatLargeNumber(null)).toBe('0');
        expect(formatLargeNumber(undefined)).toBe('0');
    });

    it('returns "0" for invalid numbers', () => {
        expect(formatLargeNumber('invalid')).toBe('0');
    });

    it('formats numbers less than 10000 normally', () => {
        expect(formatLargeNumber(9999)).toBe('9,999');
        expect(formatLargeNumber(1234.567)).toBe('1,234.567');
        expect(formatLargeNumber(1234.5678)).toBe('1,234.568'); // rounds
    });

    it('formats large numbers compactly', () => {
        expect(formatLargeNumber(10000)).toBe('10K');
        expect(formatLargeNumber(15000)).toBe('15K');
        expect(formatLargeNumber(1500000)).toBe('1.5M');
        expect(formatLargeNumber(1000000000)).toBe('1B');
    });
});

describe('formatStaticUrl', () => {
    it('returns null for falsy values', () => {
        expect(formatStaticUrl(null)).toBeNull();
        expect(formatStaticUrl('')).toBeNull();
    });

    it('returns the same url if it already starts with http, https, or data', () => {
        expect(formatStaticUrl('http://example.com')).toBe('http://example.com');
        expect(formatStaticUrl('https://example.com')).toBe('https://example.com');
        expect(formatStaticUrl('data:image/png;base64,...')).toBe('data:image/png;base64,...');
    });

    it('prefixes with /static/ if it does not start with /', () => {
        const result = formatStaticUrl('images/logo.png');
        expect(result).toBe('MOCKED_API_URL/static/images/logo.png');
        expect(apiUrlModule.getApiUrl).toHaveBeenCalledWith('/static/images/logo.png');
    });

    it('does not prefix with /static/ if it already starts with /', () => {
        const result = formatStaticUrl('/user/assets/logo.png');
        expect(result).toBe('MOCKED_API_URL/user/assets/logo.png');
        expect(apiUrlModule.getApiUrl).toHaveBeenCalledWith('/user/assets/logo.png');
    });
});
