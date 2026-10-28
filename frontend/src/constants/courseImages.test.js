import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
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

    it('returns an image for 3D Modeling courses by id, name, domain and prefix', () => {
        expect(getCourseHeaderImage('3d-1')).toBe(COURSE_IMAGES['3d-1']);
        expect(getCourseHeaderImage('3d-2')).toBeTruthy();
        expect(getCourseHeaderImage('unknown', 'TinkerCAD 1')).toBe(COURSE_IMAGES['3d-1']);
        expect(getCourseHeaderImage('unknown', 'Blender 1')).toBe(COURSE_IMAGES['3d-1']);
        expect(getCourseHeaderImage('unknown', 'unknown', '3d-modeling')).toBe(DOMAIN_DEFAULT_IMAGES['3d-modeling']);
        expect(getCourseHeaderImage('3d-unknown')).toBe(COURSE_IMAGES['3d-1']);
    });

    it('returns null if no matches', () => {
        expect(getCourseHeaderImage('random', 'random', 'random')).toBeNull();
    });
});

describe('course image files', () => {
    const DEFAULT_IMAGE = '/images/courses/course-default.webp';
    const PUBLIC_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../public');
    const publicFile = (urlPath) => path.join(PUBLIC_DIR, urlPath);

    it('points every code.org, CodeAI and 3D alias at the one shared default banner', () => {
        const sharedKeys = [
            '3d-1', '3d1', '3d-2', '3d2',
            'code-org', 'codeorg', 'codeai', 'code-ai', 'express-course', 'cs-discoveries', 'ai-for-oceans',
            'coursea-2024', 'courseb-2024', 'coursec-2024', 'coursed-2024', 'coursee-2024', 'coursef-2024',
        ];
        for (const key of sharedKeys) {
            expect(COURSE_IMAGES[key]).toBe(DEFAULT_IMAGE);
        }
        for (const key of ['studio.code.org', 'code.org', 'codeai', '3d-modeling']) {
            expect(DOMAIN_DEFAULT_IMAGES[key]).toBe(DEFAULT_IMAGE);
        }
    });

    it('resolves the Code.org course ids, names and domain to the default banner', () => {
        expect(getCourseHeaderImage('coursea-2024')).toBe(DEFAULT_IMAGE);
        expect(getCourseHeaderImage('coursef-2024')).toBe(DEFAULT_IMAGE);
        expect(getCourseHeaderImage('unknown', 'Code.org express')).toBe(DEFAULT_IMAGE);
        expect(getCourseHeaderImage('unknown', 'unknown', 'studio.code.org')).toBe(DEFAULT_IMAGE);
    });

    it('only references files that exist in public/', () => {
        const paths = new Set([...Object.values(COURSE_IMAGES), ...Object.values(DOMAIN_DEFAULT_IMAGES)]);
        const missing = [...paths].filter((urlPath) => !existsSync(publicFile(urlPath)));
        expect(missing).toEqual([]);
    });
});
