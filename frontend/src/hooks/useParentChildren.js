import { useState, useEffect } from 'react';
import client from '../api/client';

// Fetches the parent's linked children; does nothing unless isParent.
const useParentChildren = (isParent) => {
    const [children, setChildren] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!isParent) return;

        const controller = new AbortController();
        setIsLoading(true);
        setError(null);

        const fetchChildren = async () => {
            try {
                const response = await client.get('/api/parents/children', {
                    signal: controller.signal,
                });
                setChildren(response.data.data?.children || response.data.children || []);
            } catch (err) {
                if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') return;
                console.error('Failed to load children:', err);
                setError('Failed to load children');
            } finally {
                setIsLoading(false);
            }
        };

        fetchChildren();
        return () => controller.abort();
    }, [isParent]);

    return { children, isLoading, error };
};

export default useParentChildren;
