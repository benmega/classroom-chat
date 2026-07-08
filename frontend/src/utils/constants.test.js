import { describe, it, expect } from 'vitest';
import { GLOBAL_CLASSROOM_ID } from './constants';

describe('constants', () => {
    it('defines GLOBAL_CLASSROOM_ID correctly', () => {
        expect(GLOBAL_CLASSROOM_ID).toBe('global');
    });
});
