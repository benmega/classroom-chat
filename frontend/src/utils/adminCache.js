import clientCache, { get, has, set, invalidate, clear } from './clientCache';

export { get, has, set, invalidate, clear };
export const adminCache = clientCache;
export default adminCache;
