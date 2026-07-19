import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';

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
import { useAdminUserDashboard } from '../../hooks/useAdminUserDashboard';

const AdminUserDashboard = () => {
    const { userId } = useParams();
    const navigate = useNavigate();
    
    const {
        user, isLoading, formLoading, parentChildren, connectionCode, allUsers,
        showNewPassword, setShowNewPassword, showConfirmPassword, setShowConfirmPassword,
        childSearchQuery, setChildSearchQuery, studentParents, parentSearchQuery, setParentSearchQuery,
        templates, selectedTemplateName, setSelectedTemplateName, templatesSaving,
        passChapterLoading, selectedChapterId, setSelectedChapterId, passPreview, setPassPreview,
        handlePassChapterPreview, handlePassChapterConfirm, handleAdjustDucks,
        handleAdjustPackets, handleSetDrawer, handleResetPassword, handleRemoveUser,
        handleApproveUser, handleRejectUser, handleToggleChildLink, handleToggleParentLink,
        handleAssignProjectSubmit
    } = useAdminUserDashboard(userId);


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

                {user.role === 'student' && (
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
                )}
            </div>

            {/* Grid of Control Panels */}
            <div className="admin-user-controls-grid">

                {/* Activity & Status */}
                <div className="control-panel-card">
                    <div className="panel-forms">
                        <div className="activity-info-block">
                            <div className="activity-row">
                                <span className="lbl">Status</span>
                                <span className={`val ${user.is_online ? 'active' : 'idle'}`}>
                                    {user.is_online ? 'Active Now' : 'Offline'}
                                </span>
                            </div>
                            {user.role === 'student' && (
                                <div className="activity-row">
                                    <span className="lbl">Current Task</span>
                                    <span className="val">{user.current_activity || 'None'}</span>
                                </div>
                            )}
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
                {user.role === 'student' && (
                    <div className="control-panel-card">
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
                )}

                {/* Panel 2: Projects */}
                {user.role === 'student' && (
                    <div className="control-panel-card">
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

                {/* Panel 2.5: Course Override */}
                {user.role === 'student' && (
                    <div className="control-panel-card">
                        <div className="panel-forms role-specific-student">
                            <form onSubmit={handlePassChapterPreview} className="action-form-inline">
                                <label>Course Pass</label>
                                <div className="input-group">
                                    <select
                                        value={selectedChapterId}
                                        onChange={(e) => {
                                            setSelectedChapterId(e.target.value);
                                            setPassPreview(null);
                                        }}
                                        required
                                    >
                                        <option value="">-- Select Course --</option>
                                        <option value="codecombat-junior">Code Combat Junior</option>
                                        <option value="cs1">Introduction to Computer Science</option>
                                        <option value="cs2">Computer Science 2</option>
                                        <option value="cs3">Computer Science 3</option>
                                        <option value="cs4">Computer Science 4</option>
                                        <option value="cs5">Computer Science 5</option>
                                        <option value="cs6">Computer Science 6</option>
                                        <option value="ozaria1">Sky Mountain (Ozaria 1)</option>
                                        <option value="ozaria2">Ozaria Chapter 2</option>
                                        <option value="ozaria3">Ozaria Chapter 3</option>
                                        <option value="ozaria4">Ozaria Chapter 4</option>
                                        <option value="gd1">Game Development 1</option>
                                        <option value="gd2">Game Development 2</option>
                                        <option value="gd3">Game Development 3</option>
                                        <option value="wd1">Web Development 1</option>
                                        <option value="wd2">Web Development 2</option>
                                    </select>
                                    <button 
                                        type="submit" 
                                        className="btn-action primary" 
                                        disabled={passChapterLoading || !selectedChapterId}
                                        title="Preview Chapter Pass"
                                    >
                                        {passChapterLoading ? '...' : <Eye size={18} />}
                                    </button>
                                </div>
                            </form>
                            
                            {passPreview && (
                                <div className="pass-chapter-preview p-2 border-radius-sm" style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', marginTop: '1rem', fontSize: '0.9rem' }}>
                                    <h4 className="mb-2">Preview Overview</h4>
                                    <ul className="mb-3" style={{ paddingLeft: '1.2rem', margin: '0.5rem 0' }}>
                                        <li><strong>Missing Challenges:</strong> {passPreview.challenges_to_complete}</li>
                                        <li><strong>Ducks to Award:</strong> {passPreview.ducks_to_award}</li>
                                        <li><strong>Certificates:</strong> {passPreview.certificates_to_award.length > 0 ? passPreview.certificates_to_award.join(", ") : "None"}</li>
                                    </ul>
                                    <button 
                                        className="btn-primary w-100" 
                                        onClick={handlePassChapterConfirm}
                                        disabled={passChapterLoading}
                                    >
                                        Confirm & Pass Chapter
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Panel 3: Security */}
                <div className="control-panel-card full-width">
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
                        <h3 className="danger-zone-title"><Trash2 size={20} /> Danger Zone</h3>
                        <div className="panel-forms">
                            <p style={{color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem'}}>
                                Removing a user will permanently delete all of their data and progress. This action cannot be undone.
                            </p>
                            <button   onClick={handleRemoveUser} className="hud-btn danger-outline w-fit-content">
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
