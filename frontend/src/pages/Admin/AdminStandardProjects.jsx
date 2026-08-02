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
        name: '', description: '', chapter: '', link: '', github_link: '', 
        video_url: '', code_snippet: '', image_url: ''
    });

    useEffect(() => {
        fetchProjects();
    }, []);

    const fetchProjects = async () => {
        setIsLoading(true);
        try {
            const res = await client.get('/api/project-templates');
            const data = res.data;
            const projectList = 
                data?.data?.templates || 
                data?.templates || {};
            setProjects(Object.values(projectList));
        } catch (error) {
            console.error('Failed to load standard projects:', error);
            toast.error('Failed to load standard projects.');
            setProjects([]);
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
                chapter: project.chapter || '',
                link: project.link || '',
                github_link: project.github_link || '',
                video_url: project.video_url || '',
                code_snippet: project.code_snippet || '',
                image_url: project.image_url || ''
            });
        } else {
            setEditingProject(null);
            setForm({
                name: '', description: '', chapter: '', link: '', github_link: '', 
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
                const res = await client.put(`/api/project-templates/${editingProject.id}`, form);
                if (res.data.status === 'success' || res.data.message) {
                    toast.success(res.data.message || 'Updated successfully.');
                    closeModal();
                    fetchProjects();
                }
            } else {
                const res = await client.post('/api/project-templates', form);
                if (res.data.status === 'success' || res.data.message) {
                    toast.success(res.data.message || 'Created successfully.');
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
            const res = await client.delete(`/api/project-templates/${id}`);
            if (res.data.status === 'success' || res.data.message) {
                toast.success(res.data.message || 'Deleted successfully.');
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
                            {p.chapter && <p className="sp-chapter">Chapter: {p.chapter}</p>}
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
                <div role="button" tabIndex={0} className="sp-modal-overlay" onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } }} onClick={closeModal}>
                    <div role="button" tabIndex={0} className="sp-modal-card" onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } }} onClick={e => e.stopPropagation()}>
                        <div className="sp-modal-header">
                            <h3>{editingProject ? 'Edit Standard Project' : 'Add Standard Project'}</h3>
                            <button className="sp-close-btn" onClick={closeModal}><XCircle size={24}/></button>
                        </div>
                        <form onSubmit={handleSubmit} className="sp-form">
                            <div className="sp-form-group">
                                <label htmlFor="input-155">Project Name *</label>
                                <input id="input-155" 
                                    type="text" 
                                    required
                                    value={form.name}
                                    onChange={e => setForm({...form, name: e.target.value})}
                                    placeholder="e.g. Text-Based Adventure"
                                />
                            </div>
                            <div className="sp-form-group">
                                <label htmlFor="input-165">Description</label>
                                <textarea id="input-165" 
                                    value={form.description}
                                    onChange={e => setForm({...form, description: e.target.value})}
                                    rows="4"
                                    placeholder="Description template..."
                                />
                            </div>
                            <div className="sp-form-group">
                                <label htmlFor="input-chapter">Chapter Mapping</label>
                                <input id="input-chapter" 
                                    type="text" 
                                    value={form.chapter}
                                    onChange={e => setForm({...form, chapter: e.target.value})}
                                    placeholder="e.g. Computer Science 2"
                                />
                            </div>
                            <div className="sp-form-row">
                                <div className="sp-form-group">
                                    <label htmlFor="input-175">Default Demo Link</label>
                                    <input id="input-175" type="text" value={form.link} onChange={e => setForm({...form, link: e.target.value})} />
                                </div>
                                <div className="sp-form-group">
                                    <label htmlFor="input-179">Default GitHub Link</label>
                                    <input id="input-179" type="text" value={form.github_link} onChange={e => setForm({...form, github_link: e.target.value})} />
                                </div>
                            </div>
                            <div className="sp-form-row">
                                <div className="sp-form-group">
                                    <label htmlFor="input-185">Default Video URL</label>
                                    <input id="input-185" type="text" value={form.video_url} onChange={e => setForm({...form, video_url: e.target.value})} />
                                </div>
                                <div className="sp-form-group">
                                    <label htmlFor="input-189">Default Thumbnail Image URL</label>
                                    <input id="input-189" type="text" value={form.image_url} onChange={e => setForm({...form, image_url: e.target.value})} />
                                </div>
                            </div>
                            <div className="sp-form-group">
                                <label htmlFor="input-194">Default Code Snippet</label>
                                <textarea id="input-194" 
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
