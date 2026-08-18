import React, { useState, useEffect } from 'react';

import { Save, X, Eye, EyeOff, Copy } from 'lucide-react';
import client from '../../api/client';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/useAuthStore';
import './EditProfile.css';
import SmartImage from '../../components/common/SmartImage';
import { getApiUrl } from '../../utils/apiUrl';

const EditProfile = () => {
    const { user, checkAuth } = useAuthStore();
    
    const [nickname, setNickname] = useState('');
    const [bio, setBio] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [profilePic, setProfilePic] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [connectionCode, setConnectionCode] = useState('');

    useEffect(() => {
        if (user) {
            setNickname(user.nickname || user.username);
            setBio(user.bio || '');
            setPreviewUrl(user.profile_picture ? getApiUrl(`/user/profile_pictures/${user.profile_picture}`) : getApiUrl('/static/images/Default_pfp.jpg'));

            if (user.role !== 'parent') {
                client.get('/user/api/parent-code')
                    .then(res => setConnectionCode(res.data?.data?.connection_code || res.data?.connection_code))
                    .catch(err => console.error('Failed to fetch connection code:', err));
            }
        }
    }, [user]);

    const isStudent = user?.role === 'student';

    const hasChanges = 
        (!isStudent && nickname !== (user?.nickname || user?.username || '')) ||
        bio !== (user?.bio || '') ||
        password !== '' ||
        confirmPassword !== '' ||
        profilePic !== null;

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setProfilePic(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleCancel = () => {
        if (user) {
            setNickname(user.nickname || user.username);
            setBio(user.bio || '');
            setPassword('');
            setConfirmPassword('');
            setProfilePic(null);
            setPreviewUrl(user.profile_picture ? getApiUrl(`/user/profile_pictures/${user.profile_picture}`) : getApiUrl('/static/images/Default_pfp.jpg'));
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        
        if (!hasChanges) return;
        
        if (password && password !== confirmPassword) {
            toast.error('Passwords do not match!');
            return;
        }

        setIsSaving(true);
        try {
            // 1. Handle Profile Picture if changed
            if (profilePic) {
                const picData = new FormData();
                picData.append('profile_picture', profilePic);
                await client.post('/user/api/profile-picture', picData);
            }

            // 2. Handle Basic Info
            const payload = {
                bio,
                password: password || undefined,
                confirm_password: confirmPassword || undefined
            };
            if (!isStudent) {
                payload.nickname = nickname;
            }

            await client.post('/user/edit_profile', payload);
            
            
            
            setPassword('');
            setConfirmPassword('');
            setProfilePic(null);
            
            await checkAuth(true);
        } catch (error) {
            console.error('Update error:', error);
            toast.error(error.response?.data?.error || 'Failed to update profile.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="edit-profile-page">
            <form onSubmit={handleSave} className="settings-form">
                {/* Header Section */}
                <div className="profile-settings-header">
                    <div className="profile-header-avatar-section">
                        <div className="avatar-wrapper">
                            <SmartImage 
                                src={previewUrl} 
                                alt="Profile Preview" 
                                className="preview-avatar" 
                                fallbackType="avatar"
                            />
                            <label htmlFor="pfp-upload" className="upload-overlay">
                                <span>Change Photo</span>
                                <input 
                                    key={profilePic ? 'pfp-selected' : 'pfp-empty'}
                                    type="file" 
                                    id="pfp-upload" 
                                    hidden 
                                    onChange={handleFileChange} 
                                    accept="image/*" 
                                />
                            </label>
                        </div>
                    </div>
                    <div className="profile-header-info">
                        <h1 className="profile-username">{user?.username || ''}</h1>
                        <p className="profile-subtitle">Account Profile Settings</p>
                    </div>
                </div>

                {/* Main Content Layout */}
                <div className="settings-layout">
                    {/* Left Column: Profile Information */}
                    <div className="settings-panel profile-info-panel">
                        <h2 className="panel-title">Profile Information</h2>
                        
                        <div className="profile-info-fields-container">
                            <div className="nickname-container">
                                <div className="form-group">
                                    <label htmlFor="input-143">
                                        {isStudent ? 'Nickname (readonly)' : 'Your Nickname'}
                                    </label>
                                    <input id="input-143" 
                                        type="text" 
                                        value={nickname}
                                        onChange={(e) => setNickname(e.target.value)}
                                        placeholder="Enter your nickname" 
                                        disabled={isStudent}
                                        className={`form-control ${isStudent ? 'readonly' : ''}`}
                                    />
                                </div>
                                
                                {user?.drawer && (
                                    <div className="form-group drawer-form-group">
                                        <label htmlFor="input-188">Assigned Drawer (readonly)</label>
                                        <input id="input-188" 
                                            type="text" 
                                            value={user.drawer} 
                                            disabled 
                                            className="form-control readonly drawer-input" 
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="about-me-container-wrapper">
                                <div className="about-me-wave-bg"></div>
                                <div className="form-group about-me-group">
                                    <label htmlFor="input-204">About Me</label>
                                    <textarea id="input-204" 
                                        value={bio}
                                        onChange={(e) => setBio(e.target.value)}
                                        placeholder="Tell us about yourself..." 
                                        className="form-control about-me-textarea" 
                                        rows="4"
                                        maxLength="500"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Connection & Account Security */}
                    <div className="settings-right-column">
                        {/* Pairing Code Panel */}
                        {user?.role !== 'parent' && (
                            <div className="settings-panel connection-panel">
                                <h2 className="panel-title">Pairing Code & Connection</h2>
                                <div className="connection-code-box">
                                    <div className="connection-code-value">
                                        {connectionCode || 'Loading...'}
                                    </div>
                                    <button 
                                        type="button" 
                                        className="copy-btn-icon" 
                                        onClick={() => {
                                            if (connectionCode) {
                                                navigator.clipboard.writeText(connectionCode);
                                                toast.success('Code copied to clipboard!');
                                            }
                                        }}
                                        disabled={!connectionCode}
                                        title="Copy Code"
                                    >
                                        <Copy size={18} />
                                    </button>
                                </div>
                                <div className="connection-icon-wrapper">
                                    <div className="connection-link-circles">
                                        {/* Simple SVG representation of connected rings */}
                                        <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                                            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Account Security Panel */}
                        <div className="settings-panel security-panel">
                            <h2 className="panel-title">Account Security</h2>
                            <div className="security-fields-row">
                                <div className="form-group flex-1">
                                    <label htmlFor="input-222">New Password</label>
                                    <div className="password-input-wrapper">
                                        <input id="input-222" 
                                            type={showPassword ? "text" : "password"} 
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            placeholder="New Password" 
                                            className="form-control password-input" 
                                            autoComplete="new-password"
                                        />
                                        <button 
                                            type="button" 
                                            className="password-toggle-btn"
                                            onClick={() => setShowPassword(!showPassword)}
                                            tabIndex="-1"
                                        >
                                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>
                                <div className="form-group flex-1">
                                    <label htmlFor="input-243">Confirm New Password</label>
                                    <div className="password-input-wrapper">
                                        <input id="input-243" 
                                            type={showConfirmPassword ? "text" : "password"} 
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="Confirm New Password" 
                                            className="form-control password-input" 
                                            autoComplete="new-password"
                                        />
                                        <button 
                                            type="button" 
                                            className="password-toggle-btn"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            tabIndex="-1"
                                        >
                                            {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        {/* Save Button Row */}
                        <div className="settings-footer-actions">
                            {hasChanges && (
                                <button type="button" onClick={handleCancel} className="btn-secondary">
                                    <X size={18} /> Cancel
                                </button>
                            )}
                            <button type="submit" disabled={isSaving || !hasChanges} className="btn-primary-save">
                                {isSaving ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default EditProfile;
