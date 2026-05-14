import { useState, useEffect } from 'react';
import client from '../api/client';
import toast from 'react-hot-toast';

export const useUsersManagement = () => {
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalUsers, setTotalUsers] = useState(0);
    const [activeModal, setActiveModal] = useState(null);
    const [modalUser, setModalUser] = useState(null);
    const [formLoading, setFormLoading] = useState(false);
    const [formErrors, setFormErrors] = useState({});

    const fetchUsers = async (targetPage = page) => {
        setIsRefreshing(true);
        try {
            const response = await client.get(`/api/admin/users?page=${targetPage}&per_page=50`);
            const data = response.data;
            
            if (Array.isArray(data)) {
                setUsers(data);
                setTotalUsers(data.length);
                setTotalPages(1);
            } else {
                setUsers(data.users || []);
                setTotalUsers(data.total || 0);
                setTotalPages(data.pages || 1);
                setPage(data.current_page || 1);
            }
        } catch (error) {
            console.error('Error fetching users:', error);
            toast.error('Failed to load users list.');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleCreateUser = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const username = formData.get('username');
        const password = formData.get('password');
        
        const errors = {};
        if (!username) errors.username = 'Username is required';
        if (!password) errors.password = 'Initial password is required';
        
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
                fetchUsers(page);
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
        
        if (!formData.get('amount')) {
            setFormErrors({ amount: 'Adjustment amount is required' });
            return;
        }

        setFormErrors({});
        setFormLoading(true);
        try {
            const response = await client.post('/api/admin/adjust_ducks', formData);
            if (response.data.success) {
                toast.success(response.data.message);
                setActiveModal(null);
                fetchUsers(page);
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
                fetchUsers(page);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to reset password.');
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
                fetchUsers(page);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to remove user.');
        }
    };

    return {
        users,
        isLoading,
        isRefreshing,
        page,
        setPage,
        totalPages,
        totalUsers,
        activeModal,
        setActiveModal,
        modalUser,
        setModalUser,
        formLoading,
        formErrors,
        fetchUsers,
        handleCreateUser,
        handleAdjustDucks,
        handleResetPassword,
        handleRemoveUser
    };
};
