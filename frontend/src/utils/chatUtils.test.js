import { describe, it, expect } from 'vitest';
import { formatConversationTitle } from './chatUtils';

describe('formatConversationTitle', () => {
    it('returns default Conversation when title is missing', () => {
        expect(formatConversationTitle('')).toBe('Conversation');
        expect(formatConversationTitle(null)).toBe('Conversation');
        expect(formatConversationTitle(undefined)).toBe('Conversation');
    });

    it('returns custom title as-is if it does not match auto-generated pattern', () => {
        expect(formatConversationTitle('General Chat')).toBe('General Chat');
        expect(formatConversationTitle('Questions & Answers')).toBe('Questions & Answers');
    });

    it('formats auto-generated user starter title correctly', () => {
        const title = 'Conversation started by User 5 at 2026-07-08 10:00:00.123456';
        // Note: new Date() parses timezone, toLocaleDateString might be system dependent, but let's test format shape
        const formatted = formatConversationTitle(title);
        expect(formatted).toContain('Chat on ');
    });

    it('returns original title if date parsing fails in auto-generated title', () => {
        const title = 'Conversation started by User 5 at invalid-date-format';
        expect(formatConversationTitle(title)).toBe(title);
    });
});
