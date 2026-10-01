// Returns a URL safe to use as an href/src (http/https only), or null.
// Scheme-less inputs such as "www.example.com" or "example.com/x" get "https://".
export const safeUrl = (url) => {
    if (typeof url !== 'string') return null;
    const trimmed = url.trim();
    if (!trimmed) return null;

    if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) {
        // Has a scheme; "host:port" without scheme is not expected here.
        return /^https?:\/\//i.test(trimmed) ? trimmed : null;
    }
    if (trimmed.startsWith('//')) return null;
    if (/^www\./i.test(trimmed) || /^[a-z0-9-]+(\.[a-z0-9-]+)+([/?#:].*)?$/i.test(trimmed)) {
        return `https://${trimmed}`;
    }
    return null;
};

export default safeUrl;
