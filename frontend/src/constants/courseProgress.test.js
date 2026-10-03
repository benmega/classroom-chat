import { describe, it, expect } from 'vitest';
import {
    TRACKS, ALIGNED_NODES, DOMAINS, TRACK_DOMAINS, matchCourse, getAncestors, getDescendants,
    getPrerequisiteTitles, getDomainConfig, getTrackDomain,
    levelMatchesProject, findLevelForProject, findProjectForLevel
} from './courseProgress';

const nodes = [...ALIGNED_NODES].sort((a, b) => a.row - b.row);
const aliasesOf = (id) => ALIGNED_NODES.find(n => n.id === id).aliases;

describe('courseProgress - tracks and nodes', () => {
    it('gives every track a unique column', () => {
        const cols = TRACKS.map(t => t.col);
        expect(new Set(cols).size).toBe(cols.length);
        expect(new Set(TRACKS.map(t => t.id)).size).toBe(TRACKS.length);
    });

    it('registers the 3D Modeling track in column 5', () => {
        expect(TRACKS.find(t => t.id === '3d')).toMatchObject({ title: '3D Modeling', col: 5 });
    });

    it('has unique node ids, each on a known track with a known domain', () => {
        const ids = ALIGNED_NODES.map(n => n.id);
        expect(new Set(ids).size).toBe(ids.length);
        ALIGNED_NODES.forEach(n => {
            expect(TRACKS.some(t => t.id === n.track)).toBe(true);
            expect(DOMAINS[n.domain]).toBeDefined();
        });
    });

    it('does not place two nodes of one track on the same row', () => {
        TRACKS.forEach(track => {
            const rows = ALIGNED_NODES.filter(n => n.track === track.id).map(n => n.row);
            expect(new Set(rows).size).toBe(rows.length);
        });
    });

    it('puts a tool logo and url on each 3D node', () => {
        const tinker = ALIGNED_NODES.find(n => n.id === '3d-1');
        const blender = ALIGNED_NODES.find(n => n.id === '3d-2');
        expect(tinker.logo).toMatch(/tinkercad/i);
        expect(blender.logo).toMatch(/blender/i);
        expect(tinker.toolUrl).toBe('https://www.tinkercad.com');
        expect(blender.toolUrl).toBe('https://www.blender.org');
    });
});

describe('courseProgress - matchCourse', () => {
    it('matches 3D course names and aliases regardless of case/punctuation', () => {
        expect(matchCourse('TinkerCAD 1', aliasesOf('3d-1'))).toBe(true);
        expect(matchCourse('3D-1', aliasesOf('3d-1'))).toBe(true);
        expect(matchCourse('3d 1', aliasesOf('3d-1'))).toBe(true);
        expect(matchCourse('Blender 1', aliasesOf('3d-2'))).toBe(true);
        expect(matchCourse('TinkerCAD 1', aliasesOf('3d-2'))).toBe(false);
    });
});

describe('courseProgress - prerequisites and graph traversal', () => {
    it('lists Computer Science 2 as the only prerequisite of TinkerCAD 1', () => {
        expect(getPrerequisiteTitles('3d-1', nodes)).toBe('Computer Science 2');
    });

    it('lists TinkerCAD 1 as the prerequisite of Blender 1', () => {
        expect(getPrerequisiteTitles('3d-2', nodes)).toBe('TinkerCAD 1');
    });

    it('returns an empty string for an unknown node', () => {
        expect(getPrerequisiteTitles('nope', nodes)).toBe('');
    });

    it('includes 3d-1, cs-2 and cs-1 among the ancestors of 3d-2', () => {
        const ancestors = getAncestors('3d-2', nodes);
        ['3d-2', '3d-1', 'cs-2', 'cs-1'].forEach(id => expect(ancestors.has(id)).toBe(true));
        expect(ancestors.has('cs-3')).toBe(false);
    });

    it('includes the 3D nodes among the descendants of cs-2', () => {
        const descendants = getDescendants('cs-2', nodes);
        expect(descendants.has('3d-1')).toBe(true);
        expect(descendants.has('3d-2')).toBe(true);
    });

    it('reaches 3D from cs-1 (through cs-2) but never leads from 3D back into the cs track', () => {
        expect(getDescendants('cs-1', nodes).has('3d-1')).toBe(true);
        expect(getDescendants('3d-2', nodes).has('cs-3')).toBe(false);
    });
});

describe('courseProgress - domain config', () => {
    it('maps every track to a configured domain', () => {
        TRACKS.forEach(t => {
            expect(TRACK_DOMAINS[t.id]).toBeDefined();
            expect(DOMAINS[getTrackDomain(t.id)]).toBeDefined();
        });
        expect(getTrackDomain('3d')).toBe('3d-modeling');
        expect(getTrackDomain('unknown')).toBe('codecombat');
    });

    it('uses a valid CSS identifier as the class for every domain', () => {
        Object.values(DOMAINS).forEach(d => expect(d.cssClass).toMatch(/^[a-z][a-z0-9-]*$/));
        expect(getDomainConfig('3d-modeling').cssClass).toBe('modeling3d');
    });

    it('falls back to CodeCombat for an unknown domain', () => {
        expect(getDomainConfig('whatever')).toBe(DOMAINS.codecombat);
    });

    it('uses the correct Ozaria url', () => {
        expect(DOMAINS.ozaria.url).toBe('https://www.ozaria.com');
    });

    it('gives 3D both Tinkercad and Blender instead of a single header url', () => {
        const d = DOMAINS['3d-modeling'];
        expect(d.url).toBeNull();
        expect(d.tools.map(t => t.name)).toEqual(['Tinkercad', 'Blender']);
        d.tools.forEach(t => expect(t.url).toMatch(/^https:\/\//));
    });
});

describe('courseProgress - project/level pairing', () => {
    const levels = [
        { name: 'Name Plate', slug: 'name-plate', is_completed: true },
        { name: 'Robot Buddy', slug: 'robot-buddy', is_completed: false }
    ];

    it('pairs by challenge_slug when the template has one', () => {
        const project = { id: 1, name: 'Different title', challenge_slug: 'robot-buddy' };
        expect(findLevelForProject(project, levels)).toBe(levels[1]);
        expect(levelMatchesProject(levels[0], project)).toBe(false);
    });

    it('falls back to the template name equalling the challenge name', () => {
        const project = { id: 2, name: 'name plate' };
        expect(findLevelForProject(project, levels)).toBe(levels[0]);
        expect(findProjectForLevel(levels[0], [project])).toBe(project);
    });

    it('returns null when nothing matches', () => {
        expect(findLevelForProject({ id: 3, name: 'Unknown' }, levels)).toBeNull();
        expect(findProjectForLevel(levels[1], [{ id: 4, name: 'Other' }])).toBeNull();
        expect(findLevelForProject({ id: 5, name: 'x' }, undefined)).toBeNull();
    });
});
