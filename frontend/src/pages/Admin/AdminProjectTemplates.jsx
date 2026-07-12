import React, { useState, useEffect, useCallback } from 'react';
import { 
    Plus, 
    Edit2, 
    Trash2, 
    RefreshCw,
    Search,
    X,
    ScrollText
} from 'lucide-react';
import client from '../../api/client';
import toast from 'react-hot-toast';
import './AdminProjectTemplates.css';
import Skeleton from '../../components/common/Skeleton';
import AdminPageHeader from '../../components/admin/AdminPageHeader';

const AdminProjectTemplates = () => {
    const [templates, setTemplates] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    
    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    
    // Form fields
    const [formName, setFormName] = useState('');
    const [formDescription, setFormDescription] = useState('');
    const [formErrors, setFormErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Search
    const [searchTerm, setSearchTerm] = useState('');

    const fetchTemplates = useCallback(async (quiet = false) => {
        if (!quiet) setIsLoading(true);
        else setIsRefreshing(true);
        
        try {
            const res = await client.get('/api/project-templates');
            const dataMap = res.data?.data?.templates || {};
            // Convert map to array for list view
            const list = Object.entries(dataMap).map(([name, val]) => ({
                id: val.id,
                name: name,
                description: val.description
            }));
            setTemplates(list);
        } catch (error) {
            toast.error('Failed to load project templates.');
            console.error(error);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchTemplates();
    }, [fetchTemplates]);

    const handleOpenCreateModal = () => {
        setModalMode('create');
        setFormName('');
        setFormDescription('');
        setFormErrors({});
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (template) => {
        setModalMode('edit');
        setSelectedTemplate(template);
        setFormName(template.name);
        setFormDescription(template.description);
        setFormErrors({});
        setIsModalOpen(true);
    };

    const validateForm = () => {
        const errors = {};
        if (!formName.trim()) {
            errors.name = 'Template name is required';
        }
        if (!formDescription.trim()) {
            errors.description = 'Description is required';
        }
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        setIsSubmitting(true);
        const payload = {
            name: formName,
            description: formDescription
        };

        try {
            if (modalMode === 'create') {
                await client.post('/api/project-templates', payload);
                toast.success('Project template created successfully.');
            } else {
                await client.put(`/api/project-templates/${selectedTemplate.id}`, payload);
                toast.success('Project template updated successfully.');
            }
            setIsModalOpen(false);
            fetchTemplates(true);
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to save project template.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to permanently delete this project template? This will not delete student projects based on this template, but the template will no longer be selectable for new projects.')) return;

        try {
            await client.delete(`/api/project-templates/${id}`);
            toast.success('Project template deleted.');
            fetchTemplates(true);
        } catch {
            toast.error('Failed to delete project template.');
        }
    };

    const filteredTemplates = templates.filter(t => 
        t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (isLoading) {
        return (
            <div className="admin-project-templates-page">
                <AdminPageHeader title="Manage Project Templates" />
                <div className="controls-bar">
                    <Skeleton width="300px" height="40px" borderRadius="8px" />
                    <Skeleton width="150px" height="40px" borderRadius="8px" />
                </div>
                <div className="card table-card">
                    <div className="skeleton-table-container">
                        <Skeleton height="40px" width="100%" />
                        <Skeleton height="50px" width="100%" className="mt-12px" />
                        <Skeleton height="50px" width="100%" className="mt-12px" />
                        <Skeleton height="50px" width="100%" className="mt-12px" />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-project-templates-page">
            <AdminPageHeader title="Manage Project Templates" />

            <div className="controls-bar">
                <div className="search-box">
                    <Search size={18} />
                    <input 
                        type="text" 
                        placeholder="Search templates..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="actions-group">
                    <button 
                        onClick={() => fetchTemplates(true)} 
                        className={`btn-refresh ${isRefreshing ? 'spinning' : ''}`}
                        disabled={isRefreshing}
                        title="Refresh Data"
                    >
                        <RefreshCw size={18} />
                    </button>
                    <button className="btn-add" onClick={handleOpenCreateModal}>
                        <Plus size={16} /> Add Template
                    </button>
                </div>
            </div>

            <div className="card table-card">
                <div className="templates-table-container">
                    <table className="templates-table">
                        <thead>
                            <tr>
                                <th className="col-id">ID</th>
                                <th className="col-template-name">Template Name</th>
                                <th>Description</th>
                                <th className="col-actions">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTemplates.length > 0 ? (
                                filteredTemplates.map(template => (
                                    <tr key={template.id}>
                                        <td>
                                            <span className="template-id-badge">#{template.id}</span>
                                        </td>
                                        <td className="template-name-cell">
                                            <ScrollText size={18} className="icon" />
                                            <span className="name-text">{template.name}</span>
                                        </td>
                                        <td className="template-description-cell">
                                            <p className="description-text">{template.description}</p>
                                        </td>
                                        <td>
                                            <div className="table-actions">
                                                <button 
                                                    className="btn-action edit" 
                                                    onClick={() => handleOpenEditModal(template)}
                                                    title="Edit Template"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button 
                                                    className="btn-action delete" 
                                                    onClick={() => handleDelete(template.id)}
                                                    title="Delete Template"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="4" className="empty-row">
                                        No project templates found matching "{searchTerm}"
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Form */}
            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="admin-modal">
                        <div className="modal-header">
                            <h2>{modalMode === 'create' ? 'Create Project Template' : 'Edit Project Template'}</h2>
                            <button className="close-btn" onClick={() => setIsModalOpen(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="modal-form">
                            <div className="form-group">
                                <label htmlFor="template-name">Template Name *</label>
                                <input 
                                    type="text" 
                                    id="template-name" 
                                    value={formName}
                                    onChange={(e) => setFormName(e.target.value)}
                                    placeholder="e.g. CS3 Web Capstone"
                                    className={formErrors.name ? 'error' : ''}
                                    required
                                />
                                {formErrors.name && <span className="error-message">{formErrors.name}</span>}
                            </div>

                            <div className="form-group">
                                <label htmlFor="template-description">Description *</label>
                                <textarea 
                                    id="template-description" 
                                    value={formDescription}
                                    onChange={(e) => setFormDescription(e.target.value)}
                                    placeholder="Provide details about the project requirements, learning goals, and concepts covered..."
                                    rows="6"
                                    className={formErrors.description ? 'error' : ''}
                                    required
                                />
                                {formErrors.description && <span className="error-message">{formErrors.description}</span>}
                            </div>

                            <div className="modal-footer">
                                <button 
                                    type="button" 
                                    className="btn-cancel" 
                                    onClick={() => setIsModalOpen(false)}
                                    disabled={isSubmitting}
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    className="btn-submit" 
                                    disabled={isSubmitting}
                                >
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

export default AdminProjectTemplates;
