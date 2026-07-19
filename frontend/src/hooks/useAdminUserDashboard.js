import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import toast from 'react-hot-toast';

export const useAdminUserDashboard = (userId) => {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [formLoading, setFormLoading] = useState(false);
    const [parentChildren, setParentChildren] = useState([]);
    const [connectionCode, setConnectionCode] = useState(null);
    const [allUsers, setAllUsers] = useState([]);

    // Inline forms/views state
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [childSearchQuery, setChildSearchQuery] = useState('');
    const [studentParents, setStudentParents] = useState([]);
    const [parentSearchQuery, setParentSearchQuery] = useState('');

    // Assign project state
    const [templates, setTemplates] = useState({});
    const [selectedTemplateName, setSelectedTemplateName] = useState('');
    const [templatesSaving, setTemplatesSaving] = useState(false);

    // Pass chapter state
    const [passChapterLoading, setPassChapterLoading] = useState(false);
    const [selectedChapterId, setSelectedChapterId] = useState('');
    const [passPreview, setPassPreview] = useState(null);

    const fetchUser = async () => {
        setIsLoading(true);
        try {
            const res = await client.get(`/api/admin/user/${userId}`);
            const fetchedUser = res.data.user;
            setUser(fetchedUser);
        } catch {
            toast.error('Failed to load user details.');
            navigate('/admin/users');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchAllUsers = async () => {
        try {
            const res = await client.get(`/api/admin/users?per_page=1000`);
            setAllUsers(res.data.users || []);
        } catch (err) {
            console.error("Failed to fetch all users for parent dropdown", err);
        }
    };

    const fetchTemplates = async () => {
        try {
            const response = await client.get('/api/project-templates');
            if (response.data?.data?.templates) {
                setTemplates(response.data.data.templates);
            }
        } catch {
            toast.error('Failed to load project templates.');
        }
    };

    const handlePassChapterPreview = async (e) => {
        e.preventDefault();
        setPassChapterLoading(true);
        try {
            const res = await client.post(`/api/admin/user/${userId}/pass_chapter_preview`, { course_id: selectedChapterId });
            if (res.data.success) {
                setPassPreview(res.data.preview);
            }
        } catch {
            toast.error('Failed to preview chapter pass');
        } finally {
            setPassChapterLoading(false);
        }
    };

    const handlePassChapterConfirm = async () => {
        if (!window.confirm("Are you sure you want to pass this chapter? They will receive all achievements, certificates, and ducks.")) {
            return;
        }
        setPassChapterLoading(true);
        try {
            const res = await client.post(`/api/admin/user/${userId}/pass_chapter`, { course_id: selectedChapterId });
            if (res.data.success) {
                toast.success(res.data.message);
                setPassPreview(null);
                setSelectedChapterId('');
                fetchUser();
            }
        } catch {
            toast.error('Failed to pass chapter');
        } finally {
            setPassChapterLoading(false);
        }
    };

    const handleAdjustDucks = async (e) => {
        e.preventDefault();
        setFormLoading(true);
        const formData = new FormData(e.target);
        
        try {
            const res = await client.post('/api/admin/adjust_ducks', formData);
            if (res.data.success) {
                toast.success(res.data.message);
                e.target.reset();
                fetchUser();
            } else {
                toast.error(res.data.message || "Failed to adjust ducks");
            }
        } catch (err) {
            toast.error(err.response?.data?.error || 'An error occurred.');
        } finally {
            setFormLoading(false);
        }
    };

    const handleAdjustPackets = async (e) => {
        e.preventDefault();
        setFormLoading(true);
        const formData = new FormData(e.target);
        
        try {
            const res = await client.post('/api/admin/adjust_packets', formData);
            if (res.data.success) {
                toast.success(res.data.message);
                e.target.reset();
                fetchUser();
            } else {
                toast.error(res.data.message || "Failed to adjust packets");
            }
        } catch (err) {
            toast.error(err.response?.data?.error || 'An error occurred.');
        } finally {
            setFormLoading(false);
        }
    };

    const handleSetDrawer = async (e) => {
        e.preventDefault();
        setFormLoading(true);
        const formData = new FormData(e.target);
        formData.append('username', user.username);
        
        try {
            const res = await client.post('/api/admin/set_drawer', formData);
            if (res.status === 200) {
                toast.success(res.data.message || 'Drawer updated');
                fetchUser();
            }
        } catch (err) {
            toast.error(err.response?.data || 'Failed to update drawer');
        } finally {
            setFormLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setFormLoading(true);
        const formData = new FormData(e.target);
        
        try {
            const res = await client.post('/api/admin/reset_password', formData);
            if (res.data.success) {
                toast.success(res.data.message);
                e.target.reset();
            } else {
                toast.error(res.data.message || "Failed to reset password");
            }
        } catch (err) {
            toast.error(err.response?.data?.error || 'An error occurred.');
        } finally {
            setFormLoading(false);
        }
    };

    const handleRemoveUser = async () => {
        if (!window.confirm(`Are you sure you want to completely remove ${user.username}? This cannot be undone.`)) {
            return;
        }
        try {
            const formData = new FormData();
            formData.append('username', user.username);
            const res = await client.post('/api/admin/remove_user', formData);
            if (res.data.success) {
                toast.success(res.data.message);
                navigate('/admin/users');
            } else {
                toast.error(res.data.message || "Failed to remove user");
            }
        } catch (err) {
            toast.error(err.response?.data?.error || 'An error occurred.');
        }
    };

    const handleApproveUser = async () => {
        setFormLoading(true);
        try {
            const response = await client.post(`/api/admin/approve_user/${user.id}`);
            if (response.data.status === 'success') {
                toast.success(response.data.data.message);
                fetchUser();
            }
        } catch {
            toast.error('Failed to approve user.');
        } finally {
            setFormLoading(false);
        }
    };

    const handleRejectUser = async () => {
        if (!window.confirm('Are you sure you want to reject and delete this user?')) return;
        setFormLoading(true);
        try {
            const response = await client.post(`/api/admin/reject_user/${user.id}`);
            if (response.data.status === 'success') {
                toast.success(response.data.data.message);
                navigate('/admin/users');
            }
        } catch {
            toast.error('Failed to reject user.');
        } finally {
            setFormLoading(false);
        }
    };

    const fetchParentChildren = async () => {
        try {
            const response = await client.get(`/api/admin/parents/${user.id}/children`);
            if (response.data.success) {
                setParentChildren(response.data.children);
            }
        } catch {
            toast.error('Failed to fetch parent children');
        }
    };

    const handleToggleChildLink = async (childId, isLinked) => {
        setFormLoading(true);
        try {
            const endpoint = isLinked ? 'unlink' : 'link';
            const response = await client.post(`/api/admin/parents/${user.id}/${endpoint}/${childId}`);
            if (response.data.success) {
                toast.success(`Successfully ${isLinked ? 'unlinked' : 'linked'} child account`);
                fetchParentChildren();
            } else {
                toast.error(response.data.message || `Failed to ${endpoint} child`);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'An error occurred');
        } finally {
            setFormLoading(false);
        }
    };

    const fetchStudentParents = async () => {
        try {
            const response = await client.get(`/api/admin/students/${userId}/parents`);
            if (response.data.success) {
                setStudentParents(response.data.parents || []);
            }
        } catch {
            toast.error('Failed to fetch student parents');
        }
    };

    const handleToggleParentLink = async (parentId, isLinked) => {
        setFormLoading(true);
        try {
            const endpoint = isLinked ? 'unlink' : 'link';
            const response = await client.post(`/api/admin/parents/${parentId}/${endpoint}/${user.id}`);
            if (response.data.success) {
                toast.success(`Successfully ${isLinked ? 'unlinked' : 'linked'} parent account`);
                fetchStudentParents();
            } else {
                toast.error(response.data.message || `Failed to ${endpoint} parent`);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'An error occurred');
        } finally {
            setFormLoading(false);
        }
    };

    const handleAssignProjectSubmit = async (e) => {
        e.preventDefault();
        if (!selectedTemplateName) {
            toast.error('Please select a project template.');
            return;
        }

        setTemplatesSaving(true);
        const template = templates[selectedTemplateName];
        const formData = new FormData();
        formData.append('name', selectedTemplateName);
        formData.append('description', template?.description || '');
        formData.append('student_id', user.id);

        try {
            const response = await client.post('/user/project/new', formData);
            if (response.data.status === 'success') {
                toast.success(`Assigned ${selectedTemplateName} to ${user.nickname || user.username}!`);
                setSelectedTemplateName('');
                fetchUser();
            } else {
                toast.error(response.data.error || 'Failed to assign project.');
            }
        } catch (error) {
            console.error('Assign error:', error);
            toast.error(error.response?.data?.error || 'An error occurred.');
        } finally {
            setTemplatesSaving(false);
        }
    };

    const fetchConnectionCode = async () => {
        try {
            const response = await client.get(`/api/admin/user/${user.id}/connection_card`);
            if (response.data.status === 'success') {
                setConnectionCode(response.data.data.connection_code);
            }
        } catch (error) {
            console.error('Failed to fetch connection code', error);
        }
    };

    useEffect(() => {
        fetchUser();
    }, [userId]);

    useEffect(() => {
        if (user) {
            if (user.role === 'parent') {
                fetchAllUsers();
                fetchParentChildren();
            } else if (user.role === 'student') {
                fetchAllUsers();
                fetchTemplates();
                fetchConnectionCode();
                fetchStudentParents();
            }
        }
    }, [user?.id]);

    return {
        user, isLoading, formLoading, parentChildren, connectionCode, allUsers,
        showNewPassword, setShowNewPassword, showConfirmPassword, setShowConfirmPassword,
        childSearchQuery, setChildSearchQuery, studentParents, parentSearchQuery, setParentSearchQuery,
        templates, selectedTemplateName, setSelectedTemplateName, templatesSaving,
        passChapterLoading, selectedChapterId, setSelectedChapterId, passPreview, setPassPreview,
        fetchUser, handlePassChapterPreview, handlePassChapterConfirm, handleAdjustDucks,
        handleAdjustPackets, handleSetDrawer, handleResetPassword, handleRemoveUser,
        handleApproveUser, handleRejectUser, handleToggleChildLink, handleToggleParentLink,
        handleAssignProjectSubmit
    };
};
