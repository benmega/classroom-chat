import { describe, it, expect } from 'vitest';
import { formatLargeNumber, formatStaticUrl, formatRelativeTime } from './formatters';

describe('formatters', () => {
    describe('formatLargeNumber', () => {
        it('handles null, undefined, and NaN', () => {
            expect(formatLargeNumber(null)).toBe('0');
            expect(formatLargeNumber(undefined)).toBe('0');
            expect(formatLargeNumber('not-a-number')).toBe('0');
        });

        it('formats numbers less than 10,000 with toLocaleString', () => {
            expect(formatLargeNumber(1234)).toBe('1,234');
            expect(formatLargeNumber(123.4567)).toBe('123.457');
        });

        it('formats numbers 10,000 and larger compactly', () => {
            expect(formatLargeNumber(10000)).toBe('10K');
            expect(formatLargeNumber(1500000)).toBe('1.5M');
        });
    });

    describe('formatStaticUrl', () => {
        it('returns null if URL is not provided', () => {
            expect(formatStaticUrl('')).toBe(null);
            expect(formatStaticUrl(null)).toBe(null);
        });

        it('returns absolute or data URLs as-is', () => {
            expect(formatStaticUrl('http://example.com/img.png')).toBe('http://example.com/img.png');
            expect(formatStaticUrl('https://example.com/img.png')).toBe('https://example.com/img.png');
            expect(formatStaticUrl('data:image/png;base64,123')).toBe('data:image/png;base64,123');
        });

        it('routes local paths correctly', () => {
            // Absolute path starting with /
            expect(formatStaticUrl('/avatar.png')).toBe('/avatar.png');
            // Relative path prepends /static/
            expect(formatStaticUrl('logo.png')).toBe('/static/logo.png');
        });
    });

    describe('formatRelativeTime', () => {
        it('returns Never for empty or invalid dates', () => {
            expect(formatRelativeTime('')).toBe('Never');
            expect(formatRelativeTime(null)).toBe('Never');
            expect(formatRelativeTime('invalid-date')).toBe('Never');
        });

        it('formats relative times correctly', () => {
            const now = new Date();
            
            // Just now (< 10s)
            const justNow = new Date(now.getTime() - 5000).toISOString();
            expect(formatRelativeTime(justNow)).toBe('Just now');

            // Seconds ago
            const secsAgo = new Date(now.getTime() - 30000).toISOString();
            expect(formatRelativeTime(secsAgo)).toBe('30s ago');

            // Minutes ago
            const minsAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
            expect(formatRelativeTime(minsAgo)).toBe('5m ago');

            // Hours ago
            const hoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString();
            expect(formatRelativeTime(hoursAgo)).toBe('3h ago');

            // Days ago
            const daysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();
            expect(formatRelativeTime(daysAgo)).toBe('2d ago');

            // More than 7 days ago
            const wayPast = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString();
            expect(formatRelativeTime(wayPast)).not.toBe('Never');
            expect(formatRelativeTime(wayPast)).not.toContain('ago');
        });
    });
});
