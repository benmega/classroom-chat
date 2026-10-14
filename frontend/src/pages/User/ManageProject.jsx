import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Save, Trash2, Upload, Link as LinkIcon, Video, Code, Camera, Image as ImageIcon, ExternalLink, Play, Youtube, ArrowRight, ArrowLeft, AlertCircle, Box, FileCode, FolderUp, Images, Files } from 'lucide-react';
import AccessDenied from '../Error/AccessDenied';
import NotFound from '../Error/NotFound';
import useAuthStore from '../../store/useAuthStore';
import './ManageProject.css';
import SmartImage from '../../components/common/SmartImage';
import ScreenRecorder from '../../components/common/ScreenRecorder';
import Skeleton from '../../components/common/Skeleton';
import ModelViewer from '../../components/common/ModelViewer';
import ProjectFileList from './ProjectFileList';
import { formatStaticUrl } from '../../utils/formatters';
import { getFeedbackStyle } from '../../utils/projectFeedback';
import { acceptForKind, groupProjectFiles, primaryModelFile, projectFileUrl } from '../../utils/projectFiles';
import { modelFormatFromName } from '../../utils/modelFormats';

import { useProjectManagement } from '../../hooks/useProjectManagement';

const PROJECT_TYPE_OPTIONS = [
    { value: 'code', label: 'Code project', Icon: Code },
    { value: '3d', label: '3D model', Icon: Box },
];

const countOf = (count, one, many) => `${count} ${count === 1 ? one : many}`;

// "1 model, 4 source files, 2 assets", naming only the kinds the project will hold
const describeFileCounts = ({ model, source, asset }) => [
    model > 0 && countOf(model, 'model', 'models'),
    source > 0 && countOf(source, 'source file', 'source files'),
    asset > 0 && countOf(asset, 'asset', 'assets'),
].filter(Boolean).join(', ');

const ManageProject = () => {
    const { user: currentUser } = useAuthStore();
    const {
        projectId,
        projectData,
        students,
        templates,
        selectedTemplate,
        isLoading,
        isSaving,
        imagePreview,
        projectVideo,
        isCustomImage,
        error,
        projectType,
        setProjectType,
        existingFiles,
        pendingFiles,
        removedFileIds,
        fileCounts,
        pendingModelPreviewUrl,
        uploadProgress,
        handleInputChange,
        handleTemplateChange,
        handleFileChange,
        handleRecordedVideo,
        addFiles,
        removePendingFile,
        toggleRemoveExisting,
        setCoverFromModelSnapshot,
        handleSubmit,
        handleDelete,
        adjustTextareaHeight,
        navigate
    } = useProjectManagement();

    const [isRecorderOpen, setIsRecorderOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('core');
    const descRef = useRef(null);
    const viewerRef = useRef(null);

    const onRecordingComplete = (blob) => {
        handleRecordedVideo(blob);
        setIsRecorderOpen(false);
    };

    // Once the preview has drawn the model, a frame of it becomes the cover, unless the project has a cover
    // already (asking for the frame renders the scene again, so it is not even taken then)
    const handleModelLoad = useCallback(async () => {
        if (isCustomImage || !viewerRef.current) return;
        try {
            setCoverFromModelSnapshot(await viewerRef.current.snapshot());
        } catch (err) {
            // The cover simply stays as it is; the student can still upload one
            console.error('Failed to make a cover image from the model:', err);
        }
    }, [isCustomImage, setCoverFromModelSnapshot]);

    useEffect(() => {
        if (activeTab === 'core' && descRef.current) {
            adjustTextareaHeight(descRef.current);
        }
    }, [activeTab, projectData.description, adjustTextareaHeight]);

    const handleNext = () => {
        if (activeTab === 'core') setActiveTab('media');
        else if (activeTab === 'media') setActiveTab('code');
        else if (activeTab === 'code' && currentUser?.role === 'admin') setActiveTab('review');
    };

    const handleBack = () => {
        if (activeTab === 'review') setActiveTab('code');
        else if (activeTab === 'code') setActiveTab('media');
        else if (activeTab === 'media') setActiveTab('core');
    };

    if (isLoading) return (
        <div className="manage-project-page" style={{ padding: '0' }}>
            <div className="manage-project-grid">
                <div className="form-column">
                    <div className="form-wizard-header">
                        <Skeleton height="40px" width="30%" borderRadius="8px" />
                        <Skeleton height="40px" width="30%" borderRadius="8px" />
                        <Skeleton height="40px" width="30%" borderRadius="8px" />
                    </div>
                    <div className="form-wizard-content" style={{ marginTop: '1.5rem' }}>
                        <div className="form-section">
                            <Skeleton height="32px" width="40%" style={{ marginBottom: '1.5rem' }} />
                            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                <Skeleton height="20px" width="100px" style={{ marginBottom: '0.5rem' }} />
                                <Skeleton height="45px" borderRadius="8px" />
                            </div>
                            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                <Skeleton height="20px" width="100px" style={{ marginBottom: '0.5rem' }} />
                                <Skeleton height="120px" borderRadius="8px" />
                            </div>
                            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                                <Skeleton height="20px" width="120px" style={{ marginBottom: '0.5rem' }} />
                                <Skeleton height="45px" borderRadius="8px" />
                            </div>
                        </div>
                    </div>
                </div>
                <div className="preview-column">
                    <div className="project-presentation-card card" style={{ padding: '0', overflow: 'hidden', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                        <Skeleton height="220px" borderRadius="12px 12px 0 0" />
                        <div style={{ padding: '1.5rem' }}>
                            <Skeleton height="32px" width="60%" style={{ marginBottom: '1rem' }} />
                            <Skeleton height="18px" width="90%" style={{ marginBottom: '0.5rem' }} />
                            <Skeleton height="18px" width="80%" style={{ marginBottom: '0.5rem' }} />
                            <Skeleton height="18px" width="40%" style={{ marginBottom: '1.5rem' }} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    if (error === 'forbidden') return <AccessDenied />;
    if (error === 'not_found') return <NotFound message="The project you are looking for does not exist or you do not have permission to view it." />;

    const feedback = getFeedbackStyle(projectData.status);
    // A template fixes the type of the projects built from it; an admin can still change it
    const canChooseType = selectedTemplate === 'custom' || currentUser?.role === 'admin';
    const is3d = projectType === '3d';
    const savedFiles = groupProjectFiles(existingFiles);
    const savedModel = primaryModelFile(existingFiles.filter((file) => !removedFileIds.has(file.id)));
    const pendingModel = pendingFiles.model[0];
    // The model the preview shows: a newly picked one first, else the saved one the project keeps
    let previewModel = null;
    if (pendingModel && pendingModelPreviewUrl) {
        previewModel = { src: pendingModelPreviewUrl, name: pendingModel.file.name };
    } else if (savedModel) {
        previewModel = {
            src: projectFileUrl(savedModel),
            name: savedModel.name,
            downloadUrl: projectFileUrl(savedModel, { download: true }),
        };
    }
    const fileSummary = describeFileCounts(fileCounts);

    const pickFiles = (kind) => (e) => {
        addFiles(kind, e.target.files);
        // Cleared so that picking the same file again, say after removing it from the list, still fires a change
        e.target.value = '';
    };

    const renderFileList = (kind, saved, label, emptyText) => (
        <ProjectFileList
            label={label}
            existingFiles={saved}
            pendingFiles={pendingFiles[kind]}
            removedFileIds={removedFileIds}
            onRemovePending={(localId) => removePendingFile(kind, localId)}
            onToggleRemoveExisting={toggleRemoveExisting}
            emptyText={emptyText}
        />
    );

    const modelCard = (
        <div className="media-input-card">
            <h4><Box size={16} /> 3D Model</h4>
            <p className="media-hint">Export from Tinkercad with Export &gt; .STL, or from Blender with File &gt; Export &gt; STL or glTF. We will make a cover image from it if you have none.</p>
            <label className="file-upload-btn primary-upload">
                <Upload size={16} /> Upload 3D Model
                <input type="file" name="model_files" multiple accept={acceptForKind('model')} onChange={pickFiles('model')} className="sr-only" />
            </label>
            {renderFileList('model', savedFiles.models, '3D model files', 'No 3D model yet.')}
        </div>
    );

    return (
        <div className="manage-project-page">
            <form onSubmit={handleSubmit} className="manage-project-form">
                <div className="manage-project-grid">
                    <div className="form-column">
                        {projectData.status === 'rejected' && (
                            <div className="revision-notice-banner">
                                <div className="revision-notice-title">
                                    <AlertCircle size={18} /> Revision Requested
                                </div>
                                {projectData.teacher_comment && (
                                    <p className="revision-notice-feedback">"{projectData.teacher_comment}"</p>
                                )}
                                <p className="revision-notice-subtext">Please make your updates below and save to resubmit your project for review.</p>
                            </div>
                        )}

                        <div className="form-wizard-header">
                            <button type="button" className={`step ${activeTab === 'core' ? 'active' : ''}`} aria-current={activeTab === 'core' ? 'step' : undefined} onClick={() => setActiveTab('core')}>1. Core Info</button>
                            <button type="button" className={`step ${activeTab === 'media' ? 'active' : ''}`} aria-current={activeTab === 'media' ? 'step' : undefined} onClick={() => setActiveTab('media')}>2. Media</button>
                            <button type="button" className={`step ${activeTab === 'code' ? 'active' : ''}`} aria-current={activeTab === 'code' ? 'step' : undefined} onClick={() => setActiveTab('code')}>3. Code &amp; Files</button>
                            {currentUser?.role === 'admin' && (
                                <button type="button" className={`step ${activeTab === 'review' ? 'active' : ''}`} aria-current={activeTab === 'review' ? 'step' : undefined} onClick={() => setActiveTab('review')}>4. Review</button>
                            )}
                        </div>



                        <div className="form-wizard-content">
                            {activeTab === 'core' && (
                                <div className="form-section fade-in">
                                    <h3>Core Information</h3>
                                    <div className="form-group">
                                        <label htmlFor="input-141">Template</label>
                                        <select id="input-141"
                                            name="project_template"
                                            value={selectedTemplate}
                                            onChange={handleTemplateChange}
                                            className="form-control"
                                        >
                                            <option value="custom">Custom Project</option>
                                            {Object.keys(templates).map(t => (
                                                <option key={t} value={t}>{t}</option>
                                            ))}
                                        </select>
                                    </div>
                                    {canChooseType ? (
                                        <fieldset className="project-type-field">
                                            <legend>Project Type</legend>
                                            <div className="project-type-options">
                                                {PROJECT_TYPE_OPTIONS.map((option) => (
                                                    <label key={option.value} className={`project-type-option ${projectType === option.value ? 'selected' : ''}`}>
                                                        <input
                                                            type="radio"
                                                            name="project_type"
                                                            value={option.value}
                                                            checked={projectType === option.value}
                                                            onChange={() => setProjectType(option.value)}
                                                            className="sr-only"
                                                        />
                                                        <option.Icon size={16} /> {option.label}
                                                    </label>
                                                ))}
                                            </div>
                                        </fieldset>
                                    ) : (
                                        <p className="project-type-fixed">
                                            <strong>Project Type:</strong> {PROJECT_TYPE_OPTIONS.find((option) => option.value === projectType)?.label}
                                            <span className="optional-badge">Set by the template</span>
                                        </p>
                                    )}
                                    <div className="form-group">
                                        <label htmlFor="input-155">Project Name</label>
                                        <input id="input-155"
                                            type="text"
                                            name="name"
                                            value={projectData.name || ''}
                                            onChange={handleInputChange}
                                            placeholder="e.g. My Awesome Platformer"
                                            className={`form-control title-input-left ${selectedTemplate !== 'custom' && currentUser?.role !== 'admin' ? 'read-only-input' : ''}`}
                                            required
                                            readOnly={selectedTemplate !== 'custom' && currentUser?.role !== 'admin'}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="input-168">Description</label>
                                        <textarea id="input-168"
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
                                        <label htmlFor="input-180">Demo Link <span className="optional-badge">Optional</span></label>
                                        <div className="video-input-wrapper">
                                            <LinkIcon size={16} className="input-icon" />
                                            <input id="input-180"
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

                                    {is3d && modelCard}

                                    <div className="media-input-card">
                                        <h4><ImageIcon size={16} /> Cover Image</h4>
                                        <p className="media-hint">Upload a thumbnail to represent your project.</p>
                                        <label className="file-upload-btn primary-upload">
                                            <Upload size={16} /> {imagePreview || projectData.image_url ? 'Change Cover Image' : 'Upload Image'}
                                            <input type="file" name="project_image" onChange={handleFileChange} accept="image/*" className="sr-only" />
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
                                                aria-label="Video URL (YouTube or Vimeo)"
                                                className="form-control with-icon" 
                                            />
                                        </div>
                                        <div className="or-divider"><span>OR</span></div>
                                        <div className="video-upload-actions">
                                            <label className="file-upload-btn secondary-upload">
                                                <Upload size={16} /> Upload Video
                                                <input type="file" name="project_video" onChange={handleFileChange} accept="video/*" className="sr-only" />
                                            </label>
                                            <button type="button" className="file-upload-btn action-record" onClick={() => setIsRecorderOpen(true)}>
                                                <Camera size={16} /> Record Screen
                                            </button>
                                        </div>
                                        {projectVideo && <div className="file-name success-text">Selected: {projectVideo.name.split(/[\\/]/).pop()}</div>}
                                    </div>

                                    {!is3d && modelCard}
                                </div>
                            )}

                            {activeTab === 'code' && (
                                <div className="form-section fade-in">
                                    <h3>Code &amp; Files</h3>
                                    {is3d && <p className="media-hint">Everything in this step is optional for a 3D model.</p>}
                                    <div className="form-group">
                                        <label htmlFor="project-code-snippet">Highlighted Code Snippet <span className="optional-badge">Optional</span></label>
                                        <p className="media-hint">Paste the most interesting part of your code. It is shown highlighted on your project.</p>
                                        <textarea id="project-code-snippet"
                                            name="code_snippet"
                                            value={projectData.code_snippet || ''}
                                            onChange={handleInputChange}
                                            className="form-control inline-code-editor"
                                            placeholder="def my_awesome_function():\n    pass"
                                            rows={8}
                                        />
                                    </div>

                                    <div className="media-input-card">
                                        <h4><FileCode size={16} /> Source Files</h4>
                                        <p className="media-hint">Add your code files, or a whole project folder to keep its folders. Hidden folders, node_modules, venv and __pycache__ are left out.</p>
                                        <div className="upload-actions-row">
                                            <label className="file-upload-btn secondary-upload">
                                                <Upload size={16} /> Add Files
                                                <input type="file" name="source_files" multiple accept={acceptForKind('source')} onChange={pickFiles('source')} className="sr-only" />
                                            </label>
                                            <label className="file-upload-btn secondary-upload">
                                                <FolderUp size={16} /> Add a Folder
                                                <input type="file" name="source_folder" multiple webkitdirectory="" onChange={pickFiles('source')} className="sr-only" />
                                            </label>
                                        </div>
                                        {renderFileList('source', savedFiles.sources, 'Source files', 'No source files yet.')}
                                    </div>

                                    <div className="media-input-card">
                                        <h4><Images size={16} /> Assets</h4>
                                        <p className="media-hint">Images, sounds and PDFs that belong to your project.</p>
                                        <label className="file-upload-btn secondary-upload">
                                            <Upload size={16} /> Add Assets
                                            <input type="file" name="asset_files" multiple accept={acceptForKind('asset')} onChange={pickFiles('asset')} className="sr-only" />
                                        </label>
                                        {renderFileList('asset', savedFiles.assets, 'Asset files', 'No assets yet.')}
                                    </div>
                                </div>
                            )}
                            
                            {activeTab === 'review' && currentUser?.role === 'admin' && (
                                <div className="form-section fade-in">
                                    <h3>Review</h3>
                                    <div className="admin-controls-panel" style={{ marginTop: '1.5rem' }}>
                                        <h4>Admin Controls</h4>
                                        <div className="form-group">
                                            <label htmlFor="input-123">Assign to Student</label>
                                            <select id="input-123" name="student_id" value={projectData.student_id || ''} onChange={handleInputChange} className="form-control" required>
                                                <option value="">Select Student</option>
                                                {students.map(s => <option key={s.id} value={s.id}>{s.username}</option>)}
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label htmlFor="input-130">Teacher Comment</label>
                                            <textarea id="input-130" name="teacher_comment" value={projectData.teacher_comment || ''} onChange={(e) => { handleInputChange(e); adjustTextareaHeight(e.target); }} rows="2" className="form-control admin-textarea" />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                    </div>

                    <div className="preview-column">
                        <div className="preview-sticky-container">
                            <div className={`preview-card-wrapper highlight-${activeTab}`}>
                                <div className="project-presentation-card">
                                    
                                    <div className="preview-section-media">
                                        <div className="hero-background">
                                            {previewModel ? (
                                                <ModelViewer
                                                    key={previewModel.src}
                                                    ref={viewerRef}
                                                    src={previewModel.src}
                                                    filename={previewModel.name}
                                                    format={modelFormatFromName(previewModel.name) || undefined}
                                                    downloadUrl={previewModel.downloadUrl}
                                                    ariaLabel={`3D preview of ${previewModel.name}`}
                                                    onLoad={handleModelLoad}
                                                    className="preview-model-viewer"
                                                    compact
                                                />
                                            ) : (
                                                <>
                                                    <SmartImage src={imagePreview || formatStaticUrl(projectData.image_url) || null} alt={projectData.name || 'Cover'} fallbackType="project" />
                                                    {(projectData.video_url || projectVideo) && <div className="play-overlay"><Play size={48} fill="currentColor" /></div>}
                                                </>
                                            )}
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

                                        {fileSummary && (
                                            <p className="preview-file-summary"><Files size={14} /> {fileSummary}</p>
                                        )}
                                        
                                        {projectData.teacher_comment && (
                                            <div className={`card-teacher-feedback mt-3 ${feedback.className}`}>
                                                <feedback.Icon size={14} /> {feedback.noteLabel}: {projectData.teacher_comment}
                                            </div>
                                        )}
                                    </div>

                                    <div className="preview-section-code">
                                        {projectData.code_snippet ? (
                                            <div className="inline-code-section">
                                                <h4><Code size={16} /> Code Snippet</h4>
                                                <pre className="code-preview-block"><code>{projectData.code_snippet}</code></pre>
                                            </div>
                                        ) : is3d ? (
                                            !previewModel && (
                                                <div className="inline-code-section placeholder-code">
                                                    <h4><Box size={16} /> 3D Model</h4>
                                                    <div className="no-code-preview">No 3D model yet. Upload it in the Media step and it will appear at the top, ready to spin and zoom.</div>
                                                </div>
                                            )
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
                </div>

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
                        {(currentUser?.role === 'admin' ? activeTab !== 'review' : activeTab !== 'code') ? (
                            <button type="button" className="btn-primary" onClick={handleNext}>
                                Next <ArrowRight size={16} />
                            </button>
                        ) : (
                            <button type="submit" disabled={isSaving} className="btn-save">
                                <Save size={18} /> {isSaving ? (uploadProgress === null ? 'Saving...' : `Uploading ${uploadProgress}%`) : (projectData.status === 'rejected' ? 'Resubmit for Review' : (projectId ? 'Update Project' : 'Create Project'))}
                            </button>
                        )}
                    </div>
                    {/* Announced in quarter steps: every percent would flood a screen reader */}
                    <span className="sr-only" role="status" aria-live="polite">
                        {uploadProgress === null ? '' : `Uploading your files: ${Math.floor(uploadProgress / 25) * 25} percent done.`}
                    </span>
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
