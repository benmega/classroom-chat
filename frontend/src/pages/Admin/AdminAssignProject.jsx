import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Save, LayoutTemplate, ImageIcon, Code, User, Search, XCircle, Play, CheckCircle, ExternalLink } from 'lucide-react';
import client from '../../api/client';
import toast from 'react-hot-toast';
import SmartImage from '../../components/common/SmartImage';
import { formatStaticUrl } from '../../utils/formatters';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import '../User/ManageProject.css'; // Reuse ManageProject styles for the split layout
import './AdminAssignProject.css';

const AdminAssignProject = () => {
    const navigate = useNavigate();
    
    const [activeTab, setActiveTab] = useState('core');
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Form State
    const [assignForm, setAssignForm] = useState({
        name: '',
        description: '',
        link: '',
        github_link: '',
        video_url: '',
        code_snippet: '',
        image_url: ''
    });

    // Standard Projects
    const [standardProjects, setStandardProjects] = useState([]);

    // User Search State
    const [userSearchQuery, setUserSearchQuery] = useState('');
    const [userSearchResults, setUserSearchResults] = useState([]);
    const [isSearchingUsers, setIsSearchingUsers] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);

    useEffect(() => {
        const fetchStandardProjects = async () => {
            try {
                const res = await client.get('/api/admin/standard-projects');
                if (res.data.status === 'success') {
                    setStandardProjects(res.data.data.standard_projects);
                }
            } catch (e) {
                console.error('Failed to load standard projects', e);
            }
        };
        fetchStandardProjects();
    }, []);

    // User Search Effect
    useEffect(() => {
        if (userSearchQuery.trim().length >= 2) {
            const delayDebounceFn = setTimeout(async () => {
                setIsSearchingUsers(true);
                try {
                    const response = await client.get(`/api/admin/users?search=${encodeURIComponent(userSearchQuery)}&per_page=10`);
                    if (response.data.users) {
                        setUserSearchResults(response.data.users);
                    }
                } catch {
                    // Ignore search errors
                } finally {
                    setIsSearchingUsers(false);
                }
            }, 300);
            return () => clearTimeout(delayDebounceFn);
        } else {
            setUserSearchResults([]);
        }
    }, [userSearchQuery]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setAssignForm(prev => ({ ...prev, [name]: value }));
    };

    const adjustTextareaHeight = (element) => {
        element.style.height = 'auto';
        element.style.height = (element.scrollHeight) + 'px';
    };

    const handleAssignProject = async (e) => {
        e.preventDefault();
        if (!selectedUser) {
            toast.error('Please select a student.');
            return;
        }
        if (!assignForm.name.trim()) {
            toast.error('Project Name is required.');
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = { ...assignForm, user_id: selectedUser.id };
            const response = await client.post('/api/admin/assign-project', payload);
            if (response.data.status === 'success') {
                toast.success(response.data.message);
                navigate('/admin/projects');
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to assign project.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="admin-projects-page h-100 d-flex-col">
            <AdminPageHeader title="Assign Project" />
            
            <div className="manage-project-page split-layout flex-1 m-0">
                <div className="editor-pane">
                    <div className="tab-navigation">
                        <button 
                            type="button"
                            className={`tab-btn ${activeTab === 'core' ? 'active' : ''}`}
                            onClick={() => setActiveTab('core')}
                        >
                            <LayoutTemplate size={16} /> Core Info
                        </button>
                        <button 
                            type="button"
                            className={`tab-btn ${activeTab === 'media' ? 'active' : ''}`}
                            onClick={() => setActiveTab('media')}
                        >
                            <ImageIcon size={16} /> Media & Links
                        </button>
                        <button 
                            type="button"
                            className={`tab-btn ${activeTab === 'code' ? 'active' : ''}`}
                            onClick={() => setActiveTab('code')}
                        >
                            <Code size={16} /> Code Showcase
                        </button>
                    </div>

                    <form onSubmit={handleAssignProject} className="project-editor-form">
                        <div className="tab-content">
                            {activeTab === 'core' && (
                                <section className="form-section fade-in">
                                    <div className="form-group user-search-group">
                                        <label>Assign to Student *</label>
                                        {!selectedUser ? (
                                            <>
                                                <div className="search-input-wrapper search-input-wrapper-styled">
                                                    <Search size={18} className="text-muted" />
                                                    <input 
                                                        type="text" 
                                                        placeholder="Type to search by username or nickname..." 
                                                        value={userSearchQuery}
                                                        onChange={(e) => setUserSearchQuery(e.target.value)}
                                                        className="search-input-field-styled"
                                                    />
                                                    {isSearchingUsers && <div className="spinner-small" />}
                                                </div>
                                                {userSearchResults.length > 0 && (
                                                    <div className="search-results-dropdown aap-dropdown">
                                                        {userSearchResults.map(u => (
                                                            <div 
                                                                key={u.id} 
                                                                className="search-result-item"
                                                                onClick={() => {
                                                                    setSelectedUser(u);
                                                                    setUserSearchQuery('');
                                                                    setUserSearchResults([]);
                                                                }}
                                                            >
                                                                <User size={16} /> 
                                                                <span>{u.nickname} ({u.username}) - #{u.id}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <div className="selected-user-pill aap-pill">
                                                <div className="user-info">
                                                    <User size={16} />
                                                    <span>{selectedUser.nickname} ({selectedUser.username}) - #{selectedUser.id}</span>
                                                </div>
                                                <button type="button" onClick={() => setSelectedUser(null)}><XCircle size={16}/></button>
                                            </div>
                                        )}
                                    </div>

                                    <div className="form-group">
                                        <label>Standard Project Template (Optional)</label>
                                        <select 
                                            className="form-control"
                                            onChange={(e) => {
                                                if (!e.target.value) return;
                                                const sp = standardProjects.find(p => p.id === parseInt(e.target.value));
                                                if (sp) {
                                                    setAssignForm({
                                                        name: sp.name || '',
                                                        description: sp.description || '',
                                                        link: sp.link || '',
                                                        github_link: sp.github_link || '',
                                                        video_url: sp.video_url || '',
                                                        code_snippet: sp.code_snippet || '',
                                                        image_url: sp.image_url || ''
                                                    });
                                                }
                                            }}
                                        >
                                            <option value="">-- Custom Project (Blank) --</option>
                                            {standardProjects.map(sp => (
                                                <option key={sp.id} value={sp.id}>{sp.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="form-group">
                                        <label>Project Name *</label>
                                        <input 
                                            type="text" 
                                            name="name" 
                                            value={assignForm.name} 
                                            onChange={handleInputChange} 
                                            required 
                                            placeholder="e.g. My Awesome Game"
                                            className="form-control"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Description</label>
                                        <textarea 
                                            name="description" 
                                            value={assignForm.description} 
                                            onChange={(e) => {
                                                handleInputChange(e);
                                                adjustTextareaHeight(e.target);
                                            }} 
                                            rows="4"
                                            placeholder="Tell the story of your project..."
                                            className="form-control"
                                        />
                                    </div>
                                </section>
                            )}

                            {activeTab === 'media' && (
                                <section className="form-section fade-in">
                                    <div className="form-group">
                                        <label>Thumbnail Image URL</label>
                                        <input 
                                            type="text" 
                                            name="image_url" 
                                            value={assignForm.image_url} 
                                            onChange={handleInputChange} 
                                            placeholder="https://..."
                                            className="form-control"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Demo Link</label>
                                        <input 
                                            type="url" 
                                            name="link" 
                                            value={assignForm.link} 
                                            onChange={handleInputChange} 
                                            placeholder="https://..."
                                            className="form-control"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>GitHub Link</label>
                                        <input 
                                            type="url" 
                                            name="github_link" 
                                            value={assignForm.github_link} 
                                            onChange={handleInputChange} 
                                            placeholder="https://github.com/..."
                                            className="form-control"
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label>Video URL</label>
                                        <input 
                                            type="url" 
                                            name="video_url" 
                                            value={assignForm.video_url} 
                                            onChange={handleInputChange} 
                                            placeholder="https://youtube.com/..."
                                            className="form-control"
                                        />
                                    </div>
                                </section>
                            )}

                            {activeTab === 'code' && (
                                <section className="form-section code-section fade-in h-full">
                                    <p className="hint">Paste the most interesting logic or function from your project here.</p>
                                    <textarea 
                                        name="code_snippet" 
                                        value={assignForm.code_snippet} 
                                        onChange={handleInputChange} 
                                        className="form-control code-editor h-full"
                                        placeholder="def my_awesome_logic():\n    pass"
                                    />
                                </section>
                            )}
                        </div>

                        <div className="form-footer sticky-footer">
                            <button type="button" onClick={() => navigate('/admin/projects')} className="btn-cancel">
                                Cancel
                            </button>
                            <div className="action-group">
                                <button type="submit" disabled={isSubmitting} className="btn-save">
                                    <Save size={18} /> {isSubmitting ? 'Assigning...' : 'Assign Project'}
                                </button>
                            </div>
                        </div>
                    </form>
                </div>

                <div className="preview-pane">
                    <div className="preview-content">
                        <div className="project-card mock-preview">
                            <div className="project-thumb">
                                <SmartImage 
                                    src={assignForm.image_url ? formatStaticUrl(assignForm.image_url) : null} 
                                    alt={assignForm.name || 'Preview'} 
                                    fallbackType="project"
                                />
                                {assignForm.video_url && (
                                    <div className="play-overlay"><Play size={24} fill="currentColor" /></div>
                                )}
                            </div>
                            <div className="project-content">
                                <h3>{assignForm.name || 'Project Name'}</h3>

                                <p className="preview-desc text-pre-wrap-break">
                                    {assignForm.description ? 
                                        (assignForm.description.length > 150 ? assignForm.description.substring(0, 150) + '...' : assignForm.description) 
                                        : 'A short description of your project will appear here...'}
                                </p>
                                
                                <div className="project-footer">
                                    {assignForm.link && (
                                        <a href="#" className="link-icon" onClick={(e) => e.preventDefault()}><ExternalLink size={16} /></a>
                                    )}
                                    <button className="btn-text" onClick={(e) => e.preventDefault()}>Details</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminAssignProject;
