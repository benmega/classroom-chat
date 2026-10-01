import React, { useState, useEffect, useCallback, useRef } from 'react';

import { Save, X, Eye, EyeOff, Copy } from 'lucide-react';
import client from '../../api/client';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/useAuthStore';
import './EditProfile.css';
import SmartImage from '../../components/common/SmartImage';
import { getApiUrl } from '../../utils/apiUrl';
import { getErrorMessage } from '../../utils/apiError';
import { PROFILE_PICTURE_TYPES, validateProfilePicture } from '../../utils/profilePicture';
import { ConnectionCardModal } from '../../components/admin/AdminModals';

const serverPreviewUrl = (u) => (
    u?.profile_picture ? getApiUrl(`/user/profile_pictures/${u.profile_picture}`) : getApiUrl('/static/images/Default_pfp.jpg')
);

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
    const [showConnectionModal, setShowConnectionModal] = useState(false);
    // The object URL behind a freshly chosen (unsaved) photo, so it can be revoked.
    const blobUrlRef = useRef(null);

    const userId = user?.id;
    const userRole = user?.role;

    const revokeBlobUrl = useCallback(() => {
        if (blobUrlRef.current) {
            URL.revokeObjectURL(blobUrlRef.current);
            blobUrlRef.current = null;
        }
    }, []);

    const syncTextFields = useCallback((u) => {
        setNickname(u.nickname || u.username);
        setBio(u.bio || '');
    }, []);

    const syncPreview = useCallback((u) => {
        revokeBlobUrl();
        setPreviewUrl(serverPreviewUrl(u));
    }, [revokeBlobUrl]);

    // Initialise the form once per signed-in user. Keyed on the id, not the user
    // object: checkAuth() replaces the object on every call (Shop, BitShift, ...),
    // and re-initialising then would throw away unsaved edits and the photo preview.
    useEffect(() => {
        const current = useAuthStore.getState().user;
        if (current) {
            syncTextFields(current);
            syncPreview(current);
        }
    }, [userId, syncTextFields, syncPreview]);

    useEffect(() => {
        if (!userId || userRole === 'parent') return;
        let cancelled = false;
        client.get('/user/api/parent-code')
            .then(res => {
                if (!cancelled) setConnectionCode(res.data?.data?.connection_code || res.data?.connection_code);
            })
            .catch(err => console.error('Failed to fetch connection code:', err));
        return () => { cancelled = true; };
    }, [userId, userRole]);

    // Release a pending preview blob when the page goes away.
    useEffect(() => () => revokeBlobUrl(), [revokeBlobUrl]);

    const isStudent = user?.role === 'student';

    const hasChanges = 
        (!isStudent && nickname !== (user?.nickname || user?.username || '')) ||
        bio !== (user?.bio || '') ||
        password !== '' ||
        confirmPassword !== '' ||
        profilePic !== null;

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const problem = validateProfilePicture(file);
        if (problem) {
            toast.error(problem);
            e.target.value = '';
            return;
        }

        revokeBlobUrl();
        blobUrlRef.current = URL.createObjectURL(file);
        setProfilePic(file);
        setPreviewUrl(blobUrlRef.current);
    };

    const handleCancel = () => {
        if (user) {
            syncTextFields(user);
            syncPreview(user);
            setPassword('');
            setConfirmPassword('');
            setProfilePic(null);
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
            // 1. Basic info first: it carries the validation that can fail (e.g. a
            // password rule), so a rejection leaves the current avatar untouched.
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

            // 2. Then the profile picture, if changed. The info above is already
            // saved by now, so a failure here is reported separately and the chosen
            // photo is kept so the user can retry.
            let pictureSaved = true;
            if (profilePic) {
                try {
                    const picData = new FormData();
                    picData.append('profile_picture', profilePic);
                    await client.post('/user/api/profile-picture', picData);
                    setProfilePic(null);
                } catch (picError) {
                    console.error('Profile picture upload error:', picError);
                    pictureSaved = false;
                    const reason = getErrorMessage(picError, '');
                    toast.error(reason
                        ? `Profile saved, but the photo upload failed: ${reason}`
                        : 'Profile saved, but the photo upload failed. Please try again.');
                }
            }

            // checkAuth() swaps in a fresh user object, which no longer re-initialises
            // the form on its own, so resync it explicitly from the saved data.
            await checkAuth(true);
            const saved = useAuthStore.getState().user;
            if (saved) {
                syncTextFields(saved);
                if (pictureSaved) syncPreview(saved);
            }
        } catch (error) {
            console.error('Update error:', error);
            toast.error(getErrorMessage(error, 'Failed to update profile.'));
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
                                    accept={PROFILE_PICTURE_TYPES.join(',')} 
                                />
                            </label>
                        </div>
                    </div>
                    <div className="profile-header-info">
                        <input type="hidden" value={user?.username || ''} readOnly disabled />
                        <h1 className="profile-username">{user?.username || ''}</h1>
                        <p className="profile-subtitle">Account Profile Settings</p>
                    </div>
                </div>

                {/* Main Content Layout */}
                <div className="settings-layout">
                    {/* Profile Information */}
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

                    {/* Pairing Code Panel */}
                    {user?.role !== 'parent' && (
                        <div className="settings-panel connection-panel">
                            <h2 className="panel-title">Pairing Code & Connection</h2>
                            <div className="connection-code-box">
                                <input 
                                    type="text"
                                    value={connectionCode || 'Loading...'}
                                    readOnly
                                    disabled
                                    className="connection-code-value"
                                />
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
                            <button
                                type="button"
                                className="btn-secondary w-100 mt-1rem"
                                onClick={() => setShowConnectionModal(true)}
                                disabled={!connectionCode}
                            >
                                Print Connection Card
                            </button>
                            <ConnectionCardModal
                                isOpen={showConnectionModal}
                                onClose={() => setShowConnectionModal(false)}
                                student={user}
                                connectionCode={connectionCode}
                            />
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
                </div>

                {/* Save Button Row */}
                {hasChanges && (
                    <div className="settings-footer-actions">
                        <button type="button" onClick={handleCancel} className="btn-secondary">
                            <X size={18} /> Cancel
                        </button>
                        <button type="submit" disabled={isSaving} className="btn-primary-save">
                            {isSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                )}
            </form>
        </div>
    );
};

export default EditProfile;
