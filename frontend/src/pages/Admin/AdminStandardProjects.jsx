import React, { useState, useEffect } from 'react';
import client from '../../api/client';
import toast from 'react-hot-toast';
import { Plus, Edit, Trash2, XCircle, BookOpen } from 'lucide-react';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import './AdminStandardProjects.css';

const AdminStandardProjects = () => {
    const [projects, setProjects] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [editingProject, setEditingProject] = useState(null);
    
    const [form, setForm] = useState({
        name: '', description: '', link: '', github_link: '', 
        video_url: '', code_snippet: '', image_url: ''
    });

    useEffect(() => {
        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        setIsLoading(true);
        try {
            const res = await client.get('/api/admin/standard-projects');
            if (res.data.status === 'success') {
                setProjects(res.data.data.standard_projects);
            }
        } catch {
            toast.error('Failed to load standard projects.');
        } finally {
            setIsLoading(false);
        }
    };

    const openModal = (project = null) => {
        if (project) {
            setEditingProject(project);
            setForm({
                name: project.name || '',
                description: project.description || '',
                link: project.link || '',
                github_link: project.github_link || '',
                video_url: project.video_url || '',
                code_snippet: project.code_snippet || '',
                image_url: project.image_url || ''
            });
        } else {
            setEditingProject(null);
            setForm({
                name: '', description: '', link: '', github_link: '', 
                video_url: '', code_snippet: '', image_url: ''
            });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.name.trim()) {
            toast.error('Project Name is required.');
            return;
        }

        setIsSubmitting(true);
        try {
            if (editingProject) {
                const res = await client.put(`/api/admin/standard-projects/${editingProject.id}`, form);
                if (res.data.status === 'success') {
                    toast.success(res.data.message);
                    closeModal();
                    fetchProjects();
                }
            } else {
                const res = await client.post('/api/admin/standard-projects', form);
                if (res.data.status === 'success') {
                    toast.success(res.data.message);
                    closeModal();
                    fetchProjects();
                }
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Action failed.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id, name) => {
        if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;
        
        try {
            const res = await client.delete(`/api/admin/standard-projects/${id}`);
            if (res.data.status === 'success') {
                toast.success(res.data.message);
                fetchProjects();
            }
        } catch {
            toast.error('Failed to delete standard project.');
        }
    };

    return (
        <div className="standard-projects-page">
            <AdminPageHeader title="Standard Projects (Templates)" />
            
            <div className="controls-bar">
                <button className="btn-add-standard" onClick={() => openModal()}>
                    <Plus size={18} /> Add Standard Project
                </button>
            </div>

            {isLoading ? (
                <div>Loading...</div>
            ) : (
                <div className="standard-projects-grid">
                    {projects.map(p => (
                        <div key={p.id} className="standard-project-card">
                            <h3><BookOpen size={18} className="icon-book-open" /> {p.name}</h3>
                            <p>{p.description || <em>No description</em>}</p>
                            <div className="sp-actions">
                                <button className="btn-edit-sp" onClick={() => openModal(p)}>
                                    <Edit size={16} /> Edit
                                </button>
                                <button className="btn-delete-sp" onClick={() => handleDelete(p.id, p.name)}>
                                    <Trash2 size={16} /> Delete
                                </button>
                            </div>
                        </div>
                    ))}
                    {projects.length === 0 && <div className="empty-state">No standard projects found.</div>}
                </div>
            )}

            {isModalOpen && (
                <div className="sp-modal-overlay" onClick={closeModal}>
                    <div className="sp-modal-card" onClick={e => e.stopPropagation()}>
                        <div className="sp-modal-header">
                            <h3>{editingProject ? 'Edit Standard Project' : ''}</h3>
                            <button className="sp-close-btn" onClick={closeModal}><XCircle size={24}/></button>
                        </div>
                        <form onSubmit={handleSubmit} className="sp-form">
                            <div className="sp-form-group">
                                <label>Project Name *</label>
                                <input 
                                    type="text" 
                                    required
                                    value={form.name}
                                    onChange={e => setForm({...form, name: e.target.value})}
                                    placeholder="e.g. Text-Based Adventure"
                                />
                            </div>
                            <div className="sp-form-group">
                                <label>Description</label>
                                <textarea 
                                    value={form.description}
                                    onChange={e => setForm({...form, description: e.target.value})}
                                    rows="4"
                                    placeholder="Description template..."
                                />
                            </div>
                            <div className="sp-form-row">
                                <div className="sp-form-group">
                                    <label>Default Demo Link</label>
                                    <input type="text" value={form.link} onChange={e => setForm({...form, link: e.target.value})} />
                                </div>
                                <div className="sp-form-group">
                                    <label>Default GitHub Link</label>
                                    <input type="text" value={form.github_link} onChange={e => setForm({...form, github_link: e.target.value})} />
                                </div>
                            </div>
                            <div className="sp-form-row">
                                <div className="sp-form-group">
                                    <label>Default Video URL</label>
                                    <input type="text" value={form.video_url} onChange={e => setForm({...form, video_url: e.target.value})} />
                                </div>
                                <div className="sp-form-group">
                                    <label>Default Thumbnail Image URL</label>
                                    <input type="text" value={form.image_url} onChange={e => setForm({...form, image_url: e.target.value})} />
                                </div>
                            </div>
                            <div className="sp-form-group">
                                <label>Default Code Snippet</label>
                                <textarea 
                                    value={form.code_snippet}
                                    onChange={e => setForm({...form, code_snippet: e.target.value})}
                                    rows="3"
                                    className="font-mono"
                                />
                            </div>

                            <div className="sp-modal-footer">
                                <button type="button" className="sp-btn-cancel" onClick={closeModal} disabled={isSubmitting}>Cancel</button>
                                <button type="submit" className="sp-btn-submit" disabled={isSubmitting}>
                                    {isSubmitting ? 'Saving...' : 'Save Template'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminStandardProjects;
