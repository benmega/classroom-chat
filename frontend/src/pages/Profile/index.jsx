import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
    User, 
    Settings, 
    Award, 
    Code, 
    Plus, 
    ExternalLink, 
    Play, 
    Trash2, 
    Camera, 
    Upload, 
    ChevronLeft, 
    ChevronRight,
    X,
    CheckCircle,
    Calendar,
    StickyNote,
} from 'lucide-react';
import client from '../../api/client';
import useAuthStore from '../../store/useAuthStore';
import toast from 'react-hot-toast';
import './Profile.css';
import '../../assets/css/sprite.css'; 
import SmartImage from '../../components/common/SmartImage';
import ContributionGraph from '../../components/profile/ContributionGraph';
import { formatLargeNumber } from '../../utils/formatters';

// Internal components
const LayersIcon = ({ size }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>;
const ActivityIcon = ({ size }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>;

const getYoutubeEmbedUrl = (url) => {
    if (!url) return null;
    try {
        // Robust regex to capture video IDs from various YouTube URL formats (watch, embed, v, shorts, live, youtu.be)
        const ytRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/live\/)([^"&?\/\s]{11})/i;
        const ytMatch = url.match(ytRegex);
        const ytId = ytMatch ? ytMatch[1] : null;
        
        if (ytId) {
            return `https://www.youtube.com/embed/${ytId}?rel=0`;
        }
        
        // Handle Vimeo
        if (url.includes('vimeo.com')) {
            const vimeoRegex = /vimeo\.com\/(?:video\/)?(\d+)/;
            const vimeoMatch = url.match(vimeoRegex);
            if (vimeoMatch) {
                return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
            }
        }
        
        return null;
    } catch (e) {
        console.error("Error parsing video URL:", e);
        return null;
    }
};

const Profile = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const { checkAuth } = useAuthStore();
    const [profileData, setProfileData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedProject, setSelectedProject] = useState(null);
    const [slideshowIndex, setSlideshowIndex] = useState(null);
    
    const fileInputRef = useRef(null);
    const cameraInputRef = useRef(null);
    const pfpInputRef = useRef(null);

    // Profile Picture Cropping State
    const [isCropping, setIsCropping] = useState(false);
    const [cropImage, setCropImage] = useState(null);
    const [isUploadingPic, setIsUploadingPic] = useState(false);
    const cropperRef = useRef(null);
    const cropImgRef = useRef(null);

    const fetchProfile = useCallback(async () => {
        setIsLoading(true);
        try {
            const endpoint = slug ? `/user/profile/${slug}` : '/user/profile';
            const response = await client.get(endpoint);
            setProfileData(response.data.data);
        } catch {
            toast.error('Failed to load profile.');
            if (!slug) navigate('/login');
        } finally {
            setIsLoading(false);
        }
    }, [navigate, slug]);

    useEffect(() => {
        fetchProfile();
    }, [slug, fetchProfile]);

    const isOwner = profileData?.viewer?.id === profileData?.target?.id || profileData?.viewer?.is_admin;

    const handleDeleteNote = async (noteId) => {
        if (!window.confirm('Delete this note?')) return;
        try {
            await client.post(`/notes/delete/${noteId}`);
            toast.success('Note deleted.');
            setProfileData(prev => ({
                ...prev,
                target: {
                    ...prev.target,
                    notes: prev.target.notes.filter(n => n.id !== noteId)
                }
            }));
        } catch {
            toast.error('Failed to delete note.');
        }
    };

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('note', file);

        try {
            const response = await client.post('/notes/upload', formData);
            if (response.data.status === 'success') {
                toast.success('Note uploaded!');
                fetchProfile();
            }
        } catch {
            toast.error('Upload failed.');
        }
    };

    const handlePfpChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
            toast.error('Please select a valid image file (JPG, PNG, WebP).');
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            setCropImage(reader.result);
            setIsCropping(true);
        };
        reader.readAsDataURL(file);
    };

    const handleSaveCrop = async () => {
        if (!cropperRef.current) return;
        setIsUploadingPic(true);

        try {
            const canvas = cropperRef.current.getCroppedCanvas({
                width: 300,
                height: 300,
                imageSmoothingQuality: 'high'
            });

            canvas.toBlob(async (blob) => {
                if (!blob) {
                    toast.error('Failed to process image.');
                    setIsUploadingPic(false);
                    return;
                }

                const formData = new FormData();
                formData.append('profile_picture', blob, 'profile.jpg');

                try {
                    const response = await client.post('/user/api/profile-picture', formData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });

                    if (response.data.status === 'success') {
                        toast.success('Profile picture updated!');
                        setIsCropping(false);
                        fetchProfile();
                        if (profileData.viewer?.id === profileData.target?.id) {
                            checkAuth();
                        }
                    } else {
                        toast.error(response.data.error || 'Upload failed.');
                    }
                } catch (err) {
                    toast.error(err.response?.data?.error || 'Server error during upload.');
                } finally {
                    setIsUploadingPic(false);
                }
            }, 'image/jpeg', 0.9);
        } catch (err) {
            console.error('Cropping error:', err);
            toast.error('Error cropping image.');
            setIsUploadingPic(false);
        }
    };

    useEffect(() => {
        if (isCropping) {
            const loadCropper = async () => {
                if (typeof window.Cropper === 'undefined') {
                    const link = document.createElement('link');
                    link.rel = 'stylesheet';
                    link.href = '/static/lib/cropper.min.css';
                    document.head.appendChild(link);

                    const script = document.createElement('script');
                    script.src = '/static/lib/cropper.min.js';
                    script.async = true;
                    script.onload = () => initCropper();
                    document.body.appendChild(script);
                } else {
                    initCropper();
                }
            };

            const initCropper = () => {
                setTimeout(() => {
                    if (cropImgRef.current) {
                        cropperRef.current = new window.Cropper(cropImgRef.current, {
                            aspectRatio: 1,
                            viewMode: 2,
                            dragMode: 'move',
                            autoCropArea: 0.8,
                            restore: false,
                            guides: true,
                            center: true,
                            highlight: false,
                            cropBoxMovable: true,
                            cropBoxResizable: true,
                            minCropBoxWidth: 100,
                            minCropBoxHeight: 100,
                        });
                    }
                }, 100);
            };

            loadCropper();
        }

        return () => {
            if (cropperRef.current) {
                cropperRef.current.destroy();
                cropperRef.current = null;
            }
        };
    }, [isCropping]);

    if (isLoading) return <div className="profile-loading">Loading Profile...</div>;
    if (!profileData) return <div className="profile-error">Profile not found.</div>;

    const { target } = profileData;

    return (
        <div className="profile-page">
            <div className="profile-header-card">
                <div className="header-background"></div>
                <div className="profile-header-content">
                    <div className="avatar-wrapper" onClick={() => isOwner && pfpInputRef.current?.click()}>
                        <SmartImage 
                            src={target.profile_picture_url} 
                            alt={target.username} 
                            className="avatar-img"
                            fallbackType="avatar"
                        />
                        {isOwner && (
                            <>
                                <div className="upload-overlay">
                                    <span>Change Photo</span>
                                </div>
                                <input 
                                    type="file" 
                                    ref={pfpInputRef} 
                                    hidden 
                                    accept="image/*" 
                                    onChange={handlePfpChange} 
                                />
                            </>
                        )}
                    </div>

                    <div className="student-identity">
                        <h1 className="student-name">{target.nickname || target.username}</h1>
                        <p className="student-title">@{target.username}</p>
                        {isOwner && (
                            <Link to="/settings" className="btn-settings">
                                <User size={14} /> Edit Profile
                            </Link>
                        )}
                    </div>

                    <div className="header-stats">
                        <div className="stat-box" title={target.duck_balance?.toLocaleString()}>
                            <span className="label">Ducks</span>
                            <span className="value">{formatLargeNumber(target.duck_balance)}</span>
                        </div>
                        
                        <div className="stat-divider"></div>

                        <div className="stat-box">
                            <span className="label">Levels</span>
                            <span className="value">{target.total_levels || 0}</span>
                        </div>
                        
                        <div className="stat-divider"></div>

                        <div className="stat-box">
                            <span className="label">Projects</span>
                            <span className="value">{target.projects?.length || 0}</span>
                        </div>
                        
                        {target.packets > 0 && (
                            <>
                                <div className="stat-divider"></div>
                                <div className="stat-box" title={target.packets.toLocaleString()}>
                                    <span className="label">Packets</span>
                                    <span className="value">{formatLargeNumber(target.packets)}</span>
                                </div>
                            </>
                        )}
                        
                        <div className="stat-divider"></div>

                        <div className="stat-box highlight" title={target.earned_ducks?.toLocaleString()}>
                            <span className="label">Lifetime</span>
                            <span className="value">{formatLargeNumber(target.earned_ducks)}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="dashboard-grid">
                <div className="column-left">
                    {target.bio && (
                        <section className="dashboard-panel">
                            <div className="panel-header">
                                <h2><User size={20} /> About Me</h2>
                            </div>
                            <div className="bio-panel-content">
                                <p className="bio-text">{target.bio}</p>
                            </div>
                        </section>
                    )}

                    <section className="dashboard-panel">
                        <div className="panel-header">
                            <h2><ActivityIcon size={20} /> Course Progress</h2>
                        </div>
                        <div className="progress-list-container">
                            <div className="progress-list">
                                <div className="progress-item">
                                    <div className="prog-label">
                                        <span>CodeCombat</span>
                                        <span>{target.cc_percent || 0}%</span>
                                    </div>
                                    <div className="progress-track">
                                        <div className="progress-fill" style={{ width: `${target.cc_percent || 0}%` }}></div>
                                    </div>
                                    <small>{target.cc_levels || 0} Levels Completed</small>
                                </div>
                                {target.oz_levels > 0 && (
                                    <div className="progress-item">
                                        <div className="prog-label">
                                            <span>Ozaria</span>
                                            <span>{target.oz_percent || 0}%</span>
                                        </div>
                                        <div className="progress-track">
                                            <div className="progress-fill ozaria" style={{ width: `${target.oz_percent || 0}%` }}></div>
                                        </div>
                                        <small>{target.oz_levels} Levels Completed</small>
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>

                    {target.certificates?.length > 0 && (
                        <section className="dashboard-panel">
                            <div className="panel-header">
                                <h2><Award size={20} /> Certifications</h2>
                            </div>
                        <div className="cert-list-container">
                            <div className="cert-list">
                                {target.certificates.map(cert => (
                                    <div key={cert.id} className="cert-item" onClick={() => cert.file_path && window.open(`/api/achievements/view_certificate/${cert.id}`, '_blank')}>
                                        <div className="cert-icon">
                                            <div className={`badge badge-${cert.achievement?.slug || 'default'}`}></div>
                                        </div>
                                        <div className="cert-info">
                                            <h4>{cert.achievement?.name || 'Certification'}</h4>
                                            <span className="cert-date">{new Date(cert.submitted_at).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
                    )}

                    {target.achievements?.length > 0 && (
                        <section className="dashboard-panel">
                            <div className="panel-header">
                                <h2><Award size={20} /> Recent Achievements</h2>
                            </div>
                            <div className="achievement-strip-container">
                                <div className="achievement-strip">
                                    {target.achievements.map(ua => (
                                        <div key={ua.id} className="ach-strip-item" title={ua.achievement?.description}>
                                            <div className={`badge badge-${ua.achievement?.slug || 'default'} mini`}>&nbsp;</div>
                                            <div className="ach-strip-info">
                                                <span className="ach-name">{ua.achievement?.name}</span>
                                                <span className="ach-date">{new Date(ua.earned_at).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>
                    )}

                    {target.skills?.length > 0 && (
                        <section className="dashboard-panel">
                            <div className="panel-header">
                                <h2><Code size={20} /> Technical Skills</h2>
                            </div>
                            <div className="skill-grid-container">
                                <div className="skill-grid">
                                    {target.skills.filter(s => s.category !== 'concept').map(skill => (
                                        <div key={skill.id} className={`skill-card proficiency-${skill.proficiency}`}>
                                            <i className={skill.icon}></i>
                                            <span>{skill.name}</span>
                                            <div className="skill-level">Lvl {skill.proficiency}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>
                    )}
                </div>

                <div className="column-right">
                    <section className="dashboard-panel">
                        <div className="panel-header between">
                            <h2><LayersIcon size={20} /> Projects Portfolio</h2>
                            {isOwner && (
                                <Link to="/project/new" className="btn-add">
                                    <Plus size={16} /> Add Project
                                </Link>
                            )}
                        </div>
                                <div className="projects-grid-container">
                                    <div className="projects-grid">
                                        {target.projects?.map(project => (
                                            <div key={project.id} className="project-card">
                                                <div className="project-thumb" onClick={() => setSelectedProject(project)}>
                                                    {project.image_url ? (
                                                        <SmartImage 
                                                            src={`/static/${project.image_url}`} 
                                                            alt={project.name} 
                                                            fallbackType="project"
                                                        />
                                                    ) : (
                                                        <div className="code-placeholder"><Code size={32} /></div>
                                                    )}
                                                    {project.video_url && <div className="play-overlay"><Play size={24} fill="currentColor" /></div>}
                                                    {isOwner && (
                                                        <button className="edit-overlay" onClick={(e) => { e.stopPropagation(); navigate(`/project/edit/${project.id}`); }}>
                                                            <Settings size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="project-content">
                                                    <h3>{project.name}</h3>
                                                    
                                                    {project.teacher_comment && (
                                                        <div className="card-teacher-feedback">
                                                            <CheckCircle size={14} /> {project.teacher_comment.substring(0, 80)}...
                                                        </div>
                                                    )}

                                                    <p>{project.description?.substring(0, 80)}...</p>
                                                    <div className="project-footer">
                                                        {project.link && <a href={project.link} target="_blank" rel="noreferrer" className="link-icon"><ExternalLink size={16} /></a>}
                                                        <button className="btn-text" onClick={() => setSelectedProject(project)}>Details</button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                    </section>

                    <section className="dashboard-panel">
                        <div className="panel-header">
                            <h2><Calendar size={20} /> Coding Activity</h2>
                        </div>
                        <div className="activity-visual">
                            <ContributionGraph data={target.contribution_data} />
                        </div>
                    </section>

                    <section className="dashboard-panel">
                        <div className="panel-header between">
                            <h2><StickyNote size={20} /> Digital Notebook</h2>
                            {isOwner && (
                                <div className="note-actions">
                                    <button className="btn-icon" onClick={() => cameraInputRef.current?.click()} title="Scan Note"><Camera size={18} /></button>
                                    <button className="btn-icon" onClick={() => fileInputRef.current?.click()} title="Upload Note"><Upload size={18} /></button>
                                    <input type="file" ref={fileInputRef} onChange={(e) => handleFileUpload(e, 'upload')} hidden accept="image/*" />
                                    <input type="file" ref={cameraInputRef} onChange={(e) => handleFileUpload(e, 'camera')} hidden accept="image/*" capture="environment" />
                                </div>
                            )}
                        </div>
                                <div className="note-grid-container">
                                    <div className="note-grid">
                                        {target.notes?.map((note, idx) => (
                                            <div key={note.id} className="note-item">
                                                <SmartImage 
                                                    src={note.url} 
                                                    alt="Note" 
                                                    onClick={() => setSlideshowIndex(idx)} 
                                                    fallbackType="project"
                                                />
                                                {isOwner && (
                                                    <button className="delete-note" onClick={() => handleDeleteNote(note.id)}>
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                    </section>
                </div>
            </div>

            {selectedProject && (
                <div className="modal-overlay" onClick={() => setSelectedProject(null)}>
                    <div className="modal-content project-modal" onClick={e => e.stopPropagation()}>
                        <button className="close-modal" onClick={() => setSelectedProject(null)}><X size={24} /></button>
                        <div className="modal-header">
                            <h2>{selectedProject.name}</h2>
                            <div className="modal-actions">
                                {selectedProject.link && <a href={selectedProject.link} className="btn-primary" target="_blank" rel="noreferrer"><ExternalLink size={18} /> Launch Live</a>}
                                {selectedProject.github_link && <a href={selectedProject.github_link} className="btn-secondary" target="_blank" rel="noreferrer"><Code size={18} /> Source</a>}
                            </div>
                        </div>
                        <div className="modal-body">
                            <div className="modal-main">
                                {selectedProject.video_url && (
                                    <div className="video-spotlight">
                                        {getYoutubeEmbedUrl(selectedProject.video_url) ? (
                                            <iframe 
                                                src={getYoutubeEmbedUrl(selectedProject.video_url)} 
                                                title="Project Video Presentation"
                                                frameBorder="0"
                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                                allowFullScreen
                                            ></iframe>
                                        ) : (
                                            <video 
                                                src={selectedProject.video_url} 
                                                controls 
                                                className="direct-video-player"
                                                poster={selectedProject.image_url ? `/static/${selectedProject.image_url}` : null}
                                            >
                                                Your browser does not support the video tag.
                                            </video>
                                        )}
                                    </div>
                                )}
                                <h3>Description</h3>
                                <p>{selectedProject.description}</p>
                                {selectedProject.teacher_comment && (
                                    <div className="teacher-feedback">
                                        <h4><CheckCircle size={16} /> Instructor Review</h4>
                                        <blockquote>"{selectedProject.teacher_comment}"</blockquote>
                                    </div>
                                )}
                            </div>
                            <div className="modal-sidebar">
                                <h3>Technical Logic</h3>
                                {selectedProject.code_snippet ? (
                                    <pre className="code-snippet"><code>{selectedProject.code_snippet}</code></pre>
                                ) : (
                                    <div className="no-code">Source code preview not available.</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {slideshowIndex !== null && (
                <div className="slideshow-overlay" onClick={() => setSlideshowIndex(null)}>
                    <button className="close-slideshow"><X size={32} /></button>
                    <button className="nav-slide prev" onClick={(e) => { e.stopPropagation(); setSlideshowIndex(i => i > 0 ? i - 1 : target.notes.length - 1); }}>
                        <ChevronLeft size={48} />
                    </button>
                    <div className="slide-content" onClick={e => e.stopPropagation()}>
                        <SmartImage 
                            src={target.notes[slideshowIndex].url} 
                            alt="Note full view" 
                            fallbackType="project"
                        />
                    </div>
                    <button className="nav-slide next" onClick={(e) => { e.stopPropagation(); setSlideshowIndex(i => i < target.notes.length - 1 ? i + 1 : 0); }}>
                        <ChevronRight size={48} />
                    </button>
                </div>
            )}

            {isCropping && (
                <div className="modal-overlay crop-modal-overlay">
                    <div className="modal-content crop-modal-content">
                        <div className="modal-header">
                            <h2>Adjust Profile Picture</h2>
                            <button className="close-modal" onClick={() => setIsCropping(false)}><X size={24} /></button>
                        </div>
                        <div className="crop-area">
                            <img ref={cropImgRef} src={cropImage} alt="To crop" style={{ maxWidth: '100%' }} />
                        </div>
                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={() => setIsCropping(false)}>Cancel</button>
                            <button className="btn-primary" onClick={handleSaveCrop} disabled={isUploadingPic}>
                                {isUploadingPic ? 'Saving...' : 'Save Changes'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Profile;
