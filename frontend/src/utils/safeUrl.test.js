import { describe, it, expect } from 'vitest';
import { safeUrl } from './safeUrl';

describe('safeUrl', () => {
    it('allows http and https', () => {
        expect(safeUrl('https://example.com/a')).toBe('https://example.com/a');
        expect(safeUrl(' http://example.com ')).toBe('http://example.com');
    });
    it('prefixes scheme-less domains', () => {
        expect(safeUrl('www.example.com')).toBe('https://www.example.com');
        expect(safeUrl('example.com/x?y=1')).toBe('https://example.com/x?y=1');
    });
    it('rejects dangerous or invalid values', () => {
        expect(safeUrl('javascript:alert(1)')).toBeNull();
        expect(safeUrl('JaVaScRiPt:alert(1)')).toBeNull();
        expect(safeUrl('data:text/html,hi')).toBeNull();
        expect(safeUrl('//evil.com')).toBeNull();
        expect(safeUrl('')).toBeNull();
        expect(safeUrl(null)).toBeNull();
        expect(safeUrl('not a url')).toBeNull();
    });
});
