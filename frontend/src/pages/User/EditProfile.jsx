import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, X, Lock, User as UserIcon, Eye, EyeOff, Copy } from 'lucide-react';
import client from '../../api/client';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/useAuthStore';
import './EditProfile.css';
import SmartImage from '../../components/common/SmartImage';
import { getApiUrl } from '../../utils/apiUrl';

const EditProfile = () => {
    const { user, checkAuth } = useAuthStore();
    const navigate = useNavigate();
    
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

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setProfilePic(file);
            setPreviewUrl(URL.createObjectURL(file));
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        
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
            await checkAuth();
            navigate('/profile');
        } catch (error) {
            console.error('Update error:', error);
            toast.error(error.response?.data?.error || 'Failed to update profile.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="edit-profile-page">
            <div className="settings-container">
                <div className="settings-header">
                    <h2>Account Settings</h2>
                    <p>Modify your public profile and account security.</p>
                </div>

                <form onSubmit={handleSave} className="settings-form">
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
                                <input type="file" id="pfp-upload" hidden onChange={handleFileChange} accept="image/*" />
                            </label>
                        </div>
                    </section>

                    <div className="form-sections-grid">
                        <section className="settings-section">
                            <h3 className="section-title"><UserIcon size={18} /> Basic Information</h3>
                            <div className="form-group">
                                <label>Username (readonly)</label>
                                <input type="text" value={user?.username || ''} disabled className="form-control readonly" />
                            </div>
                            {user?.role !== 'parent' && (
                                <div className="form-group">
                                    <label>Parent Connection Code</label>
                                    <div className="connection-code-row">
                                        <input 
                                            type="text" 
                                            value={connectionCode || 'Loading...'} 
                                            disabled 
                                            className="form-control readonly connection-code-input" 
                                        />
                                        <button 
                                            type="button" 
                                            className="btn-secondary" 
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
                                        Share this code with your parents to allow them to connect to your account.
                                    </small>
                                </div>
                            )}
                            {user?.drawer && (
                                <div className="form-group">
                                    <label>Assigned Drawer (readonly)</label>
                                    <input 
                                        type="text" 
                                        value={user.drawer} 
                                        disabled 
                                        className="form-control readonly drawer-input" 
                                    />
                                    <small className="form-help-text">
                                        This is your physical drawer assignment in the classroom.
                                    </small>
                                </div>
                            )}
                            <div className="form-group">
                                <label>Nickname</label>
                                <input 
                                    type="text" 
                                    value={nickname}
                                    onChange={(e) => setNickname(e.target.value)}
                                    placeholder="Enter your nickname" 
                                    className="form-control" 
                                />
                            </div>
                            <div className="form-group">
                                <label>About Me</label>
                                <textarea 
                                    value={bio}
                                    onChange={(e) => setBio(e.target.value)}
                                    placeholder="Tell us about yourself..." 
                                    className="form-control" 
                                    rows="4"
                                    maxLength="500"
                                />
                                <small className="char-count">
                                    {bio?.length || 0}/500
                                </small>
                            </div>
                        </section>

                        <section className="settings-section">
                            <h3 className="section-title"><Lock size={18} /> Password Security</h3>
                            <div className="form-group">
                                <label>New Password</label>
                                <div className="password-input-wrapper">
                                    <input 
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
                            <div className="form-group">
                                <label>Confirm New Password</label>
                                <div className="password-input-wrapper">
                                    <input 
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
                        </section>
                    </div>

                    <div className="settings-footer">
                        <button type="button" onClick={() => navigate('/profile')} className="btn-secondary">
                            <X size={18} /> Cancel
                        </button>
                        <button type="submit" disabled={isSaving} className="btn-primary">
                            <Save size={18} /> {isSaving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditProfile;
