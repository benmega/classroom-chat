import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import clientCache, { get, set, has, invalidate, clear } from './clientCache';

describe('clientCache utility', () => {
    beforeEach(() => {
        clear();
        vi.useRealTimers();
    });

    afterEach(() => {
        clear();
        vi.useRealTimers();
    });

    it('returns null for nonexistent keys', () => {
        expect(get('nonexistent')).toBeNull();
        expect(has('nonexistent')).toBe(false);
    });

    it('stores and retrieves cached data', () => {
        set('user_123', { name: 'Alice' });
        expect(get('user_123')).toEqual({ name: 'Alice' });
        expect(has('user_123')).toBe(true);
    });

    it('expires data after TTL', () => {
        vi.useFakeTimers();
        set('temp_data', 'hello', 1000); // 1s TTL

        expect(get('temp_data')).toBe('hello');
        expect(has('temp_data')).toBe(true);

        vi.advanceTimersByTime(1001);

        expect(get('temp_data')).toBeNull();
        expect(has('temp_data')).toBe(false);
    });

    it('invalidates by exact key or key prefix', () => {
        set('course_progress_alice', { level: 5 });
        set('course_progress_bob', { level: 2 });
        set('achievements_all', [1, 2, 3]);

        invalidate('course_progress');

        expect(get('course_progress_alice')).toBeNull();
        expect(get('course_progress_bob')).toBeNull();
        expect(get('achievements_all')).toEqual([1, 2, 3]);
    });

    it('clears all cached data', () => {
        set('key1', 'value1');
        set('key2', 'value2');

        clear();

        expect(get('key1')).toBeNull();
        expect(get('key2')).toBeNull();
    });
});
