import { describe, it, expect } from 'vitest';
import { formatLargeNumber, formatStaticUrl, cssUrl, formatRelativeTime } from './formatters';

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

    describe('cssUrl', () => {
        it('returns none when there is no image', () => {
            expect(cssUrl('')).toBe('none');
            expect(cssUrl(null)).toBe('none');
            expect(cssUrl(undefined)).toBe('none');
        });

        it('quotes plain urls', () => {
            expect(cssUrl('/images/standard_projects/proj_1.jpg')).toBe('url("/images/standard_projects/proj_1.jpg")');
            expect(cssUrl('images/projects/a.jpg')).toBe('url("/static/images/projects/a.jpg")');
            expect(cssUrl('https://example.com/a.png')).toBe('url("https://example.com/a.png")');
        });

        it('encodes spaces and parentheses', () => {
            expect(cssUrl('images/projects/Tepun - Text-Based Adventure (2).jpg'))
                .toBe('url("/static/images/projects/Tepun%20-%20Text-Based%20Adventure%20%282%29.jpg")');
        });

        it('cannot be broken out of by quotes or backslashes in a filename', () => {
            expect(cssUrl('/user/project_images/a"b\\c.jpg')).toBe('url("/user/project_images/a%22b%5Cc.jpg")');
        });

        it('does not double-encode urls that are already percent-encoded', () => {
            expect(cssUrl('/images/projects/My%20Project.jpg')).toBe('url("/images/projects/My%20Project.jpg")');
            expect(cssUrl('/images/projects/100%.jpg')).toBe('url("/images/projects/100%25.jpg")');
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
