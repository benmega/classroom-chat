import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, Trash2, X, Upload, Link as LinkIcon, Video, Code, MessageSquare, User as UserIcon } from 'lucide-react';
import AccessDenied from '../Error/AccessDenied';
import NotFound from '../Error/NotFound';
import client from '../../api/client';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/useAuthStore';
import './ManageProject.css';
import SmartImage from '../../components/common/SmartImage';
import { formatStaticUrl } from '../../utils/formatters';
import { extractVideoThumbnail } from '../../utils/video';

const ManageProject = () => {
    const { projectId } = useParams();
    const navigate = useNavigate();
    const { user: currentUser } = useAuthStore();
    
    const [projectData, setProjectData] = useState({
        name: '',
        description: '',
        link: '',
        github_link: '',
        video_url: '',
        code_snippet: '',
        teacher_comment: '',
        student_id: ''
    });
    
    const [students, setStudents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [projectImage, setProjectImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [projectVideo, setProjectVideo] = useState(null);
    const [isCustomImage, setIsCustomImage] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                // Parallelize API calls
                const [studentRes, projectRes] = await Promise.all([
                    currentUser?.is_admin ? client.get('/user/project/new') : Promise.resolve(null),
                    projectId ? client.get(`/user/project/edit/${projectId}`) : Promise.resolve(null)
                ]);

                if (studentRes) {
                    setStudents(studentRes.data.data.students || []);
                }

                if (projectRes && projectRes.data.status === 'success') {
                    const p = projectRes.data.data.project;
                    setProjectData({
                        name: p.name || '',
                        description: p.description || '',
                        link: p.link || '',
                        github_link: p.github_link || '',
                        video_url: p.video_url || '',
                        code_snippet: p.code_snippet || '',
                        teacher_comment: p.teacher_comment || '',
                        student_id: p.user_id || ''
                    });
                    if (p.image_url) {
                        setImagePreview(formatStaticUrl(p.image_url));
                        setIsCustomImage(true);
                    }
                }
            } catch (error) {
                console.error('Error fetching project data:', error);
                if (error.response?.status === 403) {
                    setError('forbidden');
                } else if (error.response?.status === 404) {
                    setError('not_found');
                } else {
                    toast.error('Failed to load project details.');
                }
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [projectId, currentUser]);

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
    }, [isLoading, projectData.description, projectData.teacher_comment, projectData.code_snippet]);

    const adjustTextareaHeight = (target) => {
        if (!target) return;
        target.style.height = 'auto';
        target.style.height = `${target.scrollHeight}px`;
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setProjectData(prev => ({ ...prev, [name]: value }));
        
        if (e.target.tagName.toLowerCase() === 'textarea') {
            adjustTextareaHeight(e.target);
        }
    };

    const handleFileChange = async (e) => {
        const { name, files } = e.target;
        if (files && files[0]) {
            if (name === 'project_image') {
                setProjectImage(files[0]);
                setImagePreview(URL.createObjectURL(files[0]));
                setIsCustomImage(true);
            } else if (name === 'project_video') {
                setProjectVideo(files[0]);
                
                // If no custom image is selected yet (either new or existing), 
                // try to extract a thumbnail from the video
                if (!isCustomImage) {
                    try {
                        const thumbnailBlob = await extractVideoThumbnail(files[0]);
                        const thumbnailFile = new File([thumbnailBlob], "video_thumbnail.jpg", { type: "image/jpeg" });
                        setProjectImage(thumbnailFile);
                        setImagePreview(URL.createObjectURL(thumbnailFile));
                        toast.success('Generated thumbnail from video!');
                    } catch (err) {
                        console.error('Failed to extract thumbnail:', err);
                        // Non-critical error, just log it
                    }
                }
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSaving(true);

        const formData = new FormData();
        Object.entries(projectData).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                formData.append(key, value);
            }
        });

        if (projectImage) formData.append('project_image', projectImage);
        if (projectVideo) formData.append('project_video', projectVideo);

        try {
            const url = projectId ? `/user/project/edit/${projectId}` : '/user/project/new';
            const response = await client.post(url, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (response.data.status === 'success') {
                toast.success(projectId ? 'Project updated!' : 'Project created!');
                
                // If admin, redirect back to the student's profile if possible
                if (currentUser?.is_admin && projectData.student_id) {
                    const student = students.find(s => String(s.id) === String(projectData.student_id));
                    if (student?.slug) {
                        navigate(`/profile/${student.slug}`);
                        return;
                    }
                }
                
                navigate('/profile');
            } else {
                toast.error(response.data.error || 'Failed to save project.');
            }
        } catch (error) {
            console.error('Save error:', error);
            toast.error(error.response?.data?.error || 'An error occurred.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!window.confirm('Are you sure you want to delete this project?')) return;
        
        setIsSaving(true);
        try {
            const formData = new FormData();
            formData.append('action', 'delete');
            const response = await client.post(`/user/project/edit/${projectId}`, formData);
            if (response.data.status === 'success') {
                toast.success('Project deleted.');
                
                // If admin, redirect back to the student's profile if possible
                if (currentUser?.is_admin && projectData.student_id) {
                    const student = students.find(s => String(s.id) === String(projectData.student_id));
                    if (student?.slug) {
                        navigate(`/profile/${student.slug}`);
                        return;
                    }
                }

                navigate('/profile');
            }
        } catch (error) {
            toast.error('Failed to delete project.');
        } finally {
            setIsSaving(false);
        }
    };

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
