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
    const [selectedCertCourse, setSelectedCertCourse] = useState('cs-1');

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
                        <button onClick={handleApproveUser} disabled={formLoading} className="btn-compact primary">Approve Account</button>
                        <button onClick={handleRejectUser} disabled={formLoading} className="btn-compact danger">Reject</button>
                    </div>
                </div>
            )}

            {/* TOP HERO STATUS BAR (Unified Top Card Style) */}
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
                        className="btn-compact primary save-hero-btn"
                        onClick={() => handleUpdateUser(editForm)}
                        disabled={formLoading}
                    >
                        <Save size={14} /> Save Profile
                    </button>
                </div>
            </div>

            {/* ACTIVE LEARNING TRACK (Unified Card Style with Course Path Icons) */}
            {user.role === 'student' && (
                <div className="compact-panel prominent-track-section">
                    <div className="panel-head">
                        <Code size={16} /> Current Learning Track
                    </div>
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
                                        <div className="track-card-name">
                                            {t.label}
                                        </div>
                                    </div>
                                    {isActive && <div className="track-active-badge"><Check size={14} /> Active</div>}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* MAIN OPERATIONAL GRID (Unified Card Style) */}
            <div className="compact-grid">

                {/* HIGH FREQUENCY OPERATIONS */}
                <div className="compact-col">
                    {user.role === 'student' && (
                        <>
                            {/* Assign Project Card */}
                            <div className="compact-panel">
                                <div className="panel-head">
                                    <Code size={16} /> Assign Project
                                </div>
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
                                    <button type="submit" className="btn-compact primary w-full mt-xs" disabled={templatesSaving || !selectedTemplateName}>
                                        <Plus size={14} /> Assign Project to Student
                                    </button>
                                </form>
                            </div>

                            {/* Economy & Locker Card */}
                            <div className="compact-panel">
                                <div className="panel-head">
                                    <Coins size={16} /> Economy & Locker
                                </div>
                                <div className="economy-section">
                                    {/* Ducks Adjustment */}
                                    <form onSubmit={handleAdjustDucks} className="economy-row-card">
                                        <div className="econ-header">
                                            <span className="econ-label">🦆 Ducks</span>
                                            <span className="econ-balance">{(user.duck_balance ?? 0).toLocaleString()}</span>
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
                                                step="any"
                                                placeholder="Amount (+/-)"
                                                required
                                                value={duckAmountInput}
                                                onChange={(e) => setDuckAmountInput(e.target.value)}
                                                className="inline-input"
                                            />
                                            <button type="submit" className="btn-compact primary" disabled={formLoading}>
                                                <Check size={14} /> Adjust Ducks
                                            </button>
                                        </div>
                                    </form>

                                    {/* Packets Adjustment */}
                                    <form onSubmit={handleAdjustPackets} className="economy-row-card">
                                        <div className="econ-header">
                                            <span className="econ-label">📦 Packets</span>
                                            <span className="econ-balance">{(user.packets ?? 0).toLocaleString()}</span>
                                        </div>
                                        <input type="hidden" name="username" value={user.username} />
                                        <div className="econ-action-inputs">
                                            <input type="number" name="amount" step="any" placeholder="Amount (+/-)" required className="inline-input" />
                                            <button type="submit" className="btn-compact primary" disabled={formLoading}>
                                                <Check size={14} /> Adjust Packets
                                            </button>
                                        </div>
                                    </form>

                                    {/* Locker Drawer */}
                                    <form onSubmit={handleSetDrawer} className="economy-row-card">
                                        <div className="econ-header">
                                            <span className="econ-label"><Lock size={14} /> Locker Drawer</span>
                                            <span className="econ-balance">{user.drawer || 'Not Set'}</span>
                                        </div>
                                        <div className="econ-action-inputs">
                                            <input type="text" name="drawer" defaultValue={user.drawer || ''} placeholder="e.g. 0xA6" maxLength={6} className="inline-input" />
                                            <button type="submit" className="btn-compact primary" disabled={formLoading}>
                                                <Check size={14} /> Set Drawer
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* OCCASIONAL OPERATIONS */}
                <div className="compact-col">
                    {/* Password & Security */}
                    <div className="compact-panel">
                        <div className="panel-head"><Key size={16} /> Security</div>
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
                            <button type="submit" className="btn-compact warning w-full mt-xs" disabled={formLoading}>Reset Password</button>
                        </form>
                    </div>

                    {/* Course Progress Override */}
                    {user.role === 'student' && (
                        <div className="compact-panel">
                            <div className="panel-head"><Award size={16} /> Course Progress Override</div>
                            <form onSubmit={handlePassChapterPreview} className="inline-action-form full">
                                <select value={selectedChapterId} onChange={(e) => { setSelectedChapterId(e.target.value); setPassPreview(null); }} required className="inline-select">
                                    <option value="">Select Chapter to Pass...</option>
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
                                <button type="submit" className="btn-compact primary" disabled={passChapterLoading || !selectedChapterId}>
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
                    )}

                    {/* Manual Certificate Generation */}
                    {user.role === 'student' && (
                        <div className="compact-panel">
                            <div className="panel-head"><Award size={16} /> Manual Certificate</div>
                            <div className="dense-form-group-stack">
                                <div className="inline-lbl">Select a course to generate an honorary certificate:</div>
                                <select 
                                    value={selectedCertCourse} 
                                    onChange={(e) => setSelectedCertCourse(e.target.value)}
                                    className="inline-input full mb-xs"
                                    style={{ padding: '6px 8px', fontSize: '0.85rem', borderRadius: '4px', border: '1px solid #d1d5db', marginBottom: '8px' }}
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
                                <button type="button" className="btn-compact primary w-full" onClick={() => handleGenerateManualCertificate(selectedCertCourse)} disabled={formLoading}>
                                    <Sparkles size={14} /> Generate PDF Certificate
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Parent & Child Connections */}
                    {(user.role === 'parent' || user.role === 'student') && (
                        <div className="compact-panel">
                            <div className="panel-head"><QrCode size={16} /> Connections</div>
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
                                                        className={`btn-compact ${isLinked ? 'danger' : 'primary'} xs`}
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

                {/* RARE SETTINGS & IDENTITY */}
                <div className="compact-col">
                    {/* Identity & Rare Account Settings */}
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

                        <div className="compact-divider"></div>

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

                    {/* Perks Matrix */}
                    {user.role === 'student' && (
                        <div className="compact-panel">
                            <div className="panel-head"><Sparkles size={16} /> Perks Matrix</div>
                            <div className="dense-perks">
                                <button type="button" className={`perk-chip ${user.has_chat_font ? 'on' : 'off'}`} onClick={() => handleUpdateUser({ has_chat_font: !user.has_chat_font })}>Chat Font</button>
                                <button type="button" className={`perk-chip ${user.has_animated_border ? 'on' : 'off'}`} onClick={() => handleUpdateUser({ has_animated_border: !user.has_animated_border })}>Border</button>
                                <button type="button" className={`perk-chip ${user.has_auto_bitshift ? 'on' : 'off'}`} onClick={() => handleUpdateUser({ has_auto_bitshift: !user.has_auto_bitshift })}>Bitshift</button>
                                <button type="button" className={`perk-chip ${user.has_auto_claimer ? 'on' : 'off'}`} onClick={() => handleUpdateUser({ has_auto_claimer: !user.has_auto_claimer })}>Auto Claim</button>
                                <button type="button" className={`perk-chip ${user.has_double_duck ? 'on' : 'off'}`} onClick={() => handleUpdateUser({ has_double_duck: !user.has_double_duck })}>2x Duck</button>
                                <button type="button" className={`perk-chip ${user.has_custom_wallpaper ? 'on' : 'off'}`} onClick={() => handleUpdateUser({ has_custom_wallpaper: !user.has_custom_wallpaper })}>Wallpaper</button>
                            </div>
                        </div>
                    )}

                    {/* Danger Zone */}
                    {!user.is_admin && (
                        <div className="compact-panel danger-box">
                            <button onClick={handleRemoveUser} className="btn-compact danger w-full">
                                <Trash2 size={15} /> Delete Account
                            </button>
                        </div>
                    )}
                </div>

            </div>

            {/* Printable QR Code for Parent Connection */}
            {user.role === 'student' && connectionCode && (
                <div className="print-only">
                    <h2>{user.nickname || user.username}</h2>
                    <div>@{user.username}</div>
                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(`${window.location.origin}/parent/connect?code=${connectionCode}`)}`} alt="QR" />
                    <div>Connection Code: {connectionCode}</div>
                </div>
            )}
        </div>
    );
};

export default AdminUserDashboard;
