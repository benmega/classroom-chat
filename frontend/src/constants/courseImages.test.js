import { describe, it, expect } from 'vitest';
import { getCourseHeaderImage, COURSE_IMAGES, DOMAIN_DEFAULT_IMAGES } from './courseImages';

describe('getCourseHeaderImage', () => {
    it('returns null if courseId is empty', () => {
        expect(getCourseHeaderImage(null)).toBeNull();
    });

    it('returns image by exact courseId match', () => {
        expect(getCourseHeaderImage('cs-1')).toBe(COURSE_IMAGES['cs-1']);
        expect(getCourseHeaderImage(' CS-1 ')).toBe(COURSE_IMAGES['cs-1']);
    });

    it('returns image by name keywords for CS series', () => {
        expect(getCourseHeaderImage('unknown', 'Introduction to computer science')).toBe(COURSE_IMAGES['cs-1']);
        expect(getCourseHeaderImage('unknown', 'CS 2 Forest')).toBe(COURSE_IMAGES['cs-2']);
        expect(getCourseHeaderImage('unknown', 'computer science 3')).toBe(COURSE_IMAGES['cs-3']);
        expect(getCourseHeaderImage('unknown', 'CS4 mountain')).toBe(COURSE_IMAGES['cs-4']);
        expect(getCourseHeaderImage('unknown', 'CS 5')).toBe(COURSE_IMAGES['cs-5']);
        expect(getCourseHeaderImage('unknown', 'cs6')).toBe(COURSE_IMAGES['cs-6']);
    });

    it('returns image by name keywords for GD and WD', () => {
        expect(getCourseHeaderImage('unknown', 'Game Dev 1')).toBe(COURSE_IMAGES['gd-1']);
        expect(getCourseHeaderImage('unknown', 'Game Dev 2')).toBe(COURSE_IMAGES['gd-2']);
        expect(getCourseHeaderImage('unknown', 'Game Dev 3')).toBe(COURSE_IMAGES['gd-3']);
        expect(getCourseHeaderImage('unknown', 'Web Dev 1')).toBe(COURSE_IMAGES['wd-1']);
        expect(getCourseHeaderImage('unknown', 'Web Dev 2')).toBe(COURSE_IMAGES['wd-2']);
    });

    it('returns image by name keywords for Ozaria', () => {
        expect(getCourseHeaderImage('unknown', 'Ozaria chapter 1')).toBe(COURSE_IMAGES['oz-1']);
        expect(getCourseHeaderImage('unknown', 'Ozaria 2')).toBe(COURSE_IMAGES['oz-2']);
        expect(getCourseHeaderImage('unknown', 'Chapter 3')).toBe(COURSE_IMAGES['oz-3']);
        expect(getCourseHeaderImage('unknown', 'Ozaria 4')).toBe(COURSE_IMAGES['oz-4']);
    });

    it('returns image by name keywords for others', () => {
        expect(getCourseHeaderImage('unknown', 'cc junior')).toBe(COURSE_IMAGES['cc-junior']);
        expect(getCourseHeaderImage('unknown', 'express codeai')).toBe(COURSE_IMAGES['code-org']);
    });

    it('returns image by domain default', () => {
        expect(getCourseHeaderImage('unknown', 'unknown', 'www.codecombat.com')).toBe(DOMAIN_DEFAULT_IMAGES['codecombat.com']);
        expect(getCourseHeaderImage('unknown', 'unknown', 'ozaria.com')).toBe(DOMAIN_DEFAULT_IMAGES['ozaria.com']);
    });

    it('returns image by id prefix fallback', () => {
        expect(getCourseHeaderImage('oz-unknown')).toBe(COURSE_IMAGES['oz-1']);
        expect(getCourseHeaderImage('cs-unknown')).toBe(COURSE_IMAGES['cs-1']);
        expect(getCourseHeaderImage('gd-unknown')).toBe(COURSE_IMAGES['gd-1']);
        expect(getCourseHeaderImage('wd-unknown')).toBe(COURSE_IMAGES['wd-1']);
    });

    it('returns null if no matches', () => {
        expect(getCourseHeaderImage('random', 'random', 'random')).toBeNull();
    });
});
