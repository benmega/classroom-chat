import React, { useEffect, useState } from 'react';
import { Save, Trash2, Upload, Link as LinkIcon, Video, Code, Camera, LayoutTemplate, Image as ImageIcon, CheckCircle, ExternalLink, Play, Youtube, Monitor, FileVideo } from 'lucide-react';
import AccessDenied from '../Error/AccessDenied';
import NotFound from '../Error/NotFound';
import useAuthStore from '../../store/useAuthStore';
import './ManageProject.css';
import SmartImage from '../../components/common/SmartImage';
import ScreenRecorder from '../../components/common/ScreenRecorder';
import { formatStaticUrl } from '../../utils/formatters';

// Hooks
import { useProjectManagement } from '../../hooks/useProjectManagement';

const ManageProject = () => {
    const { currentUser } = useAuthStore();
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
        handleRecordedVideo,
        handleSubmit,
        handleDelete,
        adjustTextareaHeight,
        navigate
    } = useProjectManagement();

    const [isRecorderOpen, setIsRecorderOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('core');
    const [videoInputType, setVideoInputType] = useState('url'); // 'url', 'file', 'record'

    const onRecordingComplete = (blob) => {
        handleRecordedVideo(blob);
        setIsRecorderOpen(false);
    };

    if (isLoading) return <div className="loading-container">Loading...</div>;

    if (error === 'forbidden') return <AccessDenied />;
    if (error === 'not_found') return <NotFound message="The project you are looking for does not exist or you do not have permission to view it." />;

    return (
        <div className="manage-project-page split-layout">
            <div className="editor-pane">
                <div className="manage-header">
                    <h2>{projectId ? `Edit Project: ${projectData.name}` : 'Create New Project'}</h2>
                </div>

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
                        <ImageIcon size={16} /> Media
                    </button>
                    <button 
                        type="button"
                        className={`tab-btn ${activeTab === 'code' ? 'active' : ''}`}
                        onClick={() => setActiveTab('code')}
                    >
                        <Code size={16} /> Code Showcase
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="project-editor-form">
                    <div className="tab-content">
                        {activeTab === 'core' && (
                            <section className="form-section fade-in">
                                <div className="form-group">
                                    <label>Project Name *</label>
                                    <input 
                                        type="text" 
                                        name="name" 
                                        value={projectData.name || ''} 
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
                                        value={projectData.description || ''} 
                                        onChange={(e) => {
                                            handleInputChange(e);
                                            adjustTextareaHeight(e.target);
                                        }} 
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
                                                value={projectData.student_id || ''} 
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
                                                value={projectData.teacher_comment || ''} 
                                                onChange={(e) => {
                                                    handleInputChange(e);
                                                    adjustTextareaHeight(e.target);
                                                }} 
                                                rows="4"
                                                className="form-control admin-textarea"
                                            />
                                        </div>
                                    </>
                                )}
                            </section>
                        )}

                        {activeTab === 'media' && (
                            <section className="form-section fade-in">
                                <div className="form-group">
                                    <label><Video size={16} /> Video Presentation</label>
                                    
                                    <div className="video-type-selector">
                                        <button 
                                            type="button" 
                                            className={`video-type-btn ${videoInputType === 'url' ? 'active' : ''}`}
                                            onClick={() => setVideoInputType('url')}
                                        >
                                            <Youtube size={16} /> URL
                                        </button>
                                        <button 
                                            type="button" 
                                            className={`video-type-btn ${videoInputType === 'file' ? 'active' : ''}`}
                                            onClick={() => setVideoInputType('file')}
                                        >
                                            <FileVideo size={16} /> Upload
                                        </button>
                                        <button 
                                            type="button" 
                                            className={`video-type-btn ${videoInputType === 'record' ? 'active' : ''}`}
                                            onClick={() => setVideoInputType('record')}
                                        >
                                            <Monitor size={16} /> Record
                                        </button>
                                    </div>

                                    <div className="video-input-container">
                                        {videoInputType === 'url' && (
                                            <input 
                                                type="text" 
                                                name="video_url" 
                                                value={projectData.video_url || ''} 
                                                onChange={handleInputChange} 
                                                placeholder="YouTube/Vimeo URL"
                                                className="form-control"
                                            />
                                        )}
                                        {videoInputType === 'file' && (
                                            <div className="video-file-upload">
                                                <label className="file-upload-btn secondary">
                                                    <Video size={18} /> {projectVideo ? 'Video Selected' : 'Upload Video File'}
                                                    <input type="file" name="project_video" onChange={handleFileChange} accept="video/*" hidden />
                                                </label>
                                                {projectVideo && <div className="file-name">{projectVideo.name.split(/[\\/]/).pop()}</div>}
                                            </div>
                                        )}
                                        {videoInputType === 'record' && (
                                            <div className="video-file-upload">
                                                <button 
                                                    type="button" 
                                                    className="file-upload-btn action-record" 
                                                    onClick={() => setIsRecorderOpen(true)}
                                                >
                                                    <Camera size={18} /> Record Screen
                                                </button>
                                                {projectVideo && <div className="file-name">{projectVideo.name.split(/[\\/]/).pop()}</div>}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>Project Thumbnail</label>
                                    <div className="thumbnail-upload compact">
                                        <label className="file-upload-btn primary">
                                            <Upload size={18} /> {imagePreview ? 'Change Image' : 'Upload Image'}
                                            <input type="file" name="project_image" onChange={handleFileChange} accept="image/*" hidden />
                                        </label>
                                        {imagePreview && <span className="success-text">Image Selected</span>}
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label><LinkIcon size={16} /> Demo Link</label>
                                    <input 
                                        type="url" 
                                        name="link" 
                                        value={projectData.link || ''} 
                                        onChange={handleInputChange} 
                                        placeholder="https://..."
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
                                    value={projectData.code_snippet || ''} 
                                    onChange={handleInputChange} 
                                    className="form-control code-editor h-full"
                                    placeholder="def my_awesome_logic():\n    pass"
                                />
                            </section>
                        )}
                    </div>

                    <div className="form-footer sticky-footer">
                        <button type="button" onClick={() => navigate('/profile')} className="btn-cancel">
                            Cancel
                        </button>
                        <div className="action-group">
                            {projectId && (
                                <button type="button" onClick={handleDelete} className="btn-delete">
                                    <Trash2 size={18} /> Delete
                                </button>
                            )}
                            <button type="submit" disabled={isSaving} className="btn-save">
                                <Save size={18} /> {isSaving ? 'Saving...' : (projectId ? 'Update Project' : 'Create Project')}
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
                                src={imagePreview || formatStaticUrl(projectData.image_url) || null} 
                                alt={projectData.name || 'Preview'} 
                                fallbackType="project"
                            />
                            {(projectData.video_url || projectVideo) && (
                                <div className="play-overlay"><Play size={24} fill="currentColor" /></div>
                            )}
                        </div>
                        <div className="project-content">
                            <h3>{projectData.name || 'Project Name'}</h3>
                            
                            {projectData.teacher_comment && (
                                <div className="card-teacher-feedback">
                                    <CheckCircle size={14} /> {projectData.teacher_comment.substring(0, 80)}{projectData.teacher_comment.length > 80 ? '...' : ''}
                                </div>
                            )}

                            <p className="preview-desc">
                                {projectData.description ? 
                                    (projectData.description.length > 150 ? projectData.description.substring(0, 150) + '...' : projectData.description) 
                                    : 'A short description of your project will appear here...'}
                            </p>
                            
                            <div className="project-footer">
                                {projectData.link && (
                                    <a href="#" className="link-icon" onClick={(e) => e.preventDefault()}><ExternalLink size={16} /></a>
                                )}
                                <button className="btn-text" onClick={(e) => e.preventDefault()}>Details</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <ScreenRecorder 
                isOpen={isRecorderOpen} 
                onClose={() => setIsRecorderOpen(false)} 
                onRecordingComplete={onRecordingComplete} 
            />
        </div>
    );
};

export default ManageProject;
