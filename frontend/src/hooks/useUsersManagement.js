import { useState, useEffect, useCallback, useRef } from 'react';
import client from '../api/client';
import { showConfirm } from '../utils/confirm';
import { getErrorMessage } from '../utils/apiError';
import { useAdminUserActions } from './useAdminUserActions';
import toast from 'react-hot-toast';
import adminCache from '../utils/adminCache';

export const buildUsersCacheKey = (role, page, search, status, accountTypes, sortBy, sortDir) => {
    const statusPart = Array.isArray(status) ? status.join(',') : (status || '');
    const accountPart = Array.isArray(accountTypes) ? accountTypes.join(',') : (accountTypes || '');
    return `admin_users_${role || ''}_${page}_${search || ''}_${statusPart}_${accountPart}_${sortBy || ''}_${sortDir || ''}`;
};

export const USERS_PER_PAGE = 50;

export const useUsersManagement = (role = '') => {
    const initialKey = buildUsersCacheKey(role, 1, '', [], [], '', 'asc');
    const initialCached = adminCache.get(initialKey);
    const initialUsers = initialCached?.users || (Array.isArray(initialCached) ? initialCached : []);
    const initialTotalUsers = initialCached?.total !== undefined ? initialCached.total : (Array.isArray(initialCached) ? initialCached.length : 0);
    const initialTotalPages = initialCached?.pages || 1;
    const initialStats = initialCached?.stats || { online: 0, admins: 0, pending: 0 };

    const [users, setUsers] = useState(initialUsers);
    const [isLoading, setIsLoading] = useState(!initialCached);
    const [isRefreshing, setIsRefreshing] = useState(!!initialCached);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(initialTotalPages);
    const [totalUsers, setTotalUsers] = useState(initialTotalUsers);
    const [activeModal, setActiveModal] = useState(null);
    const [modalUser, setModalUser] = useState(null);
    const [formLoading, setFormLoading] = useState(false);
    const [formErrors, setFormErrors] = useState({});
    const [stats, setStats] = useState(initialStats);
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

    useEffect(() => {
        setPage(1);
    }, [debouncedSearchTerm, statusFilter, accountTypeFilter, sortBy, sortDir]);

    // Search, filters, sort and page each start a request, and answers can arrive in any order.
    // Only the latest request may update the list, or an older answer would overwrite a newer one.
    const latestRequestRef = useRef(0);

    const fetchUsers = useCallback(async (targetPage = page) => {
        const requestId = ++latestRequestRef.current;
        const isLatest = () => requestId === latestRequestRef.current;
        setIsRefreshing(true);
        try {
            let url = `/api/admin/users?page=${targetPage}&per_page=${USERS_PER_PAGE}`;
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
            if (!isLatest()) return;
            const data = response.data;
            
            if (Array.isArray(data)) {
                setUsers(data);
                setTotalUsers(data.length);
                setTotalPages(1);
            } else {
                setUsers(data.users || []);
                setTotalUsers(data.total || 0);
                setTotalPages(data.pages || 1);
                // The page is not read back from the response: the server only echoes the one asked for,
                // and setting it here would re-run the page effect and request the same page twice.
                if (data.stats) setStats(data.stats);
            }
        } catch (error) {
            if (!isLatest()) return;
            console.error('Error fetching users:', error);
            toast.error('Failed to load users list.');
        } finally {
            if (isLatest()) {
                setIsLoading(false);
                setIsRefreshing(false);
            }
        }
    }, [page, debouncedSearchTerm, role, statusFilter, accountTypeFilter, sortBy, sortDir]);

    useEffect(() => {
        fetchUsers(page);
    }, [fetchUsers, page]);

    const { createUser, adjustDucks, adjustPackets, resetPassword, removeUser } = useAdminUserActions({ setFormLoading, setFormErrors });

    // After a modal action succeeds: close the modal and reload the current page.
    const closeAndRefresh = () => {
        setActiveModal(null);
        fetchUsers(page);
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        await createUser(new FormData(e.target), closeAndRefresh);
    };

    const handleAdjustDucks = async (e) => {
        e.preventDefault();
        await adjustDucks(new FormData(e.target), closeAndRefresh);
    };

    const handleAdjustPackets = async (e) => {
        e.preventDefault();
        await adjustPackets(new FormData(e.target), closeAndRefresh);
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        await resetPassword(Object.fromEntries(new FormData(e.target)), closeAndRefresh);
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
                adminCache.invalidate('admin_users');
                setActiveModal(null);
                fetchUsers(page);
            }
        } catch (error) {
            // set_drawer is an @api_response route, so the conflict details sit next to `error`.
            const conflict = error.response?.data;
            if (conflict?.conflict && conflict?.current_owner) {
                // Duplicate drawer assignment detected
                const confirmed = await showConfirm(`That drawer is already assigned to @${conflict.current_owner}. Do you want to take it over and remove that student's drawer assignment to move it over to this student, or cancel?`, { title: 'Drawer Conflict', confirmText: 'Take Over', destructive: true });
                if (confirmed) {
                    // recursively call with force=true, passing the original target
                    return handleSetDrawer(formElement, true);
                }
            } else {
                toast.error(getErrorMessage(error, 'Failed to set drawer.'));
            }
        } finally {
            setFormLoading(false);
        }
    };

    const handleRemoveUser = async (username) => {
        await removeUser(username, () => fetchUsers(page));
    };

    const handleToggleChat = async (userId) => {
        try {
            const response = await client.post(`/api/admin/user/${userId}/toggle-chat`);
            // The cached lists hold the old value
            adminCache.invalidate('admin_users');

            // toggle-chat is an @api_response route, so the new value sits under `data`.
            const canChat = response.data.data?.can_chat;
            // Optimistically update the specific user in the users array
            setUsers(prevUsers =>
                prevUsers.map(user =>
                    user.id === userId ? { ...user, can_chat: canChat } : user
                )
            );

            // Optionally re-fetch to ensure consistency if other fields changed
            // fetchUsers(page);
        } catch (error) {
            toast.error(getErrorMessage(error, 'Failed to toggle chat status.'));
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
                adminCache.invalidate('admin_users');
                await fetchParentChildren(parentId);
            }
        } catch (error) {
            toast.error(getErrorMessage(error, 'Failed to toggle student link.'));
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
