import { describe, it, expect } from 'vitest';
import { FK_OVERRIDES, HIDDEN_FIELDS, READONLY_FIELDS, RESOURCES } from './adminSchema';

describe('adminSchema', () => {
    it('lists each resource once', () => {
        expect(new Set(RESOURCES).size).toBe(RESOURCES.length);
    });

    it('has no entry for the removed Conversation model', () => {
        expect(RESOURCES).not.toContain('Conversation');
        expect(Object.keys(FK_OVERRIDES).filter(key => key.startsWith('Conversation.'))).toEqual([]);
        expect(Object.values(FK_OVERRIDES).filter(o => o.reference === 'Conversation')).toEqual([]);
    });

    it('only overrides columns of resources that are shown in the panel', () => {
        Object.keys(FK_OVERRIDES).forEach(key => {
            const [resource] = key.split('.');
            expect(RESOURCES, `${key}: resource is not in RESOURCES`).toContain(resource);
        });
    });

    it('only references resources that are shown in the panel', () => {
        Object.entries(FK_OVERRIDES).forEach(([key, override]) => {
            expect(RESOURCES, `${key}: references ${override.reference}`).toContain(override.reference);
            expect(override.displayField, `${key}: displayField`).toBeTruthy();
        });
    });

    it('shows users through the _username column, the key their records are served under', () => {
        const userRefs = Object.entries(FK_OVERRIDES).filter(([, o]) => o.reference === 'User');
        expect(userRefs.length).toBeGreaterThan(0);
        userRefs.forEach(([key, o]) => expect(o.displayField, key).toBe('_username'));
    });

    it('covers the user_id columns of the logs', () => {
        expect(FK_OVERRIDES['ChallengeLog.user_id']).toEqual({ reference: 'User', displayField: '_username' });
        expect(FK_OVERRIDES['DuckTradeLog.user_id']).toEqual({ reference: 'User', displayField: '_username' });
    });

    it('keeps the hidden and read-only field configuration', () => {
        expect(HIDDEN_FIELDS.User.has('password_hash')).toBe(true);
        expect(READONLY_FIELDS.has('created_at')).toBe(true);
    });

    it('no longer offers an editor for the removed AI teacher settings', () => {
        expect(RESOURCES).not.toContain('AISettings');
        expect(RESOURCES).toContain('Configuration');
    });

    it('hides the deprecated ai_teacher_enabled column on Configuration', () => {
        expect(HIDDEN_FIELDS.Configuration.has('ai_teacher_enabled')).toBe(true);
    });
});
