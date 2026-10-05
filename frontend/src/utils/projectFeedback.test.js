import { describe, it, expect } from 'vitest';
import { getFeedbackStyle } from './projectFeedback';

describe('getFeedbackStyle', () => {
    it('gives only an approved project the positive wording and no modifier class', () => {
        const style = getFeedbackStyle('approved');
        expect(style.reviewTitle).toBe('Instructor Review');
        expect(style.noteLabel).toBe('Teacher Note');
        expect(style.className).toBe('');
    });

    it('gives a rejected project the revision wording and style', () => {
        const style = getFeedbackStyle('rejected');
        expect(style.reviewTitle).toBe('Revision Requested');
        expect(style.noteLabel).toBe('Revision Note');
        expect(style.className).toBe('revision-feedback');
    });

    it.each([['pending'], [undefined], [null], ['something-else']])('treats %s as an earlier note, not a review', (status) => {
        const style = getFeedbackStyle(status);
        expect(style.reviewTitle).toBe('Previous Feedback');
        expect(style.noteLabel).toBe('Previous Note');
        expect(style.className).toBe('pending-feedback');
    });

    it('uses a different icon for each of the three styles', () => {
        const icons = ['approved', 'rejected', 'pending'].map((status) => getFeedbackStyle(status).Icon);
        expect(new Set(icons).size).toBe(3);
    });
});
