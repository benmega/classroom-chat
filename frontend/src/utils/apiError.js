// Backend routes reply with two different envelope shapes:
//   { success: false, message | error: string }                — most routes
//   { status: 'error', data: null, error: string | { error }  } — routes using @api_response
// This normalizes both into a single display string.
export const getErrorMessage = (error, fallback) => {
    const data = error?.response?.data;
    if (!data) return fallback;

    const detail = data.error ?? data.message;
    if (typeof detail === 'string') return detail;
    if (detail && typeof detail === 'object') {
        return detail.error || detail.message || fallback;
    }
    return fallback;
};
