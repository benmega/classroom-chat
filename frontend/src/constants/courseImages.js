// One shared 800px banner (about 60 KB) for every course without dedicated art. The full-size original
// is kept in assets-src/courses/ and is not served. Swap a course onto its own file by pointing its key
// at a new path below.
const COURSE_DEFAULT_IMAGE = '/images/courses/course-default.webp';

export const COURSE_IMAGES = {
    // Official CodeCombat Course Banners
    'cs-1': '/images/courses/cs1.png',
    'cs1': '/images/courses/cs1.png',
    'cs-2': '/images/courses/cs2.png',
    'cs2': '/images/courses/cs2.png',
    'cs-3': '/images/courses/cs3.png',
    'cs3': '/images/courses/cs3.png',
    'cs-4': '/images/courses/cs4.png',
    'cs4': '/images/courses/cs4.png',
    'cs-5': '/images/courses/cs5.png',
    'cs5': '/images/courses/cs5.png',
    'cs-6': '/images/courses/cs6.png',
    'cs6': '/images/courses/cs6.png',
    'cc-junior': '/images/courses/cc_junior.webp',

    // Official Game Dev Series
    'gd-1': '/images/courses/gd1.png',
    'gd1': '/images/courses/gd1.png',
    'gd-2': '/images/courses/gd2.png',
    'gd2': '/images/courses/gd2.png',
    'gd-3': '/images/courses/gd3.png',
    'gd3': '/images/courses/gd3.png',

    // Official Web Dev Series
    'wd-1': '/images/courses/wd1.png',
    'wd1': '/images/courses/wd1.png',
    'wd-2': '/images/courses/wd2.png',
    'wd2': '/images/courses/wd2.png',

    // Official Ozaria Banners
    'oz-1': '/images/courses/ozaria1.png',
    'oz1': '/images/courses/ozaria1.png',
    'ozaria-1': '/images/courses/ozaria1.png',
    'sky-mountain': '/images/courses/ozaria1.png',
    'oz-2': '/images/courses/ozaria2.jpg',
    'oz2': '/images/courses/ozaria2.jpg',
    'ozaria-2': '/images/courses/ozaria2.jpg',
    'oz-3': '/images/courses/ozaria1.png',
    'oz3': '/images/courses/ozaria1.png',
    'ozaria-3': '/images/courses/ozaria1.png',
    'oz-4': '/images/courses/ozaria2.jpg',
    'oz4': '/images/courses/ozaria2.jpg',
    'ozaria-4': '/images/courses/ozaria2.jpg',

    // 3D Modeling (no dedicated art yet - reuse the generic classroom banner)
    '3d-1': COURSE_DEFAULT_IMAGE,
    '3d1': COURSE_DEFAULT_IMAGE,
    '3d-2': COURSE_DEFAULT_IMAGE,
    '3d2': COURSE_DEFAULT_IMAGE,

    // Official Code.org / CodeAI Banner
    'code-org': COURSE_DEFAULT_IMAGE,
    'codeorg': COURSE_DEFAULT_IMAGE,
    'codeai': COURSE_DEFAULT_IMAGE,
    'code-ai': COURSE_DEFAULT_IMAGE,
    'express-course': COURSE_DEFAULT_IMAGE,
    'cs-discoveries': COURSE_DEFAULT_IMAGE,
    'ai-for-oceans': COURSE_DEFAULT_IMAGE,

    // Code.org 2024 Course A-F (all share the default banner; give a course its own file here
    // when it has art of its own)
    'coursea-2024': COURSE_DEFAULT_IMAGE,
    'courseb-2024': COURSE_DEFAULT_IMAGE,
    'coursec-2024': COURSE_DEFAULT_IMAGE,
    'coursed-2024': COURSE_DEFAULT_IMAGE,
    'coursee-2024': COURSE_DEFAULT_IMAGE,
    'coursef-2024': COURSE_DEFAULT_IMAGE,
};

// Domain default fallback images
export const DOMAIN_DEFAULT_IMAGES = {
    'codecombat.com': '/images/courses/cs1.png',
    'codecombat': '/images/courses/cs1.png',
    'ozaria.com': '/images/courses/ozaria1.png',
    'ozaria': '/images/courses/ozaria1.png',
    'studio.code.org': COURSE_DEFAULT_IMAGE,
    'code.org': COURSE_DEFAULT_IMAGE,
    'codeai': COURSE_DEFAULT_IMAGE,
    '3d-modeling': COURSE_DEFAULT_IMAGE,
};

export const getCourseHeaderImage = (courseId, courseName = '', domain = '') => {
    if (!courseId) return null;
    const normId = courseId.toLowerCase().trim();
    if (COURSE_IMAGES[normId]) return COURSE_IMAGES[normId];
    
    // Check normalized course name or keywords
    const normName = (courseName || '').toLowerCase().trim();
    if (normName.includes('cs1') || normName.includes('cs 1') || normName.includes('introduction to computer science') || normName.includes('kithgard')) {
        return COURSE_IMAGES['cs-1'];
    }
    if (normName.includes('cs2') || normName.includes('cs 2') || normName.includes('computer science 2') || normName.includes('forest')) {
        return COURSE_IMAGES['cs-2'];
    }
    if (normName.includes('cs3') || normName.includes('cs 3') || normName.includes('computer science 3') || normName.includes('desert')) {
        return COURSE_IMAGES['cs-3'];
    }
    if (normName.includes('cs4') || normName.includes('cs 4') || normName.includes('computer science 4') || normName.includes('mountain')) {
        return COURSE_IMAGES['cs-4'];
    }
    if (normName.includes('cs5') || normName.includes('cs 5') || normName.includes('computer science 5') || normName.includes('glacier')) {
        return COURSE_IMAGES['cs-5'];
    }
    if (normName.includes('cs6') || normName.includes('cs 6') || normName.includes('computer science 6')) {
        return COURSE_IMAGES['cs-6'];
    }
    if (normName.includes('game dev 1') || normName.includes('gd1') || normName.includes('gd 1')) {
        return COURSE_IMAGES['gd-1'];
    }
    if (normName.includes('game dev 2') || normName.includes('gd2') || normName.includes('gd 2')) {
        return COURSE_IMAGES['gd-2'];
    }
    if (normName.includes('game dev 3') || normName.includes('gd3') || normName.includes('gd 3')) {
        return COURSE_IMAGES['gd-3'];
    }
    if (normName.includes('web dev 1') || normName.includes('wd1') || normName.includes('wd 1')) {
        return COURSE_IMAGES['wd-1'];
    }
    if (normName.includes('web dev 2') || normName.includes('wd2') || normName.includes('wd 2')) {
        return COURSE_IMAGES['wd-2'];
    }
    if (normName.includes('3d') || normName.includes('tinkercad') || normName.includes('blender')) {
        return COURSE_IMAGES['3d-1'];
    }
    if (normName.includes('junior')) {
        return COURSE_IMAGES['cc-junior'];
    }
    if (normName.includes('sky mountain') || normName.includes('ozaria 1') || normName.includes('ozaria chapter 1') || normName.includes('chapter1') || normName.includes('chapter 1') || normName.includes('journey')) {
        return COURSE_IMAGES['oz-1'];
    }
    if (normName.includes('ozaria 2') || normName.includes('ozaria chapter 2') || normName.includes('chapter2') || normName.includes('chapter 2')) {
        return COURSE_IMAGES['oz-2'];
    }
    if (normName.includes('ozaria 3') || normName.includes('ozaria chapter 3') || normName.includes('chapter3') || normName.includes('chapter 3')) {
        return COURSE_IMAGES['oz-3'];
    }
    if (normName.includes('ozaria 4') || normName.includes('ozaria chapter 4') || normName.includes('chapter4') || normName.includes('chapter 4')) {
        return COURSE_IMAGES['oz-4'];
    }
    if (normName.includes('code.org') || normName.includes('codeai') || normName.includes('express') || normName.includes('ai')) {
        return COURSE_IMAGES['code-org'];
    }

    // Check domain default (strip leading "www." so "www.ozaria.com" matches "ozaria.com")
    const normDomain = (domain || '').toLowerCase().trim().replace(/^www\./, '');
    if (DOMAIN_DEFAULT_IMAGES[normDomain]) return DOMAIN_DEFAULT_IMAGES[normDomain];

    // Default fallbacks by ID prefix
    if (normId.startsWith('oz')) return COURSE_IMAGES['oz-1'];
    if (normId.startsWith('cs')) return COURSE_IMAGES['cs-1'];
    if (normId.startsWith('gd')) return COURSE_IMAGES['gd-1'];
    if (normId.startsWith('wd')) return COURSE_IMAGES['wd-1'];
    if (normId.startsWith('3d')) return COURSE_IMAGES['3d-1'];

    return null;
};
