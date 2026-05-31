import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, PlusCircle, Trash2, ArrowLeft, Info, Coins, Shield, Tag } from 'lucide-react';
import client from '../../api/client';
import toast from 'react-hot-toast';
import './AdminAchievements.css';
import AdminPageHeader from '../../components/admin/AdminPageHeader';

const AdminAchievements = () => {
    const navigate = useNavigate();
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [formData, setFormData] = useState({
        name: '',
        slug: '',
        description: '',
        type: 'ducks',
        reward: 1,
        requirement_value: '',
        source: ''
    });

    const [badgeFile, setBadgeFile] = useState(null);
    const [badgePreview, setBadgePreview] = useState(null);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setBadgeFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setBadgePreview(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        const data = new FormData();
        Object.keys(formData).forEach(key => {
            data.append(key, formData[key]);
        });
        if (badgeFile) {
            data.append('badge', badgeFile);
        }

        try {
            const response = await client.post('/api/achievements/add', data);
            if (response.data.status === 'success') {
                toast.success(response.data.message);
                navigate('/admin');
            }
        } catch (error) {
            console.error('Add achievement error:', error);
            toast.error(error.response?.data?.message || 'Failed to add achievement.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="admin-achievements-page">
            <AdminPageHeader 
                title="Add New Achievement" 
                description="Create a new milestone for students to earn."
            />

            <div className="achievement-form-container card">
                <form onSubmit={handleSubmit} className="achievement-form">
                    <div className="form-section">
                        <h3 className="section-title"><Tag size={18} /> Basic Information</h3>
                        <div className="form-group">
                            <label>Achievement Name *</label>
                            <input 
                                type="text" 
                                name="name" 
                                value={formData.name} 
                                onChange={handleInputChange} 
                                required 
                                placeholder="e.g. Master Coder"
                            />
                        </div>

                        <div className="form-group">
                            <label>Slug * (Unique Identifier)</label>
                            <input 
                                type="text" 
                                name="slug" 
                                value={formData.slug} 
                                onChange={handleInputChange} 
                                required 
                                placeholder="master-coder"
                            />
                            <small className="hint">Used for internal tracking and URL paths.</small>
                        </div>

                        <div className="form-group">
                            <label>Description</label>
                            <textarea 
                                name="description" 
                                value={formData.description} 
                                onChange={handleInputChange} 
                                rows="3"
                                placeholder="Explain what the student achieved..."
                            />
                        </div>

                        <div className="form-group">
                            <label>Badge Icon (PNG/JPG/WEBP)</label>
                            <div className="file-upload-wrapper">
                                <input 
                                    type="file" 
                                    accept="image/*" 
                                    onChange={handleFileChange}
                                    id="badge-upload"
                                    className="file-input"
                                />
                                <label htmlFor="badge-upload" className="file-label">
                                    <PlusCircle size={16} /> {badgeFile ? badgeFile.name : 'Choose Image...'}
                                </label>
                            </div>
                            <small className="hint">Recommended size: 128x128px. Transparent background preferred.</small>
                        </div>
                    </div>

                    <div className="form-section">
                        <h3 className="section-title"><Coins size={18} /> Logic & Rewards</h3>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Category Type</label>
                                <select name="type" value={formData.type} onChange={handleInputChange} required>
                                    <option value="ducks">Ducks</option>
                                    <option value="project">Project</option>
                                    <option value="progress">Progress</option>
                                    <option value="chat">Chat</option>
                                    <option value="consistency">Consistency</option>
                                    <option value="community">Community</option>
                                    <option value="session">Session</option>
                                    <option value="trade">Trade</option>
                                    <option value="certificate">Certificate</option>
                                </select>
                            </div>

                            <div className="form-group">
                                <label>Duck Reward</label>
                                <input 
                                    type="number" 
                                    name="reward" 
                                    value={formData.reward} 
                                    onChange={handleInputChange} 
                                    min="1"
                                    required
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Requirement Value</label>
                            <input 
                                type="text" 
                                name="requirement_value" 
                                value={formData.requirement_value} 
                                onChange={handleInputChange} 
                                placeholder="e.g. 10 (for 10 projects)"
                            />
                            <small className="hint">The specific threshold the student must reach.</small>
                        </div>

                        <div className="form-group">
                            <label>External Source (Optional)</label>
                            <input 
                                type="text" 
                                name="source" 
                                value={formData.source} 
                                onChange={handleInputChange} 
                                placeholder="Link to related resource"
                            />
                        </div>
                    </div>

                    <footer className="form-footer">
                        <button 
                            type="submit" 
                            className="btn-submit" 
                            disabled={isSubmitting}
                        >
                            <PlusCircle size={20} /> {isSubmitting ? 'Adding...' : 'Create Achievement'}
                        </button>
                    </footer>
                </form>

                <aside className="achievement-preview-panel">
                    <h3><Award size={20} /> Live Preview</h3>
                    <div className="preview-achievement-card">
                        <div className="badge-wrapper">
                            {badgePreview ? (
                                <div className="preview-badge custom">
                                    <img src={badgePreview} alt="Preview" />
                                </div>
                            ) : (
                                <div className={`preview-badge type-${formData.type}`}>
                                    <Award size={32} />
                                </div>
                            )}
                            <span className="reward-tag">+{formData.reward} 🦆</span>
                        </div>
                        <div className="preview-text">
                            <h4>{formData.name || 'Achievement Name'}</h4>
                            <p>{formData.description || 'Describe the achievement to see how it looks for students.'}</p>
                            {formData.requirement_value && <span className="req-pill">Requires: {formData.requirement_value}</span>}
                        </div>
                    </div>
                    <div className="pro-tip">
                        <Info size={16} />
                        <p>Slugs cannot be changed after creation without database intervention. Choose wisely!</p>
                    </div>
                </aside>
            </div>
        </div>
    );
};

export default AdminAchievements;
