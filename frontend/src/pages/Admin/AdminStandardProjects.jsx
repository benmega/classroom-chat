import React, { useState, useEffect } from 'react';
import client from '../../api/client';
import toast from 'react-hot-toast';
import { Plus, Edit, X, BookOpen } from 'lucide-react';
import { formatStaticUrl } from '../../utils/formatters';
import Modal from '../../components/common/Modal';
import { ALIGNED_NODES } from '../../constants/courseProgress';
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
                    
                    closeModal();
                    fetchProjects();
                }
            } else {
                const res = await client.post('/api/project-templates', form);
                if (res.data.status === 'success' || res.data.message) {
                    
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
                
                fetchProjects();
            }
        } catch {
            toast.error('Failed to delete standard project.');
        }
    };

    return (
        <div className="admin-standard-projects-page">
            <div className="d-flex justify-end mb-1-5rem">
                <button className="primary-btn" onClick={() => openModal()}>
                    <Plus size={18} /> Add Project
                </button>
            </div>

            {isLoading ? (
                <div className="card p-2rem text-center text-muted">Loading...</div>
            ) : (
                <div className="card" style={{ padding: '24px' }}>
                    <div className="projects-grid">
                        {projects.map(p => (
                            // eslint-disable-next-line
                            <div 
                                key={p.id} 
                                className="project-card" 
                                onClick={() => openModal(p)}
                            >
                                <div 
                                    className="project-card-header" 
                                    style={{ 
                                        backgroundImage: p.image_url ? `url(${formatStaticUrl(p.image_url)})` : 'none',
                                        backgroundColor: p.image_url ? 'transparent' : 'var(--blue-600)'
                                    }}
                                >
                                    {!p.image_url && <BookOpen size={48} />}
                                    <button
                                        type="button"
                                        className="project-remove-btn"
                                        onClick={(e) => { e.stopPropagation(); handleDelete(p.id, p.name); }}
                                        title="Delete Project"
                                        aria-label={`Delete project ${p.name}`}
                                    >
                                        <X size={14} />
                                    </button>
                                </div>
                                <div className="project-card-body">
                                    <div className="project-card-title" title={p.name}>
                                        {p.name}
                                    </div>
                                    <div className="project-card-desc">
                                        {p.description || "No description provided."}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {projects.length === 0 && (
                            <div className="empty-state text-muted" style={{ width: '100%', textAlign: 'center', padding: '20px' }}>
                                No standard projects found.
                            </div>
                        )}
                    </div>
                </div>
            )}

            <Modal isOpen={isModalOpen} onClose={closeModal} title={editingProject ? 'Edit Standard Project' : 'Add Standard Project'}>
                <form onSubmit={handleSubmit} className="admin-form">
                    <div className="form-group">
                        <label htmlFor="input-155">Project Name <span className="text-error">*</span></label>
                        <input id="input-155" 
                            type="text" 
                            required
                            value={form.name}
                            onChange={e => setForm({...form, name: e.target.value})}
                            placeholder="e.g. Text-Based Adventure"
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="input-165">Description</label>
                        <textarea id="input-165" 
                            value={form.description}
                            onChange={e => setForm({...form, description: e.target.value})}
                            rows="4"
                            placeholder="Description template..."
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="input-chapter">Chapter Mapping</label>
                        <select id="input-chapter"
                            className="admin-select"
                            value={form.chapter}
                            onChange={e => setForm({...form, chapter: e.target.value})}
                        >
                            <option value="">Select a chapter...</option>
                            {ALIGNED_NODES.map(node => (
                                <option key={node.id} value={node.title}>{node.title}</option>
                            ))}
                        </select>
                    </div>
                    <div className="form-group">
                        <label htmlFor="input-189">Default Thumbnail Image URL</label>
                        <input id="input-189" type="text" value={form.image_url} onChange={e => setForm({...form, image_url: e.target.value})} />
                    </div>

                    <div className="modal-actions mt-1-5rem d-flex justify-end gap-md">
                        <button type="button" className="btn-secondary" onClick={closeModal} disabled={isSubmitting}>Cancel</button>
                        <button type="submit" className="btn-primary" disabled={isSubmitting}>
                            {isSubmitting ? 'Saving...' : 'Save Template'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default AdminStandardProjects;

