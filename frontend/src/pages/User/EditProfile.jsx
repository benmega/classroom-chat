import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Save, X, Lock, User as UserIcon } from 'lucide-react';
import client from '../../api/client';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/useAuthStore';
import './EditProfile.css';

const EditProfile = () => {
    const { user, checkAuth } = useAuthStore();
    const navigate = useNavigate();
    
    const [nickname, setNickname] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [profilePic, setProfilePic] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);

    useEffect(() => {
        if (user) {
            setNickname(user.nickname || user.username);
            setPreviewUrl(user.profile_picture ? `/user/profile_pictures/${user.profile_picture}` : '/static/images/Default_pfp.jpg');
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
                await client.post('/user/api/profile-picture', picData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            }

            // 2. Handle Basic Info
            const payload = {
                nickname,
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
                            <img src={previewUrl} alt="Profile Preview" className="preview-avatar" />
                            <label htmlFor="pfp-upload" className="upload-overlay">
                                <Camera size={24} />
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
                        </section>

                        <section className="settings-section">
                            <h3 className="section-title"><Lock size={18} /> Password Security</h3>
                            <div className="form-group">
                                <label>New Password</label>
                                <input 
                                    type="password" 
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Leave blank to keep current" 
                                    className="form-control" 
                                    autoComplete="new-password"
                                />
                            </div>
                            <div className="form-group">
                                <label>Confirm New Password</label>
                                <input 
                                    type="password" 
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    placeholder="Confirm your new password" 
                                    className="form-control" 
                                    autoComplete="new-password"
                                />
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
