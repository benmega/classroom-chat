import { useState, useEffect, useCallback } from 'react';
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
    const [connectionCode, setConnectionCode] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Reset to page 1 when search changes
    useEffect(() => {
        setPage(1);
    }, [debouncedSearchTerm]);

    const fetchUsers = useCallback(async (targetPage = page) => {
        setIsRefreshing(true);
        try {
            let url = `/api/admin/users?page=${targetPage}&per_page=50`;
            if (debouncedSearchTerm) {
                url += `&search=${encodeURIComponent(debouncedSearchTerm)}`;
            }
            const response = await client.get(url);
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
    }, [page, debouncedSearchTerm]);

    useEffect(() => {
        fetchUsers(page);
    }, [fetchUsers, page]);

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

    const [parentChildren, setParentChildren] = useState([]);

    const fetchParentChildren = async (parentId) => {
        try {
            const response = await client.get(`/api/admin/parents/${parentId}/children`);
            if (response.data.success) {
                setParentChildren(response.data.children || []);
            }
        } catch {
            toast.error('Failed to load parent children.');
            setParentChildren([]);
        }
    };

    const handleToggleChildLink = async (parentId, studentId, isLinked) => {
        setFormLoading(true);
        try {
            const endpoint = isLinked ? 'unlink' : 'link';
            const response = await client.post(`/api/admin/parents/${parentId}/${endpoint}/${studentId}`);
            if (response.data.success) {
                toast.success(response.data.message);
                await fetchParentChildren(parentId);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to toggle student link.');
        } finally {
            setFormLoading(false);
        }
    };

    const fetchConnectionCard = async (studentId) => {
        setFormLoading(true);
        try {
            const response = await client.get(`/api/admin/user/${studentId}/connection_card`);
            setConnectionCode(response.data.data?.connection_code || response.data.connection_code);
            return true;
        } catch {
            toast.error('Failed to generate connection card.');
            return false;
        } finally {
            setFormLoading(false);
        }
    };

    const [classrooms, setClassrooms] = useState([]);
    const [classroomCards, setClassroomCards] = useState([]);
    const [isFetchingCards, setIsFetchingCards] = useState(false);

    const fetchClassrooms = useCallback(async () => {
        try {
            const response = await client.get('/api/admin/classrooms');
            setClassrooms(response.data.data?.classrooms || response.data.classrooms || []);
        } catch (error) {
            console.error('Error fetching classrooms:', error);
            toast.error('Failed to load classrooms list.');
        }
    }, []);

    const fetchClassroomCards = async (classroomId) => {
        setIsFetchingCards(true);
        try {
            const response = await client.get(`/api/admin/classrooms/${classroomId}/connection_cards`);
            setClassroomCards(response.data.data?.cards || response.data.cards || []);
            return true;
        } catch (error) {
            console.error('Error fetching cohort connection cards:', error);
            toast.error('Failed to load cohort connection cards.');
            setClassroomCards([]);
            return false;
        } finally {
            setIsFetchingCards(false);
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
        handleRemoveUser,
        parentChildren,
        fetchParentChildren,
        handleToggleChildLink,
        connectionCode,
        setConnectionCode,
        fetchConnectionCard,
        classrooms,
        fetchClassrooms,
        classroomCards,
        setClassroomCards,
        isFetchingCards,
        fetchClassroomCards,
        searchTerm,
        setSearchTerm
    };
};
