import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import adminCache, { get, set, invalidate, clear } from './adminCache';

describe('adminCache', () => {
    beforeEach(() => {
        adminCache.clear();
        vi.useRealTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('returns null for non-existent key', () => {
        expect(adminCache.get('non_existent')).toBeNull();
        expect(get('non_existent')).toBeNull();
    });

    it('stores and retrieves cached data', () => {
        const mockData = { id: 1, name: 'Test' };
        adminCache.set('test_key', mockData);
        expect(adminCache.get('test_key')).toEqual(mockData);
        expect(get('test_key')).toEqual(mockData);
    });

    it('expires data after TTL', () => {
        vi.useFakeTimers();
        const mockData = { count: 42 };
        
        // Custom TTL 1000ms
        adminCache.set('short_lived', mockData, 1000);
        expect(adminCache.get('short_lived')).toEqual(mockData);

        // Advance 999ms - still valid
        vi.advanceTimersByTime(999);
        expect(adminCache.get('short_lived')).toEqual(mockData);

        // Advance 2ms - expired
        vi.advanceTimersByTime(2);
        expect(adminCache.get('short_lived')).toBeNull();
    });

    it('uses default 5-minute TTL when not specified', () => {
        vi.useFakeTimers();
        const mockData = { user: 'admin' };
        adminCache.set('default_ttl', mockData);

        // Advance 4 minutes 59 seconds - still valid
        vi.advanceTimersByTime(4 * 60 * 1000 + 59 * 1000);
        expect(adminCache.get('default_ttl')).toEqual(mockData);

        // Advance past 5 minutes - expired
        vi.advanceTimersByTime(2000);
        expect(adminCache.get('default_ttl')).toBeNull();
    });

    it('invalidates by exact key and key prefix', () => {
        adminCache.set('admin_dashboard_7', { days: 7 });
        adminCache.set('admin_dashboard_30', { days: 30 });
        adminCache.set('admin_users_page_1', { page: 1 });
        adminCache.set('admin_classes', { classes: [] });

        // Invalidate prefix 'admin_dashboard'
        adminCache.invalidate('admin_dashboard');

        expect(adminCache.get('admin_dashboard_7')).toBeNull();
        expect(adminCache.get('admin_dashboard_30')).toBeNull();
        expect(adminCache.get('admin_users_page_1')).not.toBeNull();
        expect(adminCache.get('admin_classes')).not.toBeNull();

        // Invalidate exact key
        adminCache.invalidate('admin_classes');
        expect(adminCache.get('admin_classes')).toBeNull();
        expect(adminCache.get('admin_users_page_1')).not.toBeNull();
    });

    it('clears all cache entries', () => {
        adminCache.set('key1', 'val1');
        adminCache.set('key2', 'val2');
        adminCache.set('other', 'val3');

        expect(adminCache.get('key1')).toBe('val1');
        adminCache.clear();

        expect(adminCache.get('key1')).toBeNull();
        expect(adminCache.get('key2')).toBeNull();
        expect(adminCache.get('other')).toBeNull();
    });

    it('handles empty or null prefix in invalidate gracefully', () => {
        adminCache.set('key1', 'val1');
        adminCache.invalidate('');
        adminCache.invalidate(null);
        adminCache.invalidate(undefined);
        expect(adminCache.get('key1')).toBe('val1');
    });
});
