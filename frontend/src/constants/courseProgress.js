import codecombatLogo from '../assets/codecombat-logo.png';
import ozariaLogo from '../assets/ozaria-logo.png';
import modeling3DLogo from '../assets/3d-modeling-logo.webp';
import tinkercadLogo from '../assets/tinkercad-logo.svg';
import blenderLogo from '../assets/blender-logo.svg';

/**
 * Per-domain presentation config. Everything that used to be a ternary chain
 * in the progress tree / breakdown pages (logo, link, css class, colors) lives here.
 *
 * - `cssClass` must be a valid CSS identifier (the domain id '3d-modeling' is not).
 * - `color` is used for borders/fills/lines (>= 3:1 on white), `textColor` for text on
 *   tinted backgrounds (>= 4.5:1), `colorHover` for the solid CTA button hover state.
 * - `url`/`linkLabel` describe the external site a track header links to. When a domain
 *   has several external tools (3D Modeling) `url` is null and `tools` lists them instead.
 */
export const DOMAINS = {
    codecombat: {
        id: 'codecombat',
        label: 'CodeCombat',
        cssClass: 'codecombat',
        logo: codecombatLogo,
        url: 'https://codecombat.com',
        linkLabel: 'Visit CodeCombat',
        playUrl: 'https://codecombat.com/play',
        color: '#2b91af',
        textColor: '#2b91af',
        colorHover: '#217088',
        tint: 'rgba(43, 145, 175, 0.12)',
        tintBorder: 'rgba(43, 145, 175, 0.2)'
    },
    ozaria: {
        id: 'ozaria',
        label: 'Ozaria',
        cssClass: 'ozaria',
        logo: ozariaLogo,
        url: 'https://www.ozaria.com',
        linkLabel: 'Visit Ozaria',
        playUrl: 'https://ozaria.com/play',
        color: '#902edb',
        textColor: '#902edb',
        colorHover: '#7122ad',
        tint: 'rgba(144, 46, 219, 0.12)',
        tintBorder: 'rgba(144, 46, 219, 0.2)'
    },
    '3d-modeling': {
        id: '3d-modeling',
        label: '3D Modeling',
        cssClass: 'modeling3d',
        logo: modeling3DLogo,
        url: null,
        linkLabel: null,
        tools: [
            { id: 'tinkercad', name: 'Tinkercad', url: 'https://www.tinkercad.com', logo: tinkercadLogo },
            { id: 'blender', name: 'Blender', url: 'https://www.blender.org', logo: blenderLogo }
        ],
        color: '#C2410C',     // orange-700: 5.2:1 vs white text / white bg
        textColor: '#9A3412', // orange-800: >= 6:1 on the 12% tint
        colorHover: '#9A3412',
        tint: 'rgba(194, 65, 12, 0.12)',
        tintBorder: 'rgba(194, 65, 12, 0.25)'
    }
};

export const getDomainConfig = (domain) => DOMAINS[domain] || DOMAINS.codecombat;

/** Which domain (progress source + styling) each track column belongs to. */
export const TRACK_DOMAINS = {
    ozaria: 'ozaria',
    cs: 'codecombat',
    gd: 'codecombat',
    wd: 'codecombat',
    '3d': '3d-modeling'
};

export const getTrackDomain = (trackId) => TRACK_DOMAINS[trackId] || 'codecombat';

export const TRACKS = [
    { id: 'ozaria', title: 'Ozaria', col: 1 },
    { id: 'cs', title: 'Computer Science', col: 2 },
    { id: 'gd', title: 'Game Development', col: 3 },
    { id: 'wd', title: 'Web Development', col: 4 },
    { id: '3d', title: '3D Modeling', col: 5 }
];

export const ALIGNED_NODES = [
    { id: 'cc-junior', title: 'Code Combat Junior', aliases: ['Code Combat Junior', 'Junior'], domain: 'codecombat', track: 'cs', row: 1 },
    { id: 'cs-1', title: 'Introduction to Computer Science', aliases: ['Introduction to Computer Science', 'Computer Science 1', 'CS1'], domain: 'codecombat', track: 'cs', row: 2 },
    { id: 'oz-1', title: 'Sky Mountain', aliases: ['Sky Mountain', 'Ozaria 1', 'Chapter1', 'Chapter 1'], domain: 'ozaria', track: 'ozaria', row: 3 },
    { id: 'gd-1', title: 'Game Development 1', aliases: ['Game Development 1', 'GD1'], domain: 'codecombat', track: 'gd', row: 3 },
    { id: 'cs-2', title: 'Computer Science 2', aliases: ['Computer Science 2', 'CS2'], domain: 'codecombat', track: 'cs', row: 4 },
    { id: 'oz-2', title: 'Ozaria Chapter 2', aliases: ['Ozaria Chapter 2', 'Chapter 2', 'Ozaria 2', 'Chapter2'], domain: 'ozaria', track: 'ozaria', row: 5 },
    { id: 'wd-1', title: 'Web Development 1', aliases: ['Web Development 1', 'WD1'], domain: 'codecombat', track: 'wd', row: 5 },
    { id: 'cs-3', title: 'Computer Science 3', aliases: ['Computer Science 3', 'CS3'], domain: 'codecombat', track: 'cs', row: 6 },
    { id: 'oz-3', title: 'Ozaria Chapter 3', aliases: ['Ozaria Chapter 3', 'Chapter 3', 'Ozaria 3', 'Chapter3'], domain: 'ozaria', track: 'ozaria', row: 7 },
    { id: 'gd-2', title: 'Game Development 2', aliases: ['Game Development 2', 'GD2'], domain: 'codecombat', track: 'gd', row: 7 },
    { id: 'wd-2', title: 'Web Development 2', aliases: ['Web Development 2', 'WD2'], domain: 'codecombat', track: 'wd', row: 7 },
    { id: 'cs-4', title: 'Computer Science 4', aliases: ['Computer Science 4', 'CS4'], domain: 'codecombat', track: 'cs', row: 8 },
    { id: 'oz-4', title: 'Ozaria 4', aliases: ['Ozaria 4', 'Ozaria Chapter 4', 'Chapter 4', 'Chapter4'], domain: 'ozaria', track: 'ozaria', row: 9 },
    { id: 'gd-3', title: 'Game Development 3', aliases: ['Game Development 3', 'GD3'], domain: 'codecombat', track: 'gd', row: 9 },
    { id: 'cs-5', title: 'Computer Science 5', aliases: ['Computer Science 5', 'CS5'], domain: 'codecombat', track: 'cs', row: 10 },
    { id: 'cs-6', title: 'Computer Science 6', aliases: ['Computer Science 6', 'CS6'], domain: 'codecombat', track: 'cs', row: 11 },
    
    // 3D Modeling Track (Mini-Project Based)
    { id: '3d-1', title: 'TinkerCAD 1', aliases: ['TinkerCAD 1', '3D-1'], domain: '3d-modeling', track: '3d', row: 4, logo: tinkercadLogo, toolName: 'Tinkercad', toolUrl: 'https://www.tinkercad.com' },
    { id: '3d-2', title: 'Blender 1', aliases: ['Blender 1', '3D-2'], domain: '3d-modeling', track: '3d', row: 8, logo: blenderLogo, toolName: 'Blender', toolUrl: 'https://www.blender.org' }
];

export const BRANCH_EDGES = [
    { from: 'cs-1', to: 'gd-1' },
    { from: 'cs-2', to: 'wd-1' },
    { from: 'cs-3', to: 'gd-2' },
    { from: 'cs-3', to: 'wd-2' },
    { from: 'cs-4', to: 'gd-3' },
    { from: 'cs-1', to: 'oz-1' },
    { from: 'cs-2', to: 'oz-2' },
    { from: 'cs-3', to: 'oz-3' },
    { from: 'cs-4', to: 'oz-4' },
    { from: 'cs-2', to: '3d-1' },
    { from: '3d-1', to: '3d-2' }
];

export const matchCourse = (courseName, aliases) => {
    const normalize = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
    const normName = normalize(courseName);
    return aliases.some(alias => normalize(alias) === normName);
};

const normalizeKey = (str) => String(str || '').toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Pair a project template with the challenge level it completes. The backend adds
 * `challenge_slug` to the template JSON; without it we fall back to the documented
 * convention template.name == challenge name.
 */
export const levelMatchesProject = (level, project) => {
    if (!level || !project) return false;
    if (project.challenge_slug && level.slug) return project.challenge_slug === level.slug;
    return !!level.name && normalizeKey(level.name) === normalizeKey(project.name);
};

export const findLevelForProject = (project, levels = []) =>
    levels.find(level => levelMatchesProject(level, project)) || null;

export const findProjectForLevel = (level, projects = []) =>
    projects.find(project => levelMatchesProject(level, project)) || null;

export const getAncestors =(nodeId, processedNodes) => {
    const ancestors = new Set([nodeId]);
    let added = true;
    while (added) {
        added = false;
        TRACKS.forEach(track => {
            const trackNodes = processedNodes.filter(n => n.track === track.id && !n.is_extra);
            for (let i = 0; i < trackNodes.length - 1; i++) {
                if (ancestors.has(trackNodes[i + 1].id) && !ancestors.has(trackNodes[i].id)) {
                    ancestors.add(trackNodes[i].id); added = true;
                }
            }
        });
        BRANCH_EDGES.forEach(edge => {
            if (ancestors.has(edge.to) && !ancestors.has(edge.from)) {
                ancestors.add(edge.from); added = true;
            }
        });
    }
    return ancestors;
};

export const getDescendants = (nodeId, processedNodes) => {
    const descendants = new Set([nodeId]);
    let added = true;
    while (added) {
        added = false;
        TRACKS.forEach(track => {
            const trackNodes = processedNodes.filter(n => n.track === track.id && !n.is_extra);
            for (let i = 0; i < trackNodes.length - 1; i++) {
                if (descendants.has(trackNodes[i].id) && !descendants.has(trackNodes[i + 1].id)) {
                    descendants.add(trackNodes[i + 1].id); added = true;
                }
            }
        });
        BRANCH_EDGES.forEach(edge => {
            if (descendants.has(edge.from) && !descendants.has(edge.to)) {
                descendants.add(edge.to); added = true;
            }
        });
    }
    return descendants;
};

export const getPrerequisiteTitles = (nodeId, processedNodes) => {
    const titles = [];
    const node = processedNodes.find(n => n.id === nodeId);
    if (!node) return "";
    const trackNodes = processedNodes.filter(n => n.track === node.track && !n.is_extra);
    const myIndex = trackNodes.findIndex(n => n.id === node.id);
    if (myIndex > 0) {
        titles.push(trackNodes[myIndex - 1].title);
    }
    BRANCH_EDGES.forEach(edge => {
        if (edge.to === node.id) {
            const p = processedNodes.find(n => n.id === edge.from);
            if (p) titles.push(p.title);
        }
    });
    // A branch edge can duplicate the previous node in the same track (e.g. 3d-1 -> 3d-2)
    return [...new Set(titles)].join(" or ");
};
