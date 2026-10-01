// Backend routes reply with two different envelope shapes:
//   { success: false, message | error: string }                — most routes
//   { status: 'error', data: null, error: string, ...extra }   — routes using @api_response
// A few failures (proxy / framework error pages) arrive as a bare string body.
// This normalizes all of them into a single display string. It always returns a
// string (or the caller's fallback), so callers can safely branch on it with
// .includes() / === without guarding against objects.
const asText = (value) => (typeof value === 'string' && value.trim() ? value : null);

export const getErrorMessage = (error, fallback) => {
    const data = error?.response?.data;
    if (!data) return fallback;

    if (typeof data === 'string') {
        // An HTML error page is not something to show in a toast.
        return asText(data) && !data.trimStart().startsWith('<') ? data : fallback;
    }

    return asText(data.error) ?? asText(data.message) ?? fallback;
};
