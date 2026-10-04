import { QueryClient } from '@tanstack/react-query';

// One client for the whole CRUD panel, so records and reference lookups fetched earlier are
// shown at once when the admin comes back to a resource, and refreshed in the background.
export const adminQueryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes
            gcTime: 15 * 60 * 1000,    // 15 minutes
            refetchOnWindowFocus: false,
            retry: false,
        },
    },
});

export default adminQueryClient;
