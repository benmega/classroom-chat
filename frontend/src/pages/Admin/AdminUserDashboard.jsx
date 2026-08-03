import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
    ChevronLeft, Shield, Check, Trash2,
    Save, Key, Plus, Copy, Eye, EyeOff, Activity, ExternalLink,
    Volume2, VolumeX, Code, Gamepad2, Globe, Sparkles, ShieldAlert,
    Coins, Lock, Award, QrCode
} from 'lucide-react';
import SmartImage from '../../components/common/SmartImage';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import Skeleton from '../../components/common/Skeleton';
import Modal from '../../components/common/Modal';
import { getApiUrl } from '../../utils/apiUrl';
import './AdminUserDashboard.css';
import { useAdminUserDashboard } from '../../hooks/useAdminUserDashboard';

import codecombatLogo from '../../assets/codecombat-logo.png';
import ozariaLogo from '../../assets/ozaria-logo.png';

const TRACKS = [
    { id: 'cs', label: 'Computer Science', short: 'CS', type: 'image', logo: codecombatLogo, desc: 'Core Programming & Algorithms' },
    { id: 'ozaria', label: 'Ozaria', short: 'Ozaria', type: 'image', logo: ozariaLogo, desc: 'Adventure Story & Code' },
    { id: 'gd', label: 'Game Development', short: 'GD', type: 'icon', icon: Gamepad2, desc: 'Game Mechanics & Design' },
    { id: 'wd', label: 'Web Development', short: 'WD', type: 'icon', icon: Globe, desc: 'HTML, CSS & Web Apps' }
];

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
        handleAssignProjectSubmit, handleUpdateUser, handleGenerateManualCertificate
    } = useAdminUserDashboard(userId);

    const [editForm, setEditForm] = useState({
        username: '',
        nickname: '',
        active_track: 'cs',
        role: 'student',
        bio: '',
        email: '',
        can_chat: true,
        is_admin: false,
        is_approved: true
    });

    const [duckAmountInput, setDuckAmountInput] = useState('');
    const [activeTab, setActiveTab] = useState('standard');
    const [selectedCertCourse, setSelectedCertCourse] = useState('cs-1');
    const [showAssignProjectModal, setShowAssignProjectModal] = useState(false);
    const [showAwardCertificateModal, setShowAwardCertificateModal] = useState(false);
    const [showPassChapterModal, setShowPassChapterModal] = useState(false);

    useEffect(() => {
        if (user) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setEditForm({
                username: user.username || '',
                nickname: user.nickname || '',
                active_track: user.active_track || 'cs',
                role: user.role || 'student',
                bio: user.bio || '',
                email: user.email || '',
                can_chat: user.can_chat ?? true,
                is_admin: !!user.is_admin,
                is_approved: !!user.is_approved
            });
        }
    }, [user]);

    if (isLoading) {
        return (
            <div className="compact-dashboard">
                <AdminPageHeader title="Loading User..." />
                <Skeleton height="50px" />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                    <Skeleton height="300px" />
                    <Skeleton height="300px" />
                    <Skeleton height="300px" />
                </div>
            </div>
        );
    }

    if (!user) return null;

    const handleTrackChange = (trackId) => {
        setEditForm(prev => ({ ...prev, active_track: trackId }));
        handleUpdateUser({ active_track: trackId });
    };

    const handleToggleChat = () => {
        const nextState = !editForm.can_chat;
        setEditForm(prev => ({ ...prev, can_chat: nextState }));
        handleUpdateUser({ can_chat: nextState });
    };

    const handlePresetDuck = (amount) => {
        setDuckAmountInput(String(amount));
    };

    const formatBinary = (val) => {
        if (val == null) return '0b0';
        const num = Math.trunc(val);
        return num < 0 ? `-0b${Math.abs(num).toString(2)}` : `0b${num.toString(2)}`;
    };

    const formatDecimal = (val) => {
        if (val == null) return '0';
        return Math.trunc(val).toString(10);
    };

    return (
        <div className="compact-dashboard admin-user-redesign">
            {/* Banner for Pending Users */}
            {!user.is_approved && !user.is_admin && (
                <div className="compact-banner warning-banner">
                    <div className="banner-info">
                        <ShieldAlert size={18} />
                        <span>Account Pending Approval</span>
                    </div>
                    <div className="banner-actions">
                        <button onClick={handleApproveUser} disabled={formLoading} className="btn-compact action-green">Approve Account</button>
                        <button onClick={handleRejectUser} disabled={formLoading} className="btn-compact danger">Reject</button>
                    </div>
                </div>
            )}

            {/* TOP HERO STATUS BAR */}
            <div className="user-hero-bar">
                <div className="hero-left">
                    <button className="btn-icon small hero-back" onClick={() => navigate('/admin/users')} title="Back to Users">
                        <ChevronLeft size={18} />
                    </button>
                    <SmartImage
                        src={user.profile_picture ? getApiUrl(`/user/profile_pictures/${user.profile_picture}`) : ''}
                        alt={user.username}
                        className="hero-avatar"
                        fallbackType="avatar"
                    />
                    <div className="hero-user-details">
                        <div className="hero-name-row">
                            <h2 className="hero-name">{user.nickname || user.username}</h2>
                            <span className="hero-handle">@{user.username}</span>
                            <Link to={`/profile/${user.slug}`} className="hero-profile-link" title="View Public Profile" target="_blank">
                                <ExternalLink size={13} />
                            </Link>
                        </div>
                        <div className="hero-meta-badges">
                            <span className={`status-pill ${user.is_online ? 'online' : 'offline'}`}>
                                <span className="status-dot"></span>
                                {user.is_online ? 'Online Now' : user.last_activity_time ? `Last active ${new Date(user.last_activity_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Offline'}
                            </span>
                            {user.current_activity && (
                                <span className="activity-pill truncate" title={user.current_activity}>
                                    <Activity size={12} /> {user.current_activity}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="hero-right-actions">
                    {user.role === 'student' && (
                        <button
                            type="button"
                            className={`btn-compact chat-toggle-btn ${editForm.can_chat ? 'enabled' : 'disabled'}`}
                            onClick={handleToggleChat}
                            disabled={formLoading}
                            title={editForm.can_chat ? "Click to mute student chat" : "Click to enable student chat"}
                        >
                            {editForm.can_chat ? <Volume2 size={15} /> : <VolumeX size={15} />}
                            <span>{editForm.can_chat ? 'Chat Enabled' : 'Student Muted'}</span>
                        </button>
                    )}
                    <button
                        className="btn-compact action-green save-hero-btn"
                        onClick={() => handleUpdateUser(editForm)}
                        disabled={formLoading}
                    >
                        <Save size={14} /> Save Profile
                    </button>
                </div>
            </div>

                        {/* TABS */}
            <div className="admin-tabs">
                <button 
                    className={`admin-tab ${activeTab === 'standard' ? 'active' : ''}`}
                    onClick={() => setActiveTab('standard')}
                >
                    Standard Operations
                </button>
                <button 
                    className={`admin-tab ${activeTab === 'account' ? 'active' : ''}`}
                    onClick={() => setActiveTab('account')}
                >
                    Account & Connections
                </button>
                <button 
                    className={`admin-tab ${activeTab === 'sensitive' ? 'active' : ''}`}
                    onClick={() => setActiveTab('sensitive')}
                >
                    Sensitive Actions
                </button>
            </div>

            {activeTab === 'standard' && (
                <>

                {/* SECTION 1: ACADEMIC & PROGRESS */}
                {user.role === 'student' && (
                    <div className="admin-section">
                        <h3 className="section-title"><Code size={18} /> Academic & Progress</h3>
                        
                        {/* Active Learning Track Full Width */}
                        <div className="compact-panel full-width">
                            <div className="panel-head">Current Learning Track</div>
                            <div className="track-cards-grid">
                                {TRACKS.map((t) => {
                                    const IconComponent = t.icon;
                                    const isActive = editForm.active_track === t.id;
                                    return (
                                        <button
                                            key={t.id}
                                            type="button"
                                            className={`track-card-btn ${isActive ? 'active' : ''}`}
                                            onClick={() => handleTrackChange(t.id)}
                                            disabled={formLoading}
                                        >
                                            <div className="track-card-icon">
                                                {t.type === 'image' ? (
                                                    <img src={t.logo} alt={t.label} className="track-logo-img" />
                                                ) : (
                                                    <IconComponent size={20} />
                                                )}
                                            </div>
                                            <div className="track-card-info">
                                                <div className="track-card-name">{t.label}</div>
                                            </div>
                                            {isActive && <div className="track-active-badge"><Check size={14} /> Active</div>}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="compact-grid section-grid mt-sm">
                            <div className="compact-panel">
                                <div className="panel-head">Assign Project</div>
                                <form onSubmit={handleAssignProjectSubmit} className="assign-project-form">
                                    <select
                                        value={selectedTemplateName}
                                        onChange={(e) => setSelectedTemplateName(e.target.value)}
                                        required
                                        className="inline-select full"
                                    >
                                        <option value="">Select Project Template...</option>
                                        {Object.keys(templates).map(name => <option key={name} value={name}>{name}</option>)}
                                    </select>
                                    <button type="submit" className="btn-compact action-blue w-full mt-xs" disabled={templatesSaving || !selectedTemplateName}>
                                        <Plus size={14} /> Assign Project to Student
                                    </button>
                                </form>
                            </div>

                            <div className="compact-panel">
                                <div className="panel-head">Course Progress Override</div>
                                <form onSubmit={handlePassChapterPreview} className="inline-action-form full">
                                    <select value={selectedChapterId} onChange={(e) => { setSelectedChapterId(e.target.value); setPassPreview(null); }} required className="inline-select">
                                        <option value="">Select Chapter...</option>
                                        <option value="cs1">CS 1</option>
                                        <option value="cs2">CS 2</option>
                                        <option value="cs3">CS 3</option>
                                        <option value="cs4">CS 4</option>
                                        <option value="cs5">CS 5</option>
                                        <option value="cs6">CS 6</option>
                                        <option value="ozaria1">Ozaria 1</option>
                                        <option value="ozaria2">Ozaria 2</option>
                                        <option value="gd1">GD 1</option>
                                        <option value="gd2">GD 2</option>
                                        <option value="wd1">WD 1</option>
                                        <option value="wd2">WD 2</option>
                                    </select>
                                    <button type="submit" className="btn-compact action-blue" disabled={passChapterLoading || !selectedChapterId}>
                                        <Check size={14} /> Preview
                                    </button>
                                </form>
                                {passPreview && (
                                    <div className="dense-preview mt-xs">
                                        <div className="pv-text">Pass will grant {passPreview.ducks_to_award} ducks and complete {passPreview.challenges_to_complete} tasks.</div>
                                        <button className="btn-compact warning w-full mt-xs" onClick={handlePassChapterConfirm}>Confirm Pass Chapter</button>
                                    </div>
                                )}
                            </div>

                            <div className="compact-panel">
                                <div className="panel-head">Manual Certificate</div>
                                <div className="dense-form-group-stack">
                                    <select 
                                        value={selectedCertCourse} 
                                        onChange={(e) => setSelectedCertCourse(e.target.value)}
                                        className="inline-input full mb-xs"
                                    >
                                        <option value="cs-1">CS1 - Computer Science 1</option>
                                        <option value="cs-2">CS2 - Computer Science 2</option>
                                        <option value="cs-3">CS3 - Computer Science 3</option>
                                        <option value="cs-4">CS4 - Computer Science 4</option>
                                        <option value="cs-5">CS5 - Computer Science 5</option>
                                        <option value="cs-6">CS6 - Computer Science 6</option>
                                        <option value="gd-1">GD1 - Game Development 1</option>
                                        <option value="gd-2">GD2 - Game Development 2</option>
                                        <option value="gd-3">GD3 - Game Development 3</option>
                                        <option value="wd-1">WD1 - Web Development 1</option>
                                        <option value="wd-2">WD2 - Web Development 2</option>
                                        <option value="oz-1">Ozaria 1</option>
                                        <option value="oz-2">Ozaria 2</option>
                                        <option value="oz-3">Ozaria 3</option>
                                        <option value="oz-4">Ozaria 4</option>
                                    </select>
                                    <button type="button" className="btn-compact action-blue w-full" onClick={() => handleGenerateManualCertificate(selectedCertCourse)} disabled={formLoading}>
                                        <Sparkles size={14} /> Generate PDF Certificate
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* SECTION 2: ECONOMY & GAMIFICATION */}
                {user.role === 'student' && (
                    <div className="admin-section">
                        <h3 className="section-title"><Gamepad2 size={18} /> Economy & Gamification</h3>
                        <div className="compact-grid section-grid economy-grid">
                            
                            <div className="compact-panel economy-panel">
                                <div className="panel-head">Balances & Locker</div>
                                <div className="economy-section">
                                    {/* Ducks (Binary) */}
                                    <form onSubmit={handleAdjustDucks} className="economy-row-card">
                                        <div className="econ-header">
                                            <span className="econ-label">🦆 Ducks (Binary)</span>
                                            <span className="econ-balance">{formatBinary(user.duck_balance)}</span>
                                        </div>
                                        <input type="hidden" name="username" value={user.username} />
                                        <div className="econ-preset-pills">
                                            <button type="button" className="preset-pill" onClick={() => handlePresetDuck(1)}>+1</button>
                                            <button type="button" className="preset-pill neg" onClick={() => handlePresetDuck(-1)}>-1</button>
                                        </div>
                                        <div className="econ-action-inputs">
                                            <input
                                                type="number"
                                                name="amount"
                                                step="1"
                                                placeholder="Amount (+/-)"
                                                required
                                                value={duckAmountInput}
                                                onChange={(e) => setDuckAmountInput(e.target.value)}
                                                className="inline-input"
                                            />
                                            <button type="submit" className="btn-compact action-green" disabled={formLoading}>
                                                <Check size={14} /> Adjust
                                            </button>
                                        </div>
                                    </form>

                                    {/* Packets (Decimal) */}
                                    <form onSubmit={handleAdjustPackets} className="economy-row-card">
                                        <div className="econ-header">
                                            <span className="econ-label">📦 Packets (Decimal)</span>
                                            <span className="econ-balance">{formatDecimal(user.packets)}</span>
                                        </div>
                                        <input type="hidden" name="username" value={user.username} />
                                        <div className="econ-action-inputs">
                                            <input type="number" name="amount" step="1" placeholder="Amount (+/-)" required className="inline-input" />
                                            <button type="submit" className="btn-compact action-green" disabled={formLoading}>
                                                <Check size={14} /> Adjust
                                            </button>
                                        </div>
                                    </form>

                                    {/* Locker Drawer (Hex) */}
                                    <form onSubmit={handleSetDrawer} className="economy-row-card">
                                        <div className="econ-header">
                                            <span className="econ-label"><Lock size={14} /> Locker Drawer (Hex)</span>
                                            <span className="econ-balance">{user.drawer || 'Not Set'}</span>
                                        </div>
                                        <div className="econ-action-inputs">
                                            <input type="text" name="drawer" defaultValue={user.drawer || ''} placeholder="e.g. 0x08" maxLength={6} className="inline-input" />
                                            <button type="submit" className="btn-compact action-green" disabled={formLoading}>
                                                <Check size={14} /> Set
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>

                            <div className="compact-panel perks-panel">
                                <div className="panel-head">Student Perks Matrix</div>
                                <div className="perks-list">
                                    <button type="button" className={`perk-list-item ${user.has_chat_font ? 'on' : 'off'}`} onClick={() => handleUpdateUser({ has_chat_font: !user.has_chat_font })}>
                                        <span className="perk-title">Chat Font</span>
                                        <span className="perk-desc">Customizes chat font style</span>
                                    </button>
                                    <button type="button" className={`perk-list-item ${user.has_animated_border ? 'on' : 'off'}`} onClick={() => handleUpdateUser({ has_animated_border: !user.has_animated_border })}>
                                        <span className="perk-title">Animated Border</span>
                                        <span className="perk-desc">Animated avatar border</span>
                                    </button>
                                    <button type="button" className={`perk-list-item ${user.has_auto_bitshift ? 'on' : 'off'}`} onClick={() => handleUpdateUser({ has_auto_bitshift: !user.has_auto_bitshift })}>
                                        <span className="perk-title">Auto-Bitshift Powerup</span>
                                        <span className="perk-desc">Automatic hacking mini-game perk</span>
                                    </button>
                                    <button type="button" className={`perk-list-item ${user.has_auto_claimer ? 'on' : 'off'}`} onClick={() => handleUpdateUser({ has_auto_claimer: !user.has_auto_claimer })}>
                                        <span className="perk-title">Auto Claim</span>
                                        <span className="perk-desc">Automatically claims periodic rewards</span>
                                    </button>
                                    <button type="button" className={`perk-list-item ${user.has_double_duck ? 'on' : 'off'}`} onClick={() => handleUpdateUser({ has_double_duck: !user.has_double_duck })}>
                                        <span className="perk-title">2x Duck Earnings</span>
                                        <span className="perk-desc">Doubles duck yield from tasks</span>
                                    </button>
                                    <button type="button" className={`perk-list-item ${user.has_custom_wallpaper ? 'on' : 'off'}`} onClick={() => handleUpdateUser({ has_custom_wallpaper: !user.has_custom_wallpaper })}>
                                        <span className="perk-title">Custom Wallpaper</span>
                                        <span className="perk-desc">Unlock custom dashboard backgrounds</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                
                </>
            )}

            {activeTab === 'account' && (
                <>
{/* SECTION 3: IDENTITY & CONNECTIONS */}
                <div className="admin-section">
                    <h3 className="section-title"><Shield size={18} /> Identity & Connections</h3>
                    <div className="compact-grid section-grid">
                        <div className="compact-panel">
                            <div className="panel-head">Account Identity</div>
                            <div className="dense-form">
                                <div className="dense-group">
                                    <label htmlFor="input-nickname">Nickname</label>
                                    <input id="input-nickname" type="text" value={editForm.nickname} onChange={(e) => setEditForm({ ...editForm, nickname: e.target.value })} />
                                </div>
                                <div className="dense-group">
                                    <label htmlFor="input-username">Username</label>
                                    <input id="input-username" type="text" value={editForm.username} onChange={(e) => setEditForm({ ...editForm, username: e.target.value.toLowerCase() })} />
                                </div>
                                <div className="dense-group">
                                    <label htmlFor="input-email">Email</label>
                                    <input id="input-email" type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
                                </div>
                                <div className="dense-group">
                                    <label htmlFor="input-role">Role</label>
                                    <select id="input-role" value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}>
                                        <option value="student">Student</option>
                                        <option value="parent">Parent</option>
                                        <option value="teacher">Teacher</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        {(user.role === 'parent' || user.role === 'student') && (
                            <div className="compact-panel">
                                <div className="panel-head">Connections</div>
                                <div className="dense-links">
                                    <input
                                        type="text"
                                        placeholder={user.role === 'parent' ? "Find students to link..." : "Find parents to link..."}
                                        value={user.role === 'parent' ? childSearchQuery : parentSearchQuery}
                                        onChange={(e) => user.role === 'parent' ? setChildSearchQuery(e.target.value) : setParentSearchQuery(e.target.value)}
                                        className="inline-input full mb-xs"
                                    />
                                    <div className="link-list">
                                        {(() => {
                                            const query = (user.role === 'parent' ? childSearchQuery : parentSearchQuery).toLowerCase();
                                            const targets = allUsers.filter(u => u.role === (user.role === 'parent' ? 'student' : 'parent'));
                                            const filtered = targets.filter(t => t.username.toLowerCase().includes(query) || (t.nickname && t.nickname.toLowerCase().includes(query)));
                                            const linkedIds = new Set((user.role === 'parent' ? parentChildren : studentParents).map(c => c.id));

                                            if (filtered.length === 0) {
                                                return <div className="link-empty">No accounts match query</div>;
                                            }

                                            return filtered.map(t => {
                                                const isLinked = linkedIds.has(t.id);
                                                return (
                                                    <div key={t.id} className="link-item">
                                                        <span className="link-name truncate">{t.nickname || t.username} (@{t.username})</span>
                                                        <button
                                                            type="button"
                                                            className={`btn-compact ${isLinked ? 'danger' : 'action-neutral'} xs`}
                                                            onClick={() => user.role === 'parent' ? handleToggleChildLink(t.id, isLinked) : handleToggleParentLink(t.id, isLinked)}
                                                        >
                                                            {isLinked ? 'Unlink' : 'Link'}
                                                        </button>
                                                    </div>
                                                );
                                            });
                                        })()}
                                    </div>
                                    {user.role === 'student' && connectionCode && (
                                        <div className="qr-tiny-box mt-sm">
                                            <span className="qr-tiny-lbl">Parent QR Code: <strong>{connectionCode}</strong></span>
                                            <button className="btn-icon small" onClick={() => window.print()} title="Print QR Connection Card">
                                                <Copy size={14} />
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                
                </>
            )}

            {activeTab === 'sensitive' && (
                <>
{/* SECTION 4: ADMINISTRATION & SECURITY */}
                <div className="admin-section admin-danger-section">
                    <h3 className="section-title text-danger"><ShieldAlert size={18} /> Administration & Security</h3>
                    <div className="compact-grid section-grid">
                        <div className="compact-panel">
                            <div className="panel-head">Access & Privileges</div>
                            <div className="dense-toggles">
                                <label className="dense-toggle">
                                    <input type="checkbox" checked={editForm.can_chat} onChange={(e) => setEditForm({ ...editForm, can_chat: e.target.checked })} />
                                    Chat Access Enabled
                                </label>
                                <label className="dense-toggle">
                                    <input type="checkbox" checked={editForm.is_admin} onChange={(e) => setEditForm({ ...editForm, is_admin: e.target.checked })} />
                                    System Administrator
                                </label>
                                <label className="dense-toggle">
                                    <input type="checkbox" checked={editForm.is_approved} onChange={(e) => setEditForm({ ...editForm, is_approved: e.target.checked })} />
                                    Account Approved
                                </label>
                            </div>
                        </div>

                        <div className="compact-panel">
                            <div className="panel-head">Account Security</div>
                            <form onSubmit={handleResetPassword} className="dense-form-group-stack">
                                <div className="inline-lbl">Reset Password</div>
                                <div className="pwd-row">
                                    <input type={showNewPassword ? "text" : "password"} name="new_password" placeholder="New Password" required className="inline-input full" />
                                    <button type="button" className="btn-icon small" onClick={() => setShowNewPassword(!showNewPassword)}>
                                        {showNewPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                    </button>
                                </div>
                                <div className="pwd-row mt-xs">
                                    <input type={showConfirmPassword ? "text" : "password"} name="confirm_password" placeholder="Confirm Password" required className="inline-input full" />
                                    <button type="button" className="btn-icon small" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                                        {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                                    </button>
                                </div>
                                <button type="submit" className="btn-compact action-neutral w-full mt-xs" disabled={formLoading}>Reset Password</button>
                            </form>
                        </div>

                        {!user.is_admin && (
                            <div className="compact-panel danger-box">
                                <div className="panel-head">Danger Zone</div>
                                <p style={{ fontSize: '0.8rem', color: '#b91c1c', marginBottom: '0.75rem', fontWeight: 600 }}>This action is permanent and cannot be undone.</p>
                                <button onClick={handleRemoveUser} className="btn-compact danger w-full">
                                    <Trash2 size={15} /> Delete Account
                                </button>
                            </div>
                        )}
                    </div>
                </div>
                </>
            )}

            {/* Printable QR Code for Parent Connection */}
            {user.role === 'student' && connectionCode && (
                <div className="print-only">
                    <h2>{user.nickname || user.username}</h2>
                    <div>@{user.username}</div>
                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${window.location.origin}/parent/connect?code=${connectionCode}`)}`} alt="QR" />
                    <div>Connection Code: {connectionCode}</div>
                </div>
            )}

            {/* Modals for Course Actions */}
            <Modal isOpen={showAssignProjectModal} onClose={() => setShowAssignProjectModal(false)} title="Assign Project">
                <form onSubmit={(e) => {
                    handleAssignProjectSubmit(e);
                    setShowAssignProjectModal(false);
                }} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <select
                        value={selectedTemplateName}
                        onChange={(e) => setSelectedTemplateName(e.target.value)}
                        required
                        className="inline-select"
                        style={{ width: '100%', padding: '8px' }}
                    >
                        <option value="">Select Project Template...</option>
                        {Object.keys(templates).map(name => <option key={name} value={name}>{name}</option>)}
                    </select>
                    <button type="submit" className="btn-compact primary" disabled={templatesSaving || !selectedTemplateName} style={{ justifyContent: 'center', padding: '10px' }}>
                        <Plus size={14} /> Assign Project
                    </button>
                </form>
            </Modal>

            <Modal isOpen={showAwardCertificateModal} onClose={() => setShowAwardCertificateModal(false)} title="Award Certificate">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <select 
                        value={selectedCertCourse} 
                        onChange={(e) => setSelectedCertCourse(e.target.value)}
                        className="inline-select"
                        style={{ width: '100%', padding: '8px' }}
                    >
                        <option value="cs-1">CS1 - Computer Science 1</option>
                        <option value="cs-2">CS2 - Computer Science 2</option>
                        <option value="cs-3">CS3 - Computer Science 3</option>
                        <option value="cs-4">CS4 - Computer Science 4</option>
                        <option value="cs-5">CS5 - Computer Science 5</option>
                        <option value="cs-6">CS6 - Computer Science 6</option>
                        <option value="gd-1">GD1 - Game Development 1</option>
                        <option value="gd-2">GD2 - Game Development 2</option>
                        <option value="gd-3">GD3 - Game Development 3</option>
                        <option value="wd-1">WD1 - Web Development 1</option>
                        <option value="wd-2">WD2 - Web Development 2</option>
                        <option value="oz-1">Ozaria 1</option>
                        <option value="oz-2">Ozaria 2</option>
                        <option value="oz-3">Ozaria 3</option>
                        <option value="oz-4">Ozaria 4</option>
                    </select>
                    <button type="button" className="btn-compact primary" onClick={() => {
                        handleGenerateManualCertificate(selectedCertCourse);
                        setShowAwardCertificateModal(false);
                    }} disabled={formLoading} style={{ justifyContent: 'center', padding: '10px' }}>
                        <Sparkles size={14} /> Generate Certificate
                    </button>
                </div>
            </Modal>

            <Modal isOpen={showPassChapterModal} onClose={() => setShowPassChapterModal(false)} title="Pass Chapter">
                <form onSubmit={handlePassChapterPreview} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <select value={selectedChapterId} onChange={(e) => { setSelectedChapterId(e.target.value); setPassPreview(null); }} required className="inline-select" style={{ width: '100%', padding: '8px' }}>
                        <option value="">Select Chapter...</option>
                        <option value="cs1">CS 1</option>
                        <option value="cs2">CS 2</option>
                        <option value="cs3">CS 3</option>
                        <option value="cs4">CS 4</option>
                        <option value="cs5">CS 5</option>
                        <option value="cs6">CS 6</option>
                        <option value="ozaria1">Ozaria 1</option>
                        <option value="ozaria2">Ozaria 2</option>
                        <option value="gd1">GD 1</option>
                        <option value="gd2">GD 2</option>
                        <option value="wd1">WD 1</option>
                        <option value="wd2">WD 2</option>
                    </select>
                    <button type="submit" className="btn-compact primary" disabled={passChapterLoading || !selectedChapterId} style={{ justifyContent: 'center', padding: '10px' }}>
                        <Check size={14} /> Preview Pass
                    </button>
                </form>
                {passPreview && (
                    <div className="dense-preview mt-xs" style={{ marginTop: '12px' }}>
                        <div className="pv-text">Pass will grant {passPreview.ducks_to_award} ducks and complete {passPreview.challenges_to_complete} tasks.</div>
                        <button className="btn-compact warning w-full mt-xs" onClick={() => {
                            handlePassChapterConfirm();
                            setShowPassChapterModal(false);
                        }} style={{ padding: '10px' }}>Confirm Pass Chapter</button>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default AdminUserDashboard;
