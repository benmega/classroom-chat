import React, { useState, useEffect, useCallback } from 'react';
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

const AdminProjects = () => {
    const [projects, setProjects] = useState([]);
    const [filter, setFilter] = useState('pending');
    const [searchTerm, setSearchTerm] = useState('');
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

    const filteredProjects = projects.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (selectedProject) {
        return (
            <div className="project-detail-view">
                <button onClick={() => setSelectedProject(null)} className="back-btn">
                    <ArrowLeft size={20} /> Back to List
                </button>

                <div className="project-review-card card">
                    <div className="review-grid">
                        <div className="project-info-panel">
                            <h2>{selectedProject.name}</h2>
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

                                {selectedProject.image_url && (
                                    <SmartImage 
                                        src={`/static/${selectedProject.image_url}`} 
                                        alt="Preview" 
                                        className="review-preview-img" 
                                        fallbackType="project"
                                    />
                                )}

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
            <div className="page-header">
                <div className="title-area">
                    <h1>Project Management</h1>
                    <p>Review and moderate student portfolio submissions.</p>
                </div>
                
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
            </div>

            <div className="controls-bar">
                <div className="search-box">
                    <Search size={18} />
                    <input 
                        type="text" 
                        placeholder="Search projects..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
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
                    {filteredProjects.length > 0 ? (
                        filteredProjects.map(p => (
                            <div key={p.id} className="admin-project-card" onClick={() => {
                                setSelectedProject(p);
                                setTeacherComment(p.teacher_comment || '');
                            }}>
                                <div className="p-thumb">
                                    {p.image_url ? (
                                        <SmartImage 
                                            src={`/static/${p.image_url}`} 
                                            alt="" 
                                            fallbackType="project"
                                        />
                                    ) : (
                                        <div className="no-img"><Clock size={32} /></div>
                                    )}
                                    {(!p.teacher_comment) && <div className="pending-indicator">Review Needed</div>}
                                </div>
                                <div className="p-content">
                                    <h3>{p.name}</h3>
                                    <div className="p-meta">
                                        <span><User size={14} /> Student #{p.user_id}</span>
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
