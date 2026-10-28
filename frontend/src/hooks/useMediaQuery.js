import { useCallback, useSyncExternalStore } from 'react';

const getList = (query) => (
    typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(query) : null
);

/**
 * Whether a CSS media query matches right now, and re-renders when that changes.
 * Reports false where `matchMedia` does not exist (older test environments, server rendering).
 */
const useMediaQuery = (query) => {
    const subscribe = useCallback((notify) => {
        const list = getList(query);
        if (!list) return () => {};
        list.addEventListener('change', notify);
        return () => list.removeEventListener('change', notify);
    }, [query]);

    return useSyncExternalStore(subscribe, () => getList(query)?.matches ?? false, () => false);
};

export default useMediaQuery;
