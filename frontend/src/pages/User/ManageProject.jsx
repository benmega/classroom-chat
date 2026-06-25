import React, { useState, useRef, useEffect } from 'react';
import { Save, Trash2, Upload, Link as LinkIcon, Video, Code, Camera, Image as ImageIcon, CheckCircle, ExternalLink, Play, Youtube, ArrowRight, ArrowLeft } from 'lucide-react';
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
    const [activeTab, setActiveTab] = useState('core'); // 'core', 'media', 'code'
    const descRef = useRef(null);

    const onRecordingComplete = (blob) => {
        handleRecordedVideo(blob);
        setIsRecorderOpen(false);
    };

    useEffect(() => {
        if (activeTab === 'core' && descRef.current) {
            adjustTextareaHeight(descRef.current);
        }
    }, [activeTab, projectData.description, adjustTextareaHeight]);

    const handleNext = () => {
        if (activeTab === 'core') setActiveTab('media');
        else if (activeTab === 'media') setActiveTab('code');
    };

    const handleBack = () => {
        if (activeTab === 'code') setActiveTab('media');
        else if (activeTab === 'media') setActiveTab('core');
    };

    if (isLoading) return <div className="loading-container">Loading...</div>;

    if (error === 'forbidden') return <AccessDenied />;
    if (error === 'not_found') return <NotFound message="The project you are looking for does not exist or you do not have permission to view it." />;

    return (
        <div className="manage-project-page">
            <form onSubmit={handleSubmit} className="manage-project-grid">
                
                {/* LEFT COLUMN: Input Form */}
                <div className="form-column">
                    <div className="form-wizard-header">
                        <div className={`step ${activeTab === 'core' ? 'active' : ''}`} onClick={() => setActiveTab('core')}>1. Core Info</div>
                        <div className={`step ${activeTab === 'media' ? 'active' : ''}`} onClick={() => setActiveTab('media')}>2. Media</div>
                        <div className={`step ${activeTab === 'code' ? 'active' : ''}`} onClick={() => setActiveTab('code')}>3. Code</div>
                    </div>

                    {currentUser?.is_admin && (
                        <div className="admin-controls-panel">
                            <h4>Admin Controls</h4>
                            <div className="form-group">
                                <label>Assign to Student</label>
                                <select name="student_id" value={projectData.student_id || ''} onChange={handleInputChange} className="form-control" required>
                                    <option value="">Select Student</option>
                                    {students.map(s => <option key={s.id} value={s.id}>{s.username}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Teacher Comment</label>
                                <textarea name="teacher_comment" value={projectData.teacher_comment || ''} onChange={(e) => { handleInputChange(e); adjustTextareaHeight(e.target); }} rows="2" className="form-control admin-textarea" />
                            </div>
                        </div>
                    )}

                    <div className="form-wizard-content">
                        {activeTab === 'core' && (
                            <div className="form-section fade-in">
                                <h3>Core Information</h3>
                                <div className="form-group">
                                    <label>Project Name</label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={projectData.name || ''}
                                        onChange={handleInputChange}
                                        placeholder="e.g. My Awesome Platformer"
                                        className="form-control title-input-left"
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Description</label>
                                    <textarea
                                        ref={descRef}
                                        name="description"
                                        value={projectData.description || ''}
                                        onChange={(e) => { handleInputChange(e); adjustTextareaHeight(e.target); }}
                                        placeholder="What is this project about? What did you learn?"
                                        className="form-control desc-input-left"
                                        rows="4"
                                    />
                                </div>
                                <div className="form-group">
                                    <label>Demo Link <span className="optional-badge">Optional</span></label>
                                    <div className="video-input-wrapper">
                                        <LinkIcon size={16} className="input-icon" />
                                        <input
                                            type="url"
                                            name="link"
                                            value={projectData.link || ''}
                                            onChange={handleInputChange}
                                            placeholder="https://..."
                                            className="form-control with-icon"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'media' && (
                            <div className="form-section fade-in">
                                <h3>Media Assets</h3>
                                
                                <div className="media-input-card">
                                    <h4><ImageIcon size={16} /> Cover Image</h4>
                                    <p className="media-hint">Upload a thumbnail to represent your project.</p>
                                    <label className="file-upload-btn primary-upload">
                                        <Upload size={16} /> {imagePreview || projectData.image_url ? 'Change Cover Image' : 'Upload Image'}
                                        <input type="file" name="project_image" onChange={handleFileChange} accept="image/*" hidden />
                                    </label>
                                </div>

                                <div className="media-input-card">
                                    <h4><Video size={16} /> Video Presentation</h4>
                                    <p className="media-hint">Add a YouTube/Vimeo link, or upload/record a video directly.</p>
                                    
                                    <div className="video-input-wrapper">
                                        <Youtube size={16} className="input-icon" />
                                        <input 
                                            type="text" 
                                            name="video_url" 
                                            value={projectData.video_url || ''} 
                                            onChange={handleInputChange} 
                                            placeholder="YouTube/Vimeo URL" 
                                            className="form-control with-icon" 
                                        />
                                    </div>
                                    <div className="or-divider"><span>OR</span></div>
                                    <div className="video-upload-actions">
                                        <label className="file-upload-btn secondary-upload">
                                            <Upload size={16} /> Upload Video
                                            <input type="file" name="project_video" onChange={handleFileChange} accept="video/*" hidden />
                                        </label>
                                        <button type="button" className="file-upload-btn action-record" onClick={() => setIsRecorderOpen(true)}>
                                            <Camera size={16} /> Record Screen
                                        </button>
                                    </div>
                                    {projectVideo && <div className="file-name success-text">Selected: {projectVideo.name.split(/[\\/]/).pop()}</div>}
                                </div>
                            </div>
                        )}

                        {activeTab === 'code' && (
                            <div className="form-section fade-in">
                                <h3>Code Showcase</h3>
                                <p className="media-hint">Paste an interesting snippet of your code to show off your logic.</p>
                                <div className="form-group">
                                    <textarea
                                        name="code_snippet"
                                        value={projectData.code_snippet || ''}
                                        onChange={handleInputChange}
                                        className="form-control inline-code-editor"
                                        placeholder="def my_awesome_function():\n    pass"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                </div>

                {/* RIGHT COLUMN: Live Preview */}
                <div className="preview-column">
                    <div className="preview-sticky-container">
                        <div className={`preview-card-wrapper highlight-${activeTab}`}>
                            <div className="project-presentation-card">
                                
                                <div className="preview-section-media">
                                    <div className="hero-background">
                                        <SmartImage src={imagePreview || formatStaticUrl(projectData.image_url) || null} alt={projectData.name || 'Cover'} fallbackType="project" />
                                        {(projectData.video_url || projectVideo) && <div className="play-overlay"><Play size={48} fill="currentColor" /></div>}
                                    </div>
                                </div>

                                <div className="preview-section-core">
                                    <h1 className={projectData.name ? '' : 'placeholder-text'}>
                                        {projectData.name || 'Project Name...'}
                                    </h1>
                                    
                                    {projectData.link && (
                                        <div className="link-preview">
                                            <ExternalLink size={14} /> {projectData.link}
                                        </div>
                                    )}

                                    <p className={`preview-desc ${projectData.description ? '' : 'placeholder-text'}`}>
                                        {projectData.description || 'Tell the story of your project...'}
                                    </p>
                                    
                                    {projectData.teacher_comment && (
                                        <div className="card-teacher-feedback mt-3">
                                            <CheckCircle size={14} /> Teacher Note: {projectData.teacher_comment}
                                        </div>
                                    )}
                                </div>

                                <div className="preview-section-code">
                                    {projectData.code_snippet ? (
                                        <div className="inline-code-section">
                                            <h4><Code size={16} /> Code Snippet</h4>
                                            <pre className="code-preview-block"><code>{projectData.code_snippet}</code></pre>
                                        </div>
                                    ) : (
                                        <div className="inline-code-section placeholder-code">
                                            <h4><Code size={16} /> Code Snippet</h4>
                                            <div className="no-code-preview">Source code preview not available.</div>
                                        </div>
                                    )}
                                </div>

                            </div>
                        </div>
                    </div>
                </div>

                {/* Floating Bottom Bar */}
                <div className="floating-action-bar">
                    <div className="footer-left">
                        <button type="button" onClick={() => navigate('/profile')} className="btn-cancel">
                            Cancel
                        </button>
                        {projectId && (
                            <button type="button" onClick={handleDelete} className="btn-delete">
                                <Trash2 size={18} /> Delete Project
                            </button>
                        )}
                    </div>
                    
                    <div className="footer-actions">
                        {activeTab !== 'core' && (
                            <button type="button" className="btn-secondary-outline" onClick={handleBack}>
                                <ArrowLeft size={16} /> Back
                            </button>
                        )}
                        {activeTab !== 'code' ? (
                            <button type="button" className="btn-primary" onClick={handleNext}>
                                Next <ArrowRight size={16} />
                            </button>
                        ) : (
                            <button type="submit" disabled={isSaving} className="btn-save">
                                <Save size={18} /> {isSaving ? 'Saving...' : (projectId ? 'Update Project' : 'Create Project')}
                            </button>
                        )}
                    </div>
                </div>
            </form>

            <ScreenRecorder
                isOpen={isRecorderOpen}
                onClose={() => setIsRecorderOpen(false)}
                onRecordingComplete={onRecordingComplete}
            />
        </div>
    );
};

export default ManageProject;
