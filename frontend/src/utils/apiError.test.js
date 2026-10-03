import { describe, it, expect } from 'vitest';
import { getErrorMessage } from './apiError';

const errorWith = (data) => ({ response: { data } });

describe('getErrorMessage', () => {
    it('returns the fallback when there is no response', () => {
        expect(getErrorMessage(new Error('Network Error'), 'Fallback')).toBe('Fallback');
        expect(getErrorMessage(undefined, 'Fallback')).toBe('Fallback');
        expect(getErrorMessage({ response: {} }, 'Fallback')).toBe('Fallback');
    });

    it('reads { error } bodies', () => {
        expect(getErrorMessage(errorWith({ error: 'Bad input' }), 'Fallback')).toBe('Bad input');
    });

    it('reads { message } bodies', () => {
        expect(getErrorMessage(errorWith({ success: false, message: 'Nope' }), 'Fallback')).toBe('Nope');
    });

    it('prefers error over message when both are present', () => {
        expect(getErrorMessage(errorWith({ error: 'E', message: 'M' }), 'Fallback')).toBe('E');
    });

    it('falls through an empty error to the message', () => {
        expect(getErrorMessage(errorWith({ error: '', message: 'M' }), 'Fallback')).toBe('M');
    });

    it('reads @api_response envelopes carrying a string error', () => {
        const body = { status: 'error', data: null, error: 'Passwords do not match.' };
        expect(getErrorMessage(errorWith(body), 'Fallback')).toBe('Passwords do not match.');
    });

    it('reads @api_response envelopes that carry extra top-level fields', () => {
        const body = { status: 'error', data: null, error: 'Drawer taken.', conflict: true, message: 'Drawer taken.' };
        expect(getErrorMessage(errorWith(body), 'Fallback')).toBe('Drawer taken.');
    });

    it('uses the fallback for non-string details', () => {
        expect(getErrorMessage(errorWith({ error: 42 }), 'Fallback')).toBe('Fallback');
        expect(getErrorMessage(errorWith({ error: { code: 1 } }), 'Fallback')).toBe('Fallback');
        expect(getErrorMessage(errorWith({ error: { error: 'Nested' } }), 'Fallback')).toBe('Fallback');
        expect(getErrorMessage(errorWith({ error: ['a'] }), 'Fallback')).toBe('Fallback');
        expect(getErrorMessage(errorWith({}), 'Fallback')).toBe('Fallback');
    });

    it('returns a plain-string body as is', () => {
        expect(getErrorMessage(errorWith('Invalid username or password.'), 'Fallback')).toBe('Invalid username or password.');
    });

    it('ignores blank and HTML string bodies', () => {
        expect(getErrorMessage(errorWith('   '), 'Fallback')).toBe('Fallback');
        expect(getErrorMessage(errorWith('<html><body>502 Bad Gateway</body></html>'), 'Fallback')).toBe('Fallback');
    });

    it('always yields a string that is safe to .includes() on', () => {
        const msg = getErrorMessage(errorWith({ error: { not: 'a string' } }), '');
        expect(typeof msg).toBe('string');
        expect(msg.includes('already exists')).toBe(false);
    });
});
