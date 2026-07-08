import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import client from '../../api/client';
import toast from 'react-hot-toast';
import { 
    ArrowUpCircle, Package, Key, Trash2, 
    Users as UsersIcon, ChevronLeft, Shield, FolderPlus,
    Activity, Star, Eye, EyeOff, Check, Plus
} from 'lucide-react';
import SmartImage from '../../components/common/SmartImage';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import Skeleton from '../../components/common/Skeleton';
import { getApiUrl } from '../../utils/apiUrl';
import './AdminUserDashboard.css';

const AdminUserDashboard = () => {
    const { userId } = useParams();
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

    // Action Handlers
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

    if (isLoading) {
        return (
            <div className="admin-user-dashboard-loading">
                <AdminPageHeader title="Loading User Dashboard..." />
                <div className="hud-skeleton">
                    <Skeleton height="80px" />
                </div>
                <div className="controls-grid-skeleton">
                    <Skeleton height="200px" />
                    <Skeleton height="200px" />
                    <Skeleton height="200px" />
                </div>
            </div>
        );
    }

    if (!user) return null;

    return (
        <div className="admin-user-dashboard">
            {!user.is_approved && !user.is_admin && (
                <div className="pending-approval-banner">
                    <div className="banner-text">
                        <strong>Pending Approval:</strong> This user has registered and is awaiting access approval.
                    </div>
                    <div className="banner-actions">
                        <button className="btn-approve-banner" onClick={handleApproveUser} disabled={formLoading}>
                            Approve Account
                        </button>
                        <button className="btn-reject-banner" onClick={handleRejectUser} disabled={formLoading}>
                            Reject & Delete
                        </button>
                    </div>
                </div>
            )}
            {/* Horizontal Header HUD */}
            <div className="admin-user-hud">
                <div className="hud-left">
                    <button className="back-btn" onClick={() => navigate('/admin/users')}>
                        <ChevronLeft size={20} />
                    </button>
                    <SmartImage 
                        src={user.profile_picture ? getApiUrl(`/user/profile_pictures/${user.profile_picture}`) : ''} 
                        alt="" 
                        className="hud-avatar-small"
                        fallbackType="avatar"
                    />
                    <div className="hud-identity">
                        <div className="hud-names">
                            <h2>{user.nickname || user.username}</h2>
                            <span className="hud-handle">@{user.username}</span>
                        </div>
                        <div className="hud-badges">
                            {user.is_admin ? (
                                <span className="user-role-badge admin"><Shield size={10} /> Admin</span>
                            ) : user.role === 'parent' ? (
                                <span className="user-role-badge parent">Parent</span>
                            ) : (
                                <span className="user-role-badge student">Student</span>
                            )}
                            <span className={`status-badge ${user.is_online ? 'online' : 'offline'}`}>
                                {user.is_online ? 'Active' : 'Offline'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="hud-stats-grid">
                    <div className="hud-stat-box">
                        <span className="lbl">Ducks</span>
                        <span className="val ducks">🦆 {(user.duck_balance ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="hud-stat-box">
                        <span className="lbl">Packets</span>
                        <span className="val packets" style={{ color: (user.packets < 0 ? 'var(--error-color, #ff4444)' : '') }}>
                            📦 {(user.packets ?? 0).toLocaleString(undefined, { maximumFractionDigits: 3 })}
                        </span>
                    </div>
                    <div className="hud-stat-box">
                        <span className="lbl">Level</span>
                        <span className="val level"><Star size={14} /> {user.total_levels || 0}</span>
                    </div>
                </div>
            </div>

            {/* Grid of Control Panels */}
            <div className="admin-user-controls-grid">

                {/* Activity & Status */}
                <div className="control-panel-card">
                    <h3><Activity size={18} /> Activity</h3>
                    <div className="panel-forms">
                        <div className="activity-info-block">
                            <div className="activity-row">
                                <span className="lbl">Status</span>
                                <span className={`val ${user.is_online ? 'active' : 'idle'}`}>
                                    {user.is_online ? 'Active Now' : 'Offline'}
                                </span>
                            </div>
                            <div className="activity-row">
                                <span className="lbl">Current Task</span>
                                <span className="val">{user.current_activity || 'None'}</span>
                            </div>
                            <div className="activity-row">
                                <span className="lbl">Last Active</span>
                                <span className="val">
                                    {user.last_activity_time 
                                        ? new Date(user.last_activity_time).toLocaleString() 
                                        : 'Never'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Panel 1: Economy */}
                <div className="control-panel-card">
                    <h3><Activity size={20} /> Economy</h3>
                    <div className="panel-forms">
                        <form onSubmit={handleAdjustDucks} className="action-form-inline" noValidate>
                            <input type="hidden" name="username" value={user.username} />
                            <label>Ducks</label>
                            <div className="input-group">
                                <input type="number" name="amount" step="any" placeholder="+ / -" required />
                                <button type="submit" className="btn-action primary" disabled={formLoading}>
                                    {formLoading ? '...' : <Check size={18} />}
                                </button>
                            </div>
                        </form>
                        <form onSubmit={handleAdjustPackets} className="action-form-inline" noValidate>
                            <input type="hidden" name="username" value={user.username} />
                            <label>Packets</label>
                            <div className="input-group">
                                <input type="number" name="amount" step="any" placeholder="+ / -" required />
                                <button type="submit" className="btn-action primary" disabled={formLoading}>
                                    {formLoading ? '...' : <Check size={18} />}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Panel 2: Projects */}
                {user.role === 'student' && (
                    <div className="control-panel-card">
                        <h3><FolderPlus size={20} /> Projects</h3>
                        <div className="panel-forms role-specific-student">
                            <form onSubmit={handleAssignProjectSubmit} className="action-form-inline">
                                <label>New</label>
                                <div className="input-group">
                                    <select
                                        value={selectedTemplateName}
                                        onChange={(e) => setSelectedTemplateName(e.target.value)}
                                        required
                                    >
                                        <option value="">-- Template --</option>
                                        {Object.keys(templates).map(name => (
                                            <option key={name} value={name}>{name}</option>
                                        ))}
                                    </select>
                                    <button 
                                        type="submit" 
                                        className="btn-action primary" 
                                        disabled={templatesSaving || !selectedTemplateName}
                                    >
                                        {templatesSaving ? '...' : <Plus size={18} />}
                                    </button>
                                </div>
                            </form>
                            <div className="recent-project-info">
                                <h4>Recent</h4>
                                {user.recent_project ? (
                                    <div className="project-status">
                                        <span className="project-name">{user.recent_project.name}</span>
                                        <span className="project-state">{user.recent_project.status || 'Active'}</span>
                                    </div>
                                ) : (
                                    <span className="no-projects">No projects yet</span>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Panel 3: Security */}
                <div className="control-panel-card full-width">
                    <h3><Shield size={20} /> Security & Auth</h3>
                    <div className="panel-forms">
                        {user.role === 'student' && (
                            <form onSubmit={handleSetDrawer} className="action-form-inline" noValidate>
                                <input type="hidden" name="username" value={user.username} />
                                <label>Drawer</label>
                                <div className="input-group">
                                    <input 
                                        type="text" 
                                        name="drawer" 
                                        defaultValue={user.drawer || ''} 
                                        placeholder="0xA6" 
                                        maxLength={4}
                                    />
                                    <button type="submit" className="btn-action primary" disabled={formLoading}>
                                        {formLoading ? '...' : <Check size={18} />}
                                    </button>
                                </div>
                            </form>
                        )}

                        <form onSubmit={handleResetPassword} className="password-form" noValidate>
                            <input type="hidden" name="username" value={user.username} />
                            <label>Password</label>
                            <div className="password-inputs">
                                <div className="password-input-wrapper">
                                    <input 
                                        type={showNewPassword ? "text" : "password"} 
                                        name="new_password" 
                                        placeholder="New Password"
                                        required 
                                    />
                                    <button 
                                        type="button" 
                                        className="eye-toggle"
                                        onClick={() => setShowNewPassword(!showNewPassword)}
                                    >
                                        {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                                <div className="password-input-wrapper">
                                    <input 
                                        type={showConfirmPassword ? "text" : "password"} 
                                        name="confirm_password" 
                                        placeholder="Confirm"
                                        required 
                                    />
                                    <button 
                                        type="button" 
                                        className="eye-toggle"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    >
                                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                                <button type="submit" className="btn-action warning" disabled={formLoading}>
                                    {formLoading ? '...' : <Key size={18} />}
                                </button>
                            </div>
                        </form>
                        
                        {/* Connection QR inside Security */}
                        {user.role === 'student' && (
                            <div className="sub-panel connection-qr-panel">
                                <div className="qr-header">
                                    <h4>Connection</h4>
                                    <button className="btn-action-text" onClick={() => window.print()}>Print</button>
                                </div>
                                {connectionCode ? (
                                    <div className="qr-compact-content">
                                        <img 
                                            src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(`${window.location.origin}/parent/connect?code=${connectionCode}`)}`} 
                                            alt="QR" 
                                            className="qr-image-compact"
                                        />
                                        <div className="qr-text-info">
                                            <span className="qr-code-txt">{connectionCode}</span>
                                            <span className="qr-hint">Scan to link parent</span>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="loading-small">Loading...</div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {user.role === 'parent' && (
                    <div className="control-panel-card parent-links-card">
                        <h3><UsersIcon size={20} /> Children</h3>
                        <div className="panel-forms">
                            <div className="compact-search-box">
                                <input 
                                    type="text" 
                                    placeholder="Search students..." 
                                    value={childSearchQuery} 
                                    onChange={(e) => setChildSearchQuery(e.target.value)}
                                    className="compact-search-input"
                                />
                            </div>
                            <div className="compact-children-list">
                                {(() => {
                                    const students = allUsers.filter(u => u.role === 'student');
                                    const filteredStudents = students.filter(s => {
                                        const search = childSearchQuery.toLowerCase();
                                        return s.username.toLowerCase().includes(search) || 
                                               (s.nickname && s.nickname.toLowerCase().includes(search));
                                    });
                                    const childIds = new Set(parentChildren.map(c => c.id));

                                    if (filteredStudents.length === 0) return null;

                                    return filteredStudents.map(s => {
                                        const isLinked = childIds.has(s.id);
                                        return (
                                            <div key={s.id} className="compact-child-item">
                                                <div className="child-info">
                                                    <SmartImage 
                                                        src={s.profile_picture ? getApiUrl(`/user/profile_pictures/${s.profile_picture}`) : ''} 
                                                        alt="" 
                                                        className="avatar-tiny"
                                                        fallbackType="avatar"
                                                    />
                                                    <div className="child-names">
                                                        <span className="name">{s.nickname || s.username}</span>
                                                        <span className="handle">@{s.username}</span>
                                                    </div>
                                                </div>
                                                <button 
                                                    type="button"
                                                    className={`btn-action-sm ${isLinked ? 'danger' : 'primary'}`}
                                                    onClick={() => handleToggleChildLink(s.id, isLinked)}
                                                    disabled={formLoading}
                                                >
                                                    {isLinked ? 'Unlink' : 'Link'}
                                                </button>
                                            </div>
                                        );
                                    });
                                })()}
                            </div>
                        </div>
                    </div>
                )}

                {user.role === 'student' && (
                    <div className="control-panel-card parent-links-card">
                        <h3><UsersIcon size={20} /> Parents</h3>
                        <div className="panel-forms">
                            <div className="compact-search-box">
                                <input 
                                    type="text" 
                                    placeholder="Search parents..." 
                                    value={parentSearchQuery} 
                                    onChange={(e) => setParentSearchQuery(e.target.value)}
                                    className="compact-search-input"
                                />
                            </div>
                            <div className="compact-children-list">
                                {(() => {
                                    const parents = allUsers.filter(u => u.role === 'parent');
                                    const filteredParents = parents.filter(p => {
                                        const search = parentSearchQuery.toLowerCase();
                                        return p.username.toLowerCase().includes(search) || 
                                               (p.nickname && p.nickname.toLowerCase().includes(search));
                                    });
                                    const parentIds = new Set(studentParents.map(p => p.id));

                                    if (filteredParents.length === 0) return null;

                                    return filteredParents.map(p => {
                                        const isLinked = parentIds.has(p.id);
                                        return (
                                            <div key={p.id} className="compact-child-item">
                                                <div className="child-info">
                                                    <SmartImage 
                                                        src={p.profile_picture ? getApiUrl(`/user/profile_pictures/${p.profile_picture}`) : ''} 
                                                        alt="" 
                                                        className="avatar-tiny"
                                                        fallbackType="avatar"
                                                    />
                                                    <div className="child-names">
                                                        <span className="name">{p.nickname || p.username}</span>
                                                        <span className="handle">@{p.username}</span>
                                                    </div>
                                                </div>
                                                <button 
                                                    type="button"
                                                    className={`btn-action-sm ${isLinked ? 'danger' : 'primary'}`}
                                                    onClick={() => handleToggleParentLink(p.id, isLinked)}
                                                    disabled={formLoading}
                                                >
                                                    {isLinked ? 'Unlink' : 'Link'}
                                                </button>
                                            </div>
                                        );
                                    });
                                })()}
                            </div>
                        </div>
                    </div>
                )}

                {/* Danger Zone */}
                {!user.is_admin && (
                    <div className="control-panel-card full-width danger-zone">
                        <h3 style={{color: '#ef4444'}}><Trash2 size={20} /> Danger Zone</h3>
                        <div className="panel-forms">
                            <p style={{color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem'}}>
                                Removing a user will permanently delete all of their data and progress. This action cannot be undone.
                            </p>
                            <button className="hud-btn danger-outline" style={{width: 'fit-content'}} onClick={handleRemoveUser}>
                                <Trash2 size={16} /> Remove User
                            </button>
                        </div>
                    </div>
                )}

            </div>

            {/* Printable Connection Card for student - hidden on screen, visible on print */}
            {user.role === 'student' && connectionCode && (
                <div className="printable-connection-card-full print-only">
                    <h3>{user.nickname || user.username}</h3>
                    <div className="print-handle">@{user.username}</div>
                    <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${window.location.origin}/parent/connect?code=${connectionCode}`)}`} 
                        alt="QR Code" 
                        style={{ width: '200px', height: '200px' }} 
                    />
                    <div className="print-code-box">
                        <span className="print-code-lbl">Connection Code</span>
                        <span className="print-code-val">{connectionCode}</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminUserDashboard;
