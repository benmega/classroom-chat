import { useState, useEffect, useCallback, useRef } from 'react';
import client from '../api/client';
import toast from 'react-hot-toast';
import { getErrorMessage } from '../utils/apiError';

export const useAdminDashboard = () => {
    const [dashboardData, setDashboardData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [activeModal, setActiveModal] = useState(null);
    const [formLoading, setFormLoading] = useState(false);
    const [pendingToggle, setPendingToggle] = useState(false);
    // The ref blocks a second click before React re-renders with the disabled button.
    const toggleInFlight = useRef(false);

    const [timeframe, setTimeframe] = useState(7);

    const fetchDashboardData = useCallback(async (days = timeframe) => {
        setIsRefreshing(true);
        try {
            const tzOffset = new Date().getTimezoneOffset();
            const response = await client.get(`/api/admin/dashboard?days=${days}&tz_offset=${tzOffset}`);
            if (response.data.status === 'success') {
                setDashboardData(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching admin data:', error);
            toast.error('Failed to load dashboard data.');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [timeframe]);

    useEffect(() => {
        fetchDashboardData(timeframe);
    }, [timeframe, fetchDashboardData]);

    const handleToggleMessages = async () => {
        // The endpoint flips the stored value on every call, so never overlap two.
        if (toggleInFlight.current) return;
        toggleInFlight.current = true;
        setPendingToggle(true);
        try {
            const response = await client.post('/api/admin/toggle-message-sending');
            if (response.data.success) {
                // Keep the toggle locked until the refetch shows the new state.
                await fetchDashboardData();
            }
        } catch (error) {
            toast.error(getErrorMessage(error, 'Failed to toggle messaging.'));
        } finally {
            toggleInFlight.current = false;
            setPendingToggle(false);
        }
    };

    const handleUpdateMultiplier = async (val) => {
        try {
            const response = await client.post('/api/admin/update_duck_multiplier', { multiplier: val });
            if (response.data.success) {
                
                fetchDashboardData();
            }
        } catch (error) {
            toast.error(getErrorMessage(error, 'Failed to update multiplier.'));
        }
    };

    const handleAddBannedWord = async (word, reason) => {
        const trimmed = word.trim();
        if (!trimmed) return false;
        
        try {
            setFormLoading(true);
            const formData = new FormData();
            formData.append('word', trimmed);
            formData.append('reason', reason);
            
            const response = await client.post('/api/admin/add-banned-word', formData);
            if (response.data.success) {
                
                fetchDashboardData();
                return true;
            }
        } catch (error) {
            toast.error(getErrorMessage(error, 'Failed to add word.'));
        } finally {
            setFormLoading(false);
        }
        return false;
    };

    return {
        dashboardData,
        isLoading,
        isRefreshing,
        activeModal,
        setActiveModal,
        formLoading,
        pendingToggle,
        timeframe,
        setTimeframe,
        fetchDashboardData,
        handleToggleMessages,
        handleUpdateMultiplier,
        handleAddBannedWord
    };
};
