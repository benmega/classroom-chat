export const getApiUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    if (path.startsWith('/static/')) return path;
    // Assets bundled with the frontend build (e.g. Vite's public/ dir) are
    // served from the frontend's own origin, not the backend API.
    if (path.startsWith('/images/')) return path;
    const baseUrl = import.meta.env.VITE_API_URL || '';
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    return `${normalizedBaseUrl}${normalizedPath}`;
};
