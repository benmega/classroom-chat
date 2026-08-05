import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Award, PlusCircle, Trash2, ArrowLeft, Info, Coins, Shield, Tag, Plus, Edit, X, Search, FileUp, Image as ImageIcon } from 'lucide-react';
import client from '../../api/client';
import toast from 'react-hot-toast';
import './AdminAchievements.css';
import { formatStaticUrl } from '../../utils/formatters';

const AdminAchievements = () => {
    const navigate = useNavigate();
    const [viewMode, setViewMode] = useState('list'); // 'list' or 'form'
    const [achievements, setAchievements] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingAchievement, setEditingAchievement] = useState(null);
    
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

    useEffect(() => {
        if (viewMode === 'list') {
            fetchAchievements();
        }
    }, [viewMode]);

    const fetchAchievements = async () => {
        setIsLoading(true);
        try {
            const res = await client.get('/api/achievements/all');
            if (res.data?.status === 'success') {
                setAchievements(res.data.data.achievements || []);
            }
        } catch (error) {
            console.error('Failed to load achievements:', error);
            toast.error('Failed to load achievements.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddClick = () => {
        setEditingAchievement(null);
        setFormData({
            name: '', slug: '', description: '', type: 'ducks', reward: 1, requirement_value: '', source: ''
        });
        setBadgeFile(null);
        setBadgePreview(null);
        setViewMode('form');
    };

    const handleEditClick = (achievement) => {
        setEditingAchievement(achievement);
        setFormData({
            name: achievement.name || '',
            slug: achievement.slug || '',
            description: achievement.description || '',
            type: achievement.type || 'ducks',
            reward: achievement.reward || 1,
            requirement_value: achievement.requirement_value || '',
            source: achievement.source || ''
        });
        setBadgeFile(null);
        setBadgePreview(null);
        setViewMode('form');
    };

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
            if (editingAchievement) {
                const response = await client.put(`/api/achievements/edit/${editingAchievement.id}`, data);
                if (response.data.status === 'success') {
                    toast.success(response.data.message || 'Achievement updated.');
                    setViewMode('list');
                }
            } else {
                const response = await client.post('/api/achievements/add', data);
                if (response.data.status === 'success') {
                    toast.success(response.data.message || 'Achievement created.');
                    setViewMode('list');
                }
            }
        } catch (error) {
            console.error('Save achievement error:', error);
            toast.error(error.response?.data?.message || 'Failed to save achievement.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (viewMode === 'list') {
        return (
            <div className="admin-achievements-page">
                <div className="d-flex justify-end mb-1-5rem">
                    <button className="primary-btn" onClick={handleAddClick}>
                        <Plus size={18} /> Add Achievement
                    </button>
                </div>

                {isLoading ? (
                    <div className="card p-2rem text-center text-muted">Loading achievements...</div>
                ) : (
                    <div className="card" style={{ padding: '24px' }}>
                        <div className="projects-grid">
                            {achievements.map(a => {
                                const badgeUrl = `images/achievement_badges/${a.slug}.png`;
                                return (
                                    <div 
                                        key={a.id} 
                                        className="project-card" 
                                        onClick={() => handleEditClick(a)}
                                    >
                                        <div 
                                            className="project-card-header" 
                                            style={{ 
                                                backgroundImage: `url(${formatStaticUrl(badgeUrl)})`,
                                                backgroundColor: 'var(--bg-color)',
                                                backgroundSize: 'contain',
                                                backgroundRepeat: 'no-repeat',
                                                backgroundPosition: 'center'
                                            }}
                                        >
                                            {/* Fallback icon if image fails to load via CSS, but let's just let it load */}
                                        </div>
                                        <div className="project-card-body">
                                            <div className="project-card-title" title={a.name}>
                                                {a.name}
                                            </div>
                                            <div className="project-card-desc">
                                                {a.description || "No description."}
                                            </div>
                                            <div style={{ marginTop: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                                Reward: <strong>{a.reward} ducks</strong>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            {achievements.length === 0 && (
                                <div className="empty-state text-muted" style={{ width: '100%', textAlign: 'center', padding: '20px' }}>
                                    No achievements found.
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="admin-achievements-page">
            <div className="d-flex justify-between align-center mb-1-5rem">
                <h2 style={{ margin: 0 }}>{editingAchievement ? "Edit Achievement" : "Create Achievement"}</h2>
                <button className="secondary-btn" onClick={() => setViewMode('list')}>
                    <ArrowLeft size={18} /> Back to List
                </button>
            </div>

            <div className="achievement-form-container card">
                <form onSubmit={handleSubmit} className="achievement-form">
                    <div className="form-section">
                        <h3 className="section-title"><Tag size={18} /> Basic Information</h3>
                        <div className="form-group">
                            <label htmlFor="input-79">Achievement Name *</label>
                            <input id="input-79" 
                                type="text" 
                                name="name" 
                                value={formData.name} 
                                onChange={handleInputChange} 
                                required 
                                placeholder="e.g. Master Coder"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="input-91">Slug * (Unique Identifier)</label>
                            <input id="input-91" 
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
                            <label htmlFor="input-104">Description</label>
                            <textarea id="input-104" 
                                name="description" 
                                value={formData.description} 
                                onChange={handleInputChange} 
                                rows="3"
                                placeholder="Explain what the student achieved..."
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="badge-upload">Badge Icon (PNG/JPG/WEBP)</label>
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
                                <label htmlFor="input-136">Category Type</label>
                                <select id="input-136" name="type" value={formData.type} onChange={handleInputChange} required>
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
                                <label htmlFor="input-151">Duck Reward</label>
                                <input id="input-151" 
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
                            <label htmlFor="input-164">Requirement Value</label>
                            <input id="input-164" 
                                type="text" 
                                name="requirement_value" 
                                value={formData.requirement_value} 
                                onChange={handleInputChange} 
                                placeholder="e.g. 10 (for 10 projects)"
                            />
                            <small className="hint">The specific threshold the student must reach.</small>
                        </div>

                        <div className="form-group">
                            <label htmlFor="input-176">External Source (Optional)</label>
                            <input id="input-176" 
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
                            <SaveIcon /> {isSubmitting ? 'Saving...' : (editingAchievement ? 'Save Changes' : 'Create Achievement')}
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
                                    {formData.slug ? <img src={formatStaticUrl(`images/achievement_badges/${formData.slug}.png`)} alt="Badge" onError={(e) => { e.target.style.display='none'; e.target.nextSibling.style.display='block'; }} style={{width: '100%', height: '100%', objectFit: 'contain'}} /> : null}
                                    <Award size={32} style={{ display: formData.slug ? 'none' : 'block' }} />
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

const SaveIcon = () => <Award size={20} />;

export default AdminAchievements;
