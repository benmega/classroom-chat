export const TRACKS = [
    { id: 'ozaria', title: 'Ozaria', col: 1 },
    { id: 'cs', title: 'Computer Science', col: 2 },
    { id: 'gd', title: 'Game Development', col: 3 },
    { id: 'wd', title: 'Web Development', col: 4 }
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
    { from: 'cs-4', to: 'oz-4' }
];

export const matchCourse = (courseName, aliases) => {
    const normalize = (str) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
    const normName = normalize(courseName);
    return aliases.some(alias => normalize(alias) === normName);
};

export const getAncestors = (nodeId, processedNodes) => {
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
    return titles.join(" or ");
};
