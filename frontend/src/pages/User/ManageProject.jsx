import React, { useEffect } from 'react';
import { Save, Trash2, Upload, Link as LinkIcon, Video, Code } from 'lucide-react';
import AccessDenied from '../Error/AccessDenied';
import NotFound from '../Error/NotFound';
import useAuthStore from '../../store/useAuthStore';
import './ManageProject.css';
import SmartImage from '../../components/common/SmartImage';

// Hooks
import { useProjectManagement } from '../../hooks/useProjectManagement';

const ManageProject = () => {
    const { user: currentUser } = useAuthStore();
    const {
        projectId,
        projectData,
        students,
        isLoading,
        isSaving,
        imagePreview,
        projectVideo,
        error,
        handleInputChange,
        handleFileChange,
        handleSubmit,
        handleDelete,
        adjustTextareaHeight,
        navigate
    } = useProjectManagement();

    // Initial resize of textareas once data is loaded
    useEffect(() => {
        if (!isLoading) {
            // Use a small timeout to ensure DOM is rendered
            const timer = setTimeout(() => {
                const textareas = document.querySelectorAll('textarea');
                textareas.forEach(textarea => {
                    adjustTextareaHeight(textarea);
                });
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [isLoading, projectData.description, projectData.teacher_comment, projectData.code_snippet, adjustTextareaHeight]);

    if (isLoading) return <div className="loading-container">Loading...</div>;

    if (error === 'forbidden') return <AccessDenied />;
    if (error === 'not_found') return <NotFound message="The project you are looking for does not exist or you do not have permission to view it." />;

    return (
        <div className="manage-project-page">
            <div className="manage-project-container">
                <div className="manage-header">
                    <h2>{projectId ? `Edit Project: ${projectData.name}` : 'Create New Project'}</h2>
                    <p>{projectId ? 'Refine your work and update details.' : 'Showcase your coding masterpiece to the world.'}</p>
                </div>

                <form onSubmit={handleSubmit} className="project-grid-form">
                    <div className="form-column">
                        <section className="form-section card">
                            <h3 className="section-title">Core Details</h3>
                            <div className="form-group">
                                <label>Project Name *</label>
                                <input 
                                    type="text" 
                                    name="name" 
                                    value={projectData.name} 
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
                                        value={projectData.description} 
                                        onChange={handleInputChange} 
                                        rows="6"
                                        placeholder="Tell the story of your project..."
                                        className="form-control"
                                    />
                            </div>

                            {currentUser?.is_admin && (
                                <>
                                    <div className="form-group">
                                        <label>Assign to Student</label>
                                        <select 
                                            name="student_id" 
                                            value={projectData.student_id} 
                                            onChange={handleInputChange}
                                            className="form-control"
                                            required
                                        >
                                            <option value="">Select Student</option>
                                            {students.map(s => (
                                                <option key={s.id} value={s.id}>{s.username}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label>Teacher Comment (Admin Only)</label>
                                        <textarea 
                                            name="teacher_comment" 
                                            value={projectData.teacher_comment} 
                                            onChange={handleInputChange} 
                                            rows="4"
                                            className="form-control admin-textarea"
                                        />
                                    </div>
                                </>
                            )}
                        </section>

                        <section className="form-section card">
                            <h3 className="section-title">Media & Links</h3>
                            <div className="form-group">
                                <label>Project Thumbnail</label>
                                <div className="thumbnail-upload">
                                    {imagePreview && (
                                        <SmartImage 
                                            src={imagePreview} 
                                            alt="Preview" 
                                            className="thumbnail-preview" 
                                            fallbackType="project"
                                        />
                                    )}
                                    <label className="file-upload-btn">
                                        <Upload size={18} /> {imagePreview ? 'Change Image' : 'Upload Image'}
                                        <input type="file" name="project_image" onChange={handleFileChange} accept="image/*" hidden />
                                    </label>
                                </div>
                            </div>
                            <div className="form-group">
                                <label><LinkIcon size={16} /> Demo Link (URL)</label>
                                <input 
                                    type="url" 
                                    name="link" 
                                    value={projectData.link} 
                                    onChange={handleInputChange} 
                                    placeholder="https://..."
                                    className="form-control"
                                />
                            </div>
                            <div className="form-group">
                                <label><Video size={16} /> Video Presentation</label>
                                <input 
                                    type="text" 
                                    name="video_url" 
                                    value={projectData.video_url} 
                                    onChange={handleInputChange} 
                                    placeholder="YouTube/Vimeo URL"
                                    className="form-control"
                                />
                                <div className="video-file-upload">
                                    <label className="file-upload-btn secondary">
                                        <Video size={18} /> {projectVideo ? 'Video Selected' : 'Upload Video File'}
                                        <input type="file" name="project_video" onChange={handleFileChange} accept="video/*" hidden />
                                    </label>
                                    {projectVideo && <span className="file-name">{projectVideo.name.split(/[\\/]/).pop()}</span>}
                                </div>
                            </div>
                        </section>
                    </div>

                    <div className="form-column">
                        <section className="form-section card code-section">
                            <h3 className="section-title"><Code size={18} /> Code Highlight</h3>
                            <p className="hint">Paste the most interesting logic or function from your project here.</p>
                            <textarea 
                                name="code_snippet" 
                                value={projectData.code_snippet} 
                                onChange={handleInputChange} 
                                className="form-control code-editor"
                                placeholder="def my_awesome_logic():\n    pass"
                            />
                        </section>
                    </div>

                    <div className="form-footer">
                        <button type="button" onClick={() => navigate('/profile')} className="btn-cancel">
                            Cancel
                        </button>
                        {projectId && (
                            <button type="button" onClick={handleDelete} className="btn-delete">
                                <Trash2 size={18} /> Delete
                            </button>
                        )}
                        <button type="submit" disabled={isSaving} className="btn-save">
                            <Save size={18} /> {isSaving ? 'Saving...' : (projectId ? 'Update Project' : 'Create Project')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ManageProject;
