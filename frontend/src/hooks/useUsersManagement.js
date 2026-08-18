import { useState, useEffect, useCallback } from 'react';
import client from '../api/client';
import toast from 'react-hot-toast';

export const useUsersManagement = (role = '') => {
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
    const [stats, setStats] = useState({ online: 0, admins: 0, pending: 0 });
    const [connectionCode, setConnectionCode] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');

    // Excel-style column filters & sorting
    const [statusFilter, setStatusFilter] = useState([]); // subset of ['active', 'offline']
    const [accountTypeFilter, setAccountTypeFilter] = useState([]); // subset of ['admin', 'parent', 'student']
    const [sortBy, setSortBy] = useState('');
    const [sortDir, setSortDir] = useState('asc');

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 300);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    // Reset to page 1 when search or filters change
    useEffect(() => {
        setPage(1);
    }, [debouncedSearchTerm, statusFilter, accountTypeFilter, sortBy, sortDir]);

    const fetchUsers = useCallback(async (targetPage = page) => {
        setIsRefreshing(true);
        try {
            let url = `/api/admin/users?page=${targetPage}&per_page=50`;
            if (role) {
                url += `&role=${role}`;
            }
            if (debouncedSearchTerm) {
                url += `&search=${encodeURIComponent(debouncedSearchTerm)}`;
            }
            if (statusFilter.length > 0) {
                url += `&status=${statusFilter.join(',')}`;
            }
            if (accountTypeFilter.length > 0) {
                url += `&account_types=${accountTypeFilter.join(',')}`;
            }
            if (sortBy) {
                url += `&sort_by=${sortBy}&sort_dir=${sortDir}`;
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
                if (data.stats) setStats(data.stats);
            }
        } catch (error) {
            console.error('Error fetching users:', error);
            toast.error('Failed to load users list.');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [page, debouncedSearchTerm, role, statusFilter, accountTypeFilter, sortBy, sortDir]);

    useEffect(() => {
        fetchUsers(page);
    }, [fetchUsers, page]);

    const handleCreateUser = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const username = formData.get('username')?.trim() || '';
        const password = formData.get('password')?.trim() || '';
        formData.set('username', username);
        formData.set('password', password);
        
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
                
                setActiveModal(null);
                fetchUsers(page);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to adjust ducks.');
        } finally {
            setFormLoading(false);
        }
    };

    const handleAdjustPackets = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        if (!formData.get('amount')) {
            setFormErrors({ amount: 'Adjustment amount is required' });
            return;
        }

        setFormErrors({});
        setFormLoading(true);
        try {
            const response = await client.post('/api/admin/adjust_packets', formData);
            if (response.data.success) {
                
                setActiveModal(null);
                fetchUsers(page);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to adjust packets.');
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
                
                setActiveModal(null);
                fetchUsers(page);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to reset password.');
        } finally {
            setFormLoading(false);
        }
    };

    const handleSetDrawer = async (e, forceOverwrite = false) => {
        if (e && e.preventDefault) {
            e.preventDefault();
        }
        
        // Handle form data if it's an event, or extract it if we're calling recursively with the form element
        const formElement = e.target || e;
        const formData = new FormData(formElement);
        const username = formData.get('username');
        const drawer = formData.get('drawer');
        
        setFormLoading(true);
        try {
            const payload = { username, drawer };
            if (forceOverwrite) {
                payload.force = true;
            }
            
            const response = await client.post('/api/admin/set_drawer', payload);
            if (response.data) {
                
                setActiveModal(null);
                fetchUsers(page);
            }
        } catch (error) {
            const errorData = error.response?.data;
            if (errorData?.conflict && errorData?.current_owner) {
                // Duplicate drawer assignment detected
                const confirmed = window.confirm(`That drawer is already assigned to @${errorData.current_owner}. Do you want to take it over and remove that student's drawer assignment to move it over to this student, or cancel?`);
                if (confirmed) {
                    // recursively call with force=true, passing the original target
                    return handleSetDrawer(formElement, true);
                }
            } else {
                toast.error(errorData?.message || 'Failed to set drawer.');
            }
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
                
                fetchUsers(page);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to remove user.');
        }
    };

    const handleToggleChat = async (userId) => {
        try {
            const response = await client.post(`/api/admin/user/${userId}/toggle-chat`);
            
            
            // Optimistically update the specific user in the users array
            setUsers(prevUsers => 
                prevUsers.map(user => 
                    user.id === userId ? { ...user, can_chat: response.data.can_chat } : user
                )
            );
            
            // Optionally re-fetch to ensure consistency if other fields changed
            // fetchUsers(page);
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to toggle chat status.');
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
        stats,
        activeModal,
        setActiveModal,
        modalUser,
        setModalUser,
        formLoading,
        formErrors,
        fetchUsers,
        handleCreateUser,
        handleAdjustDucks,
        handleAdjustPackets,
        handleResetPassword,
        handleSetDrawer,
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
        setSearchTerm,
        handleToggleChat,
        statusFilter,
        setStatusFilter,
        accountTypeFilter,
        setAccountTypeFilter,
        sortBy,
        setSortBy,
        sortDir,
        setSortDir
    };
};
