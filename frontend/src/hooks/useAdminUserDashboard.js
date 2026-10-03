import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/client';
import toast from 'react-hot-toast';
import { showConfirm } from '../utils/confirm';
import { getErrorMessage } from '../utils/apiError';
import { useAdminUserActions } from './useAdminUserActions';

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
        } catch (error) {
            toast.error(getErrorMessage(error, 'Failed to preview chapter pass'));
        } finally {
            setPassChapterLoading(false);
        }
    };

    const handlePassChapterConfirm = async () => {
        const choice = await showConfirm("Pass this chapter? The student gets full credit for its levels, all achievements and certificates. Award the ducks for those levels?", { title: 'Pass Chapter', confirmText: 'Pass & award ducks', altText: 'Pass, no ducks', destructive: false });
        if (!choice) {
            return;
        }
        setPassChapterLoading(true);
        try {
            const res = await client.post(`/api/admin/user/${userId}/pass_chapter`, { course_id: selectedChapterId, award_ducks: choice === true });
            if (res.data.success) {
                
                setPassPreview(null);
                setSelectedChapterId('');
                fetchUser();
            }
        } catch (error) {
            toast.error(getErrorMessage(error, 'Failed to pass chapter'));
        } finally {
            setPassChapterLoading(false);
        }
    };

    const { adjustDucks, adjustPackets, resetPassword, removeUser } = useAdminUserActions({ setFormLoading });

    const handleAdjustDucks = async (e) => {
        e.preventDefault();
        const form = e.target;
        await adjustDucks(new FormData(form), () => {
            form.reset();
            fetchUser();
        });
    };

    const handleAdjustPackets = async (e) => {
        e.preventDefault();
        const form = e.target;
        await adjustPackets(new FormData(form), () => {
            form.reset();
            fetchUser();
        });
    };

    const handleSetDrawer = async (e) => {
        e.preventDefault();
        setFormLoading(true);
        const formData = new FormData(e.target);
        
        try {
            // set_drawer reads a JSON body, not form data.
            const res = await client.post('/api/admin/set_drawer', { username: user.username, drawer: formData.get('drawer') });
            if (res.status === 200) {
                
                fetchUser();
            }
        } catch (err) {
            toast.error(getErrorMessage(err, 'Failed to update drawer'));
        } finally {
            setFormLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        const form = e.target;
        await resetPassword({ ...Object.fromEntries(new FormData(form)), username: user.username }, () => form.reset());
    };

    const handleRemoveUser = async () => {
        await removeUser(user.username, () => navigate('/admin/users'));
    };

    const handleApproveUser = async () => {
        setFormLoading(true);
        try {
            const response = await client.post(`/api/admin/approve_user/${user.id}`);
            if (response.data.status === 'success') {
                
                fetchUser();
            }
        } catch (error) {
            toast.error(getErrorMessage(error, 'Failed to approve user.'));
        } finally {
            setFormLoading(false);
        }
    };

    const handleRejectUser = async () => {
        if (!await showConfirm('Are you sure you want to reject and delete this user?', { title: 'Reject User', confirmText: 'Reject & Delete', destructive: true })) return;
        setFormLoading(true);
        try {
            const response = await client.post(`/api/admin/reject_user/${user.id}`);
            if (response.data.status === 'success') {
                
                navigate('/admin/users');
            }
        } catch (error) {
            toast.error(getErrorMessage(error, 'Failed to reject user.'));
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
                
                fetchParentChildren();
            }
        } catch (error) {
            toast.error(getErrorMessage(error, `Failed to ${isLinked ? 'unlink' : 'link'} child`));
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
                
                fetchStudentParents();
            }
        } catch (error) {
            toast.error(getErrorMessage(error, `Failed to ${isLinked ? 'unlink' : 'link'} parent`));
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
                
                setSelectedTemplateName('');
                fetchUser();
            }
        } catch (error) {
            console.error('Assign error:', error);
            toast.error(getErrorMessage(error, 'Failed to assign project.'));
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id]);

    const handleUpdateUser = async (updatedFields) => {
        setFormLoading(true);
        try {
            const res = await client.put(`/api/admin/user/${userId}`, updatedFields);
            const responseData = res.data?.data || res.data;
            if (responseData.user || responseData.message) {
                
                if (responseData.user) {
                    setUser(responseData.user);
                } else {
                    fetchUser();
                }
            } else {
                toast.error(responseData.error || 'Failed to update user profile');
            }
        } catch (err) {
            toast.error(getErrorMessage(err, 'Failed to update user profile.'));
        } finally {
            setFormLoading(false);
        }
    };

    const handleGenerateManualCertificate = async (courseId = 'cs-1') => {
        setFormLoading(true);
        try {
            const response = await client.post(`/api/admin/user/${userId}/generate_certificate`, { course_id: courseId }, { responseType: 'blob' });
            
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            link.download = `${user.nickname || user.username}_${courseId}_Certificate.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            
            toast.success("Certificate generated successfully!");
        } catch (error) {
            console.error(error);
            toast.error("Failed to generate certificate.");
        } finally {
            setFormLoading(false);
        }
    };


    return {
        user, isLoading, formLoading, parentChildren, connectionCode, allUsers,
        showNewPassword, setShowNewPassword, showConfirmPassword, setShowConfirmPassword,
        childSearchQuery, setChildSearchQuery, studentParents, parentSearchQuery, setParentSearchQuery,
        templates, selectedTemplateName, setSelectedTemplateName, templatesSaving,
        passChapterLoading, selectedChapterId, setSelectedChapterId, passPreview, setPassPreview,
        fetchUser, handlePassChapterPreview, handlePassChapterConfirm, handleAdjustDucks,
        handleAdjustPackets, handleSetDrawer, handleResetPassword, handleRemoveUser,
        handleApproveUser, handleRejectUser, handleToggleChildLink, handleToggleParentLink,
        handleAssignProjectSubmit, handleUpdateUser, handleGenerateManualCertificate
    };
};

