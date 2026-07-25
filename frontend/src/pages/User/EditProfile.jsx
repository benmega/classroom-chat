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

    const hasChanges = 
        nickname !== (user?.nickname || user?.username || '') ||
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
                nickname,
                bio,
                password: password || undefined,
                confirm_password: confirmPassword || undefined
            };

            await client.post('/user/edit_profile', payload);
            
            toast.success('Profile updated successfully!');
            
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
                <div className="settings-layout">
                    <div className="settings-sidebar">
                        <section className="profile-pic-section">
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
                        </section>
                    </div>

                    <div className="settings-main">
                        <div className="form-row">
                            <div className="form-group flex-1">
                                <label htmlFor="input-139">Username (readonly)</label>
                                <input id="input-139" type="text" value={user?.username || ''} disabled className="form-control readonly" />
                            </div>
                            <div className="form-group flex-1">
                                <label htmlFor="input-143">Nickname</label>
                                <input id="input-143" 
                                    type="text" 
                                    value={nickname}
                                    onChange={(e) => setNickname(e.target.value)}
                                    placeholder="Enter your nickname" 
                                    className="form-control" 
                                />
                            </div>
                        </div>

                        <div className="form-row columns-2">
                            <div className="form-col">
                                {user?.role !== 'parent' && (
                                    <div className="form-group">
                                        <label htmlFor="input-158">Parent Connection Code</label>
                                        <div className="connection-code-row">
                                            <input id="input-158" 
                                                type="text" 
                                                value={connectionCode || 'Loading...'} 
                                                disabled 
                                                className="form-control readonly connection-code-input" 
                                            />
                                            <button 
                                                type="button" 
                                                className="btn-secondary copy-btn" 
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
                                        <small className="form-help-text">
                                            Share this code with parents to connect.
                                        </small>
                                    </div>
                                )}
                                {user?.drawer && (
                                    <div className="form-group">
                                        <label htmlFor="input-188">Assigned Drawer (readonly)</label>
                                        <input id="input-188" 
                                            type="text" 
                                            value={user.drawer} 
                                            disabled 
                                            className="form-control readonly drawer-input" 
                                        />
                                        <small className="form-help-text">
                                            Your physical classroom drawer assignment.
                                        </small>
                                    </div>
                                )}
                            </div>

                            <div className="form-col">
                                <div className="form-group about-me-group">
                                    <label htmlFor="input-204">About Me</label>
                                    <textarea id="input-204" 
                                        value={bio}
                                        onChange={(e) => setBio(e.target.value)}
                                        placeholder="Tell us about yourself..." 
                                        className="form-control about-me-textarea" 
                                        rows="3"
                                        maxLength="500"
                                    />
                                    <small className="char-count">
                                        {bio?.length || 0}/500
                                    </small>
                                </div>
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group flex-1">
                                <label htmlFor="input-222">New Password</label>
                                <div className="password-input-wrapper">
                                    <input id="input-222" 
                                        type={showPassword ? "text" : "password"} 
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Leave blank to keep current" 
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
                                        placeholder="Confirm your new password" 
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

                {hasChanges && (
                    <div className="settings-footer">
                        <button type="button" onClick={handleCancel} className="btn-secondary">
                            <X size={18} /> Cancel
                        </button>
                        <button type="submit" disabled={isSaving} className="btn-primary">
                            <Save size={18} /> {isSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                )}
            </form>
        </div>
    );
};

export default EditProfile;
