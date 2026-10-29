import { act } from '@testing-library/react';

/**
 * Replaces window.matchMedia with a stand-in whose answers a test controls.
 *
 *   const media = mockMatchMedia(['(max-width: 800px)']);   // these queries match from the start
 *   media.set('(max-width: 800px)', false);                  // flip one and notify its change listeners
 *   media.restore();                                         // in afterEach
 */
export function mockMatchMedia(matching = []) {
    const original = window.matchMedia;
    const active = new Set(matching);
    const listeners = new Map();
    const listenersFor = (query) => {
        if (!listeners.has(query)) listeners.set(query, new Set());
        return listeners.get(query);
    };

    window.matchMedia = (query) => ({
        media: query,
        get matches() { return active.has(query); },
        addEventListener: (type, fn) => { if (type === 'change') listenersFor(query).add(fn); },
        removeEventListener: (type, fn) => { if (type === 'change') listenersFor(query).delete(fn); },
        addListener: (fn) => listenersFor(query).add(fn),
        removeListener: (fn) => listenersFor(query).delete(fn),
    });

    return {
        set(query, matches) {
            if (matches) active.add(query); else active.delete(query);
            act(() => listenersFor(query).forEach((fn) => fn({ matches, media: query })));
        },
        restore() {
            window.matchMedia = original;
        },
    };
}
