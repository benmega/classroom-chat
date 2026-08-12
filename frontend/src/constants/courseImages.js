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

    // Official Code.org / CodeAI Banner
    'code-org': '/images/courses/codeai.png',
    'codeorg': '/images/courses/codeai.png',
    'codeai': '/images/courses/codeai.png',
    'code-ai': '/images/courses/codeai.png',
    'express-course': '/images/courses/codeai.png',
    'cs-discoveries': '/images/courses/codeai.png',
    'ai-for-oceans': '/images/courses/codeai.png',

    // Code.org 2024 Course A-F (each gets its own copy of the CodeAI banner
    // so future per-course art can be swapped in independently)
    'coursea-2024': '/images/courses/coursea.png',
    'courseb-2024': '/images/courses/courseb.png',
    'coursec-2024': '/images/courses/coursec.png',
    'coursed-2024': '/images/courses/coursed.png',
    'coursee-2024': '/images/courses/coursee.png',
    'coursef-2024': '/images/courses/coursef.png',
};

// Domain default fallback images
export const DOMAIN_DEFAULT_IMAGES = {
    'codecombat.com': '/images/courses/cs1.png',
    'codecombat': '/images/courses/cs1.png',
    'ozaria.com': '/images/courses/ozaria1.png',
    'ozaria': '/images/courses/ozaria1.png',
    'studio.code.org': '/images/courses/codeai.png',
    'code.org': '/images/courses/codeai.png',
    'codeai': '/images/courses/codeai.png',
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

    return null;
};
