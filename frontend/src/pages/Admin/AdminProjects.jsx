import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
    CheckCircle, 
    XCircle, 
    ExternalLink, 
    MessageSquare, 
    User, 
    Clock, 
    Filter,
    Search,
    ChevronRight,
    ArrowLeft,
    Code,
    Video,
    Github
} from 'lucide-react';
import client from '../../api/client';
import toast from 'react-hot-toast';
import './AdminProjects.css';
import SmartImage from '../../components/common/SmartImage';
import Skeleton from '../../components/common/Skeleton';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import { formatStaticUrl } from '../../utils/formatters';

const AdminProjects = () => {
    const [projects, setProjects] = useState([]);
    const [filter, setFilter] = useState('pending');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortBy, setSortBy] = useState('newest');
    const [counts, setCounts] = useState({ pending: 0, total: 0 });
    const [isLoading, setIsLoading] = useState(true);
    const [selectedProject, setSelectedProject] = useState(null);
    const [teacherComment, setTeacherComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchProjects = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await client.get(`/api/admin/manage-projects?filter=${filter}`);
            if (response.data.status === 'success') {
                setProjects(response.data.data.projects);
                setCounts({
                    pending: response.data.data.pending_count,
                    total: response.data.data.total_count
                });
            }
        } catch {
            toast.error('Failed to load projects.');
        } finally {
            setIsLoading(false);
        }
    }, [filter]);

    useEffect(() => {
        fetchProjects();
    }, [fetchProjects]);

    const handleReview = async (projectId, action) => {
        if (action === 'approve' && !teacherComment.trim()) {
            toast.error('Please provide feedback before approving.');
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await client.post(`/api/admin/handle-project-review/${projectId}`, {
                action,
                teacher_comment: teacherComment,
                filter_context: filter
            });

            if (response.data.status === 'success') {
                toast.success(response.data.message);
                setSelectedProject(null);
                setTeacherComment('');
                fetchProjects();
            }
        } catch {
            toast.error('Failed to update project.');
        } finally {
            setIsSubmitting(false);
        }
    };

    let processedProjects = [...projects];

    if (statusFilter === 'missing_video') {
        processedProjects = processedProjects.filter(p => !p.video_url);
    } else if (statusFilter === 'missing_work') {
        processedProjects = processedProjects.filter(p => !p.link && !p.github_link && !p.code_snippet);
    } else if (statusFilter === 'needs_feedback') {
        processedProjects = processedProjects.filter(p => !p.teacher_comment);
    }

    if (sortBy === 'newest') {
        processedProjects.sort((a, b) => b.id - a.id);
    } else if (sortBy === 'oldest') {
        processedProjects.sort((a, b) => a.id - b.id);
    }

    if (selectedProject) {
        return (
            <div className="admin-projects-page">
                <AdminPageHeader 
                    title="Review Project"
                />
                
                <div className="project-review-card">
                    <div style={{ marginBottom: '1.5rem' }}>
                        <button 
                            onClick={() => setSelectedProject(null)}
                            style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '8px', 
                                padding: '8px 16px', 
                                background: 'white', 
                                border: '1px solid #e2e8f0', 
                                borderRadius: '10px', 
                                cursor: 'pointer', 
                                fontWeight: '700', 
                                color: '#475569',
                                fontSize: '0.95rem',
                                transition: 'all 0.2s'
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.backgroundColor = '#f8fafc';
                                e.currentTarget.style.borderColor = '#cbd5e1';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.backgroundColor = 'white';
                                e.currentTarget.style.borderColor = '#e2e8f0';
                            }}
                        >
                            <ArrowLeft size={18} /> Back to Projects
                        </button>
                    </div>
                    <div className="review-grid">
                        <div className="project-info-panel">
                            <div className="review-header-flex">
                                <h2>{selectedProject.name}</h2>
                                <Link 
                                    to={`/profile/${selectedProject.user_slug}`} 
                                    className="student-profile-link"
                                    target="_blank"
                                >
                                    <User size={16} /> {selectedProject.user_nickname} (#{selectedProject.user_id})
                                </Link>
                            </div>

                            {selectedProject.image_url && (
                                <div className="review-image-container">
                                    <SmartImage 
                                        src={formatStaticUrl(selectedProject.image_url)} 
                                        alt="Preview" 
                                        className="review-preview-img" 
                                        fallbackType="project"
                                    />
                                </div>
                            )}

                            <p className="description">{selectedProject.description}</p>
                            
                            <div className="links-section">
                                {selectedProject.link && (
                                    <a href={selectedProject.link} target="_blank" rel="noopener noreferrer" className="project-link">
                                        <ExternalLink size={18} /> Launch Demo
                                    </a>
                                )}
                                {selectedProject.github_link && (
                                    <a href={selectedProject.github_link} target="_blank" rel="noopener noreferrer" className="project-link github">
                                        <Github size={18} /> GitHub Repo
                                    </a>
                                )}
                                {selectedProject.video_url && (
                                    <a href={selectedProject.video_url} target="_blank" rel="noopener noreferrer" className="project-link video">
                                        <Video size={18} /> Watch Recording
                                    </a>
                                )}
                            </div>

                            <div className="extra-context-section">
                                {selectedProject.code_snippet && (
                                    <div className="context-block">
                                        <h4><Code size={18} /> Code Snippet</h4>
                                        <pre className="code-view">
                                            <code>{selectedProject.code_snippet}</code>
                                        </pre>
                                    </div>
                                )}

                                {selectedProject.video_transcript && (
                                    <div className="context-block">
                                        <h4><Video size={18} /> Video Transcript</h4>
                                        <div className="transcript-view">
                                            {selectedProject.video_transcript}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="review-actions-panel">
                            <h3 className="section-title"><MessageSquare size={18} /> Teacher Feedback</h3>
                            <textarea 
                                value={teacherComment}
                                onChange={(e) => setTeacherComment(e.target.value)}
                                placeholder="Write constructive feedback for the student..."
                                className="review-textarea"
                                rows="8"
                            />
                            
                            <div className="review-buttons">
                                <button 
                                    onClick={() => handleReview(selectedProject.id, 'reject')}
                                    className="btn-reject"
                                    disabled={isSubmitting}
                                >
                                    <XCircle size={18} /> Mark for Revision
                                </button>
                                <button 
                                    onClick={() => handleReview(selectedProject.id, 'approve')}
                                    className="btn-approve"
                                    disabled={isSubmitting}
                                >
                                    <CheckCircle size={18} /> Approve & Publish
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-projects-page">
            <AdminPageHeader 
                title="Project Submissions"
            >
                <div className="filter-tabs">
                    <button 
                        className={filter === 'pending' ? 'active' : ''} 
                        onClick={() => setFilter('pending')}
                    >
                        Pending <span className="count-badge">{counts.pending}</span>
                    </button>
                    <button 
                        className={filter === 'all' ? 'active' : ''} 
                        onClick={() => setFilter('all')}
                    >
                        All Projects <span className="count-badge">{counts.total}</span>
                    </button>
                </div>
            </AdminPageHeader>

            <div className="controls-bar">
                <div className="filter-sort-controls">
                    <div className="control-group">
                        <Filter size={18} />
                        <select 
                            value={statusFilter} 
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="select-control"
                        >
                            <option value="all">All Statuses</option>
                            <option value="needs_feedback">Needs Feedback</option>
                            <option value="missing_video">Missing Video</option>
                            <option value="missing_work">Missing Work</option>
                        </select>
                    </div>
                    
                    <div className="control-group">
                        <Clock size={18} />
                        <select 
                            value={sortBy} 
                            onChange={(e) => setSortBy(e.target.value)}
                            className="select-control"
                        >
                            <option value="newest">Newest First</option>
                            <option value="oldest">Oldest First</option>
                        </select>
                    </div>
                </div>
            </div>

            {isLoading ? (
                <div className="projects-list-grid">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="admin-project-card">
                            <Skeleton height="180px" borderRadius="12px 12px 0 0" />
                            <div className="p-content" style={{ padding: '20px' }}>
                                <Skeleton height="24px" width="70%" className="skeleton-title" />
                                <Skeleton height="16px" width="40%" />
                                <Skeleton height="40px" width="100%" style={{ marginTop: '15px' }} />
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="projects-list-grid">
                    {processedProjects.length > 0 ? (
                        processedProjects.map(p => (
                            <div key={p.id} className="admin-project-card" onClick={() => {
                                setSelectedProject(p);
                                setTeacherComment(p.teacher_comment || '');
                            }}>
                                <div className="p-thumb">
                                    {p.image_url ? (
                                        <SmartImage 
                                            src={formatStaticUrl(p.image_url)} 
                                            alt="" 
                                            fallbackType="project"
                                        />
                                    ) : (
                                        <div className="no-img"><Clock size={32} /></div>
                                    )}
                                    {/* Removed pending-indicator overlay */}
                                </div>
                                <div className="p-content">
                                    <h3>{p.name}</h3>
                                    <div className="p-meta">
                                        <span className="student-info">
                                            <User size={14} /> {p.user_nickname} 
                                            <span className="id-pill">#{p.user_id}</span>
                                        </span>
                                    </div>
                                    <div className="project-status-tags">
                                        {!p.teacher_comment && (
                                            <span className="p-tag tag-needs-review"><MessageSquare size={12}/> Needs Feedback</span>
                                        )}
                                        {!p.video_url ? (
                                            <span className="p-tag tag-missing"><Video size={12}/> Missing Video</span>
                                        ) : (
                                            <span className="p-tag tag-present"><Video size={12}/> Video</span>
                                        )}
                                        {(!p.link && !p.github_link && !p.code_snippet) ? (
                                            <span className="p-tag tag-missing"><Code size={12}/> Missing Work</span>
                                        ) : (
                                            <span className="p-tag tag-present"><Code size={12}/> Work Submitted</span>
                                        )}
                                    </div>
                                    <p className="p-desc">{p.description?.substring(0, 80)}...</p>
                                    <div className="card-footer">
                                        <span className={`status-text ${p.teacher_comment ? 'approved' : 'pending'}`}>
                                            {p.teacher_comment ? 'Approved' : 'Pending Review'}
                                        </span>
                                        <ChevronRight size={18} />
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="empty-state">No projects found matching your criteria.</div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AdminProjects;
