import { describe, it, expect } from 'vitest';
import { HIDDEN_FIELDS, RESOURCES } from './adminSchema';

describe('adminSchema', () => {
    it('no longer offers an editor for the removed AI teacher settings', () => {
        expect(RESOURCES).not.toContain('AISettings');
        expect(RESOURCES).toContain('Configuration');
    });

    it('hides the deprecated ai_teacher_enabled column on Configuration', () => {
        expect(HIDDEN_FIELDS.Configuration.has('ai_teacher_enabled')).toBe(true);
        expect(HIDDEN_FIELDS.User.has('password_hash')).toBe(true);
    });
});
