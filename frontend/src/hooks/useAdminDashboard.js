import { useState, useEffect } from 'react';
import client from '../api/client';
import toast from 'react-hot-toast';

export const useAdminDashboard = () => {
    const [dashboardData, setDashboardData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [activeModal, setActiveModal] = useState(null);
    const [modalUser, setModalUser] = useState(null);
    const [formLoading, setFormLoading] = useState(false);
    const [formErrors, setFormErrors] = useState({});

    const [timeframe, setTimeframe] = useState(7);

    const fetchDashboardData = async (days = timeframe) => {
        setIsRefreshing(true);
        try {
            const response = await client.get(`/api/admin/dashboard?days=${days}`);
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
    };

    useEffect(() => {
        fetchDashboardData(timeframe);
    }, [timeframe]);

    useEffect(() => {
        setFormErrors({});
    }, [activeModal]);

    const handleToggleAI = async () => {
        try {
            const response = await client.post('/api/admin/toggle-ai');
            if (response.data.success) {
                toast.success(response.data.message);
                fetchDashboardData();
            }
        } catch {
            toast.error('Failed to toggle AI.');
        }
    };

    const handleToggleMessages = async () => {
        try {
            const response = await client.post('/api/admin/toggle-message-sending');
            if (response.data.success) {
                toast.success(response.data.message);
                fetchDashboardData();
            }
        } catch {
            toast.error('Failed to toggle messaging.');
        }
    };

    const handleUpdateMultiplier = async (val) => {
        try {
            const response = await client.post('/api/admin/update_duck_multiplier', { multiplier: val });
            if (response.data.success) {
                toast.success('Multiplier updated!');
                fetchDashboardData();
            }
        } catch {
            toast.error('Failed to update multiplier.');
        }
    };

    const handleAddBannedWord = async (word, reason) => {
        if (!word.trim()) return;
        
        try {
            const formData = new FormData();
            formData.append('word', word);
            formData.append('reason', reason);
            
            const response = await client.post('/api/admin/add-banned-word', formData);
            if (response.data.success) {
                toast.success(response.data.message);
                fetchDashboardData();
                return true;
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to add word.');
        }
        return false;
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const username = formData.get('username');
        const password = formData.get('password');
        
        const errors = {};
        if (!username) {
            errors.username = 'Username is required';
        } else if (!/^[a-z0-9_]{3,30}$/.test(username)) {
            errors.username = '3-30 chars, lowercase, numbers, or underscores.';
        }
        
        if (!password) {
            errors.password = 'Initial password is required';
        } else if (password.length < 6) {
            errors.password = 'Password must be at least 6 characters.';
        }
        
        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            return;
        }
        
        setFormErrors({});
        setFormLoading(true);
        try {
            const response = await client.post('/api/admin/create_user', formData);
            if (response.data.success) {
                toast.success(response.data.message);
                setActiveModal(null);
                fetchDashboardData();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to create user.');
        } finally {
            setFormLoading(false);
        }
    };

    const handleAdjustDucks = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        const errors = {};
        if (!formData.get('amount')) {
            errors.amount = 'Adjustment amount is required';
        }
        
        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            return;
        }

        setFormErrors({});
        setFormLoading(true);
        try {
            const response = await client.post('/api/admin/adjust_ducks', formData);
            if (response.data.success) {
                toast.success(response.data.message);
                setActiveModal(null);
                fetchDashboardData();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to adjust ducks.');
        } finally {
            setFormLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData);
        
        const errors = {};
        if (!data.new_password) errors.new_password = 'New password is required';
        if (!data.confirm_password) errors.confirm_password = 'Confirmation is required';
        
        if (data.new_password && data.confirm_password && data.new_password !== data.confirm_password) {
            errors.confirm_password = 'Passwords do not match';
        }
        
        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            return;
        }

        setFormErrors({});
        setFormLoading(true);
        try {
            const response = await client.post('/api/admin/reset_password', {
                username: data.username,
                new_password: data.new_password
            });
            if (response.data.success) {
                toast.success(response.data.message);
                setActiveModal(null);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to reset password.');
        } finally {
            setFormLoading(false);
        }
    };

    const handleStartConversation = async (e) => {
        e.preventDefault();
        const data = new FormData(e.target);
        setFormLoading(true);
        try {
            const response = await client.post('/message/start_conversation', data);
            if (response.status === 201) {
                toast.success('New conversation started!');
                setActiveModal(null);
            }
        } catch {
            toast.error('Failed to start conversation.');
        } finally {
            setFormLoading(false);
        }
    };

    const handleRemoveUser = async (username) => {
        if (!window.confirm(`Are you sure you want to PERMANENTLY remove @${username}?`)) return;
        
        try {
            const formData = new FormData();
            formData.append('username', username);
            const response = await client.post('/api/admin/remove_user', formData);
            if (response.data.success) {
                toast.success(response.data.message);
                fetchDashboardData();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to remove user.');
        }
    };

    return {
        dashboardData,
        isLoading,
        isRefreshing,
        activeModal,
        setActiveModal,
        modalUser,
        setModalUser,
        formLoading,
        formErrors,
        timeframe,
        setTimeframe,
        fetchDashboardData,
        handleToggleAI,
        handleToggleMessages,
        handleUpdateMultiplier,
        handleAddBannedWord,
        handleCreateUser,
        handleAdjustDucks,
        handleResetPassword,
        handleStartConversation,
        handleRemoveUser
    };
};
