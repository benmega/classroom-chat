// Single reader of VITE_API_URL (the backend origin when the frontend is hosted
// separately, e.g. the S3/CloudFront build). Unset means same origin, which is
// the Vite proxy in development. Returns '' or the URL without a trailing slash.
export const getApiBaseUrl = () => (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

// Like getApiBaseUrl, but always absolute: a same-origin (empty or relative) base
// is prefixed with this page's origin. For URLs used outside axios, such as the
// Socket.IO endpoint and links that are embedded in bookmarklets.
export const getAbsoluteApiBaseUrl = () => {
    const baseUrl = getApiBaseUrl();
    return baseUrl.startsWith('http') ? baseUrl : window.location.origin + baseUrl;
};

export const getApiUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    if (path.startsWith('/static/')) return path;
    // Assets bundled with the frontend build (e.g. Vite's public/ dir) are
    // served from the frontend's own origin, not the backend API.
    if (path.startsWith('/images/')) return path;
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${getApiBaseUrl()}${normalizedPath}`;
};
