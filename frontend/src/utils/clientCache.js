const cache = new Map();
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

export const get = (key) => {
    const item = cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiresAt) {
        cache.delete(key);
        return null;
    }
    return item.data;
};

export const has = (key) => {
    return get(key) !== null;
};

export const set = (key, data, ttlMs = DEFAULT_TTL) => {
    cache.set(key, {
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + ttlMs,
    });
};

export const invalidate = (keyPrefix) => {
    if (!keyPrefix) return;
    for (const key of cache.keys()) {
        if (key === keyPrefix || key.startsWith(keyPrefix)) {
            cache.delete(key);
        }
    }
};

export const clear = () => {
    cache.clear();
};

export const clientCache = {
    get,
    has,
    set,
    invalidate,
    clear,
};

export default clientCache;
