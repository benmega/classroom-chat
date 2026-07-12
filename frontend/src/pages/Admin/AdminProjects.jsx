import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
    Github,
    Plus
} from 'lucide-react';
import client from '../../api/client';
import toast from 'react-hot-toast';
import './AdminProjects.css';
import SmartImage from '../../components/common/SmartImage';
import Skeleton from '../../components/common/Skeleton';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import { formatStaticUrl } from '../../utils/formatters';

const AdminProjects = () => {
    const navigate = useNavigate();
    const [projects, setProjects] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedProject, setSelectedProject] = useState(null);
    const [teacherComment, setTeacherComment] = useState('');
    const [packetReward, setPacketReward] = useState(0.006);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // Excel-style filter/sort states
    const [activeFilterDropdown, setActiveFilterDropdown] = useState(null);
    const [selectedStudents, setSelectedStudents] = useState([]);
    const [selectedFeedbacks, setSelectedFeedbacks] = useState(['completed', 'pending']);
    const [selectedVideos, setSelectedVideos] = useState(['completed', 'pending']);
    const [selectedWorks, setSelectedWorks] = useState(['completed', 'pending']);
    const [selectedStatuses, setSelectedStatuses] = useState(['approved', 'pending']);
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
    const [nameSearch, setNameSearch] = useState('');

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!event.target.closest('.th-filter-container')) {
                setActiveFilterDropdown(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const uniqueStudents = Array.from(new Set(projects.map(p => p.user_nickname))).filter(Boolean).sort();
    
    // Assign Project state removed - moved to AdminAssignProject.jsx
    const fetchProjects = useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await client.get('/api/admin/manage-projects?filter=all');
            if (response.data.status === 'success') {
                setProjects(response.data.data.projects);
            }
        } catch {
            toast.error('Failed to load projects.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const fetchStandardProjects = useCallback(async () => {
        try {
            const res = await client.get('/api/admin/standard-projects');
            if (res.data.status === 'success') {
                // setStandardProjects(res.data.data.standard_projects);
            }
        } catch (e) {
            console.error('Failed to load standard projects', e);
        }
    }, []);

    useEffect(() => {
        fetchProjects();
        fetchStandardProjects();
    }, [fetchProjects, fetchStandardProjects]);

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
                packet_reward: packetReward,
                filter_context: filter
            });

            if (response.data.status === 'success') {
                toast.success(response.data.message);
                setSelectedProject(null);
                setTeacherComment('');
                setPacketReward(0.006);
                fetchProjects();
            }
        } catch {
            toast.error('Failed to update project.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // User Search for Assignment logic removed - moved to AdminAssignProject.jsx

    let processedProjects = [...projects];

    // 1. Filter by Name (Search)
    if (nameSearch.trim()) {
        const term = nameSearch.toLowerCase();
        processedProjects = processedProjects.filter(p => p.name?.toLowerCase().includes(term));
    }

    // 2. Filter by Student (User Nickname)
    if (selectedStudents.length > 0) {
        processedProjects = processedProjects.filter(p => selectedStudents.includes(p.user_nickname));
    }

    // 3. Filter by Feedback
    processedProjects = processedProjects.filter(p => {
        const isCompleted = !!p.teacher_comment;
        if (selectedFeedbacks.includes('completed') && isCompleted) return true;
        if (selectedFeedbacks.includes('pending') && !isCompleted) return true;
        return false;
    });

    // 4. Filter by Video
    processedProjects = processedProjects.filter(p => {
        const isCompleted = !!p.video_url;
        if (selectedVideos.includes('completed') && isCompleted) return true;
        if (selectedVideos.includes('pending') && !isCompleted) return true;
        return false;
    });

    // 5. Filter by Work
    processedProjects = processedProjects.filter(p => {
        const isCompleted = !(!p.link && !p.github_link && !p.code_snippet);
        if (selectedWorks.includes('completed') && isCompleted) return true;
        if (selectedWorks.includes('pending') && !isCompleted) return true;
        return false;
    });

    // 6. Filter by Status (Approved vs Pending Review)
    processedProjects = processedProjects.filter(p => {
        const isApproved = !!p.teacher_comment;
        const statusVal = isApproved ? 'approved' : 'pending';
        return selectedStatuses.includes(statusVal);
    });

    // 7. Sort
    if (sortConfig.key) {
        processedProjects.sort((a, b) => {
            let aVal, bVal;
            if (sortConfig.key === 'name') {
                aVal = a.name || '';
                bVal = b.name || '';
            } else if (sortConfig.key === 'student') {
                aVal = a.user_nickname || '';
                bVal = b.user_nickname || '';
            } else if (sortConfig.key === 'status') {
                aVal = a.teacher_comment ? 'approved' : 'pending';
                bVal = b.teacher_comment ? 'approved' : 'pending';
            } else if (sortConfig.key === 'feedback') {
                aVal = a.teacher_comment ? 1 : 0;
                bVal = b.teacher_comment ? 1 : 0;
            } else if (sortConfig.key === 'video') {
                aVal = a.video_url ? 1 : 0;
                bVal = b.video_url ? 1 : 0;
            } else if (sortConfig.key === 'work') {
                const isCompletedA = !(!a.link && !a.github_link && !a.code_snippet);
                const isCompletedB = !(!b.link && !b.github_link && !b.code_snippet);
                aVal = isCompletedA ? 1 : 0;
                bVal = isCompletedB ? 1 : 0;
            }

            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    } else {
        processedProjects.sort((a, b) => b.id - a.id);
    }

    if (selectedProject) {
        return (
            <div className="admin-projects-page">
                <AdminPageHeader 
                    title="Review Project"
                />
                
                <div className="project-review-card">
                    <div className="back-btn-container">
                        <button 
                            className="admin-project-back-btn"
                            onClick={() => setSelectedProject(null)}
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
                            <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                Packet Reward
                            </h3>
                            <div style={{ marginBottom: '20px' }}>
                                <input 
                                    type="number"
                                    step="0.001"
                                    min="0"
                                    value={packetReward}
                                    onChange={(e) => setPacketReward(parseFloat(e.target.value) || 0)}
                                    className="review-input"
                                    style={{
                                        width: '100%',
                                        padding: '12px 16px',
                                        borderRadius: '8px',
                                        border: '1px solid var(--border-color)',
                                        backgroundColor: 'var(--bg-card)',
                                        color: 'var(--text-main)',
                                        fontSize: '15px',
                                        fontWeight: '500',
                                        transition: 'border-color 0.2s, box-shadow 0.2s',
                                        outline: 'none'
                                    }}
                                />
                                <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginTop: '6px' }}>
                                    Adjust reward based on project quality. Prepopulated with system average.
                                </span>
                            </div>

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
                <button 
                    className="btn-assign-project"
                    onClick={() => navigate('/admin/assign-project')}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--primary-color)', color: 'white', padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: '600' }}
                >
                    <Plus size={18} /> Assign Project
                </button>
            </AdminPageHeader>

            <div className="controls-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', minHeight: '38px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {(selectedStudents.length > 0 || selectedFeedbacks.length < 2 || selectedVideos.length < 2 || selectedWorks.length < 2 || selectedStatuses.length < 2 || nameSearch !== '' || sortConfig.key !== null) && (
                        <button 
                            onClick={() => {
                                setSelectedStudents([]);
                                setSelectedFeedbacks(['completed', 'pending']);
                                setSelectedVideos(['completed', 'pending']);
                                setSelectedWorks(['completed', 'pending']);
                                setSelectedStatuses(['approved', 'pending']);
                                setSortConfig({ key: null, direction: 'asc' });
                                setNameSearch('');
                            }}
                            className="admin-project-back-btn"
                            style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                        >
                            Clear All Filters
                        </button>
                    )}
                </div>
            </div>

            {isLoading ? (
                <div className="users-table-container card">
                    <table className="users-table">
                        <thead>
                            <tr>
                                <th>Project Name</th>
                                <th>Student</th>
                                <th style={{ textAlign: 'center' }}>Feedback</th>
                                <th style={{ textAlign: 'center' }}>Video</th>
                                <th style={{ textAlign: 'center' }}>Work</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {[1, 2, 3, 4, 5, 6].map(i => (
                                <tr key={i}>
                                    <td><Skeleton height="20px" width="150px" /></td>
                                    <td><Skeleton height="20px" width="100px" /></td>
                                    <td style={{ textAlign: 'center' }}><Skeleton height="20px" width="24px" style={{ margin: '0 auto' }} /></td>
                                    <td style={{ textAlign: 'center' }}><Skeleton height="20px" width="24px" style={{ margin: '0 auto' }} /></td>
                                    <td style={{ textAlign: 'center' }}><Skeleton height="20px" width="24px" style={{ margin: '0 auto' }} /></td>
                                    <td><Skeleton height="20px" width="80px" /></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="users-table-container card" style={{ overflow: 'visible' }}>
                    <table className="users-table" style={{ overflow: 'visible' }}>
                        <thead>
                            <tr>
                                <th className="th-filter-container" style={{ position: 'relative' }}>
                                    <div className="header-cell-content" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span>Project Name</span>
                                        <button className="filter-trigger-btn" onClick={() => setActiveFilterDropdown(activeFilterDropdown === 'name' ? null : 'name')}>
                                            <Filter size={12} style={{ color: nameSearch ? 'var(--primary-color)' : 'inherit' }} />
                                        </button>
                                    </div>
                                    {activeFilterDropdown === 'name' && (
                                        <div className="excel-filter-dropdown">
                                            <button className="filter-sort-option" onClick={() => { setSortConfig({ key: 'name', direction: 'asc' }); setActiveFilterDropdown(null); }}>
                                                Sort A to Z
                                            </button>
                                            <button className="filter-sort-option" onClick={() => { setSortConfig({ key: 'name', direction: 'desc' }); setActiveFilterDropdown(null); }}>
                                                Sort Z to A
                                            </button>
                                            <div className="divider"></div>
                                            <div style={{ padding: '8px' }}>
                                                <input 
                                                    type="text" 
                                                    placeholder="Search projects..." 
                                                    value={nameSearch}
                                                    onChange={(e) => setNameSearch(e.target.value)}
                                                    style={{ width: '100%', padding: '6px', border: '1px solid var(--border-subtle)', borderRadius: '4px', outline: 'none', fontSize: '0.85rem' }}
                                                />
                                            </div>
                                        </div>
                                    )}
                                </th>
                                <th className="th-filter-container" style={{ position: 'relative' }}>
                                    <div className="header-cell-content" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span>Student</span>
                                        <button className="filter-trigger-btn" onClick={() => setActiveFilterDropdown(activeFilterDropdown === 'student' ? null : 'student')}>
                                            <Filter size={12} style={{ color: selectedStudents.length > 0 ? 'var(--primary-color)' : 'inherit' }} />
                                        </button>
                                    </div>
                                    {activeFilterDropdown === 'student' && (
                                        <div className="excel-filter-dropdown">
                                            <button className="filter-sort-option" onClick={() => { setSortConfig({ key: 'student', direction: 'asc' }); setActiveFilterDropdown(null); }}>
                                                Sort A to Z
                                            </button>
                                            <button className="filter-sort-option" onClick={() => { setSortConfig({ key: 'student', direction: 'desc' }); setActiveFilterDropdown(null); }}>
                                                Sort Z to A
                                            </button>
                                            <div className="divider"></div>
                                            <div className="filter-checkbox-list">
                                                <label className="checkbox-label">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={selectedStudents.length === 0} 
                                                        onChange={() => setSelectedStudents([])} 
                                                    />
                                                    <span>(Select All)</span>
                                                </label>
                                                {uniqueStudents.map(student => (
                                                    <label key={student} className="checkbox-label">
                                                        <input 
                                                            type="checkbox" 
                                                            checked={selectedStudents.includes(student)} 
                                                            onChange={(e) => {
                                                                if (e.target.checked) {
                                                                    setSelectedStudents([...selectedStudents, student]);
                                                                } else {
                                                                    setSelectedStudents(selectedStudents.filter(s => s !== student));
                                                                }
                                                            }} 
                                                        />
                                                        <span>{student}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </th>
                                <th className="th-filter-container" style={{ textAlign: 'center', position: 'relative' }}>
                                    <div className="header-cell-content centered" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                        <span>Feedback</span>
                                        <button className="filter-trigger-btn" onClick={() => setActiveFilterDropdown(activeFilterDropdown === 'feedback' ? null : 'feedback')}>
                                            <Filter size={12} style={{ color: selectedFeedbacks.length < 2 ? 'var(--primary-color)' : 'inherit' }} />
                                        </button>
                                    </div>
                                    {activeFilterDropdown === 'feedback' && (
                                        <div className="excel-filter-dropdown" style={{ left: '50%', transform: 'translateX(-50%)' }}>
                                            <div className="filter-checkbox-list">
                                                <label className="checkbox-label">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={selectedFeedbacks.length === 2} 
                                                        onChange={(e) => setSelectedFeedbacks(e.target.checked ? ['completed', 'pending'] : [])} 
                                                    />
                                                    <span>(Select All)</span>
                                                </label>
                                                <label className="checkbox-label">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={selectedFeedbacks.includes('completed')} 
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setSelectedFeedbacks([...selectedFeedbacks, 'completed']);
                                                            } else {
                                                                setSelectedFeedbacks(selectedFeedbacks.filter(f => f !== 'completed'));
                                                            }
                                                        }} 
                                                    />
                                                    <span>Completed</span>
                                                </label>
                                                <label className="checkbox-label">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={selectedFeedbacks.includes('pending')} 
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setSelectedFeedbacks([...selectedFeedbacks, 'pending']);
                                                            } else {
                                                                setSelectedFeedbacks(selectedFeedbacks.filter(f => f !== 'pending'));
                                                            }
                                                        }} 
                                                    />
                                                    <span>Pending</span>
                                                </label>
                                            </div>
                                        </div>
                                    )}
                                </th>
                                <th className="th-filter-container" style={{ textAlign: 'center', position: 'relative' }}>
                                    <div className="header-cell-content centered" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                        <span>Video</span>
                                        <button className="filter-trigger-btn" onClick={() => setActiveFilterDropdown(activeFilterDropdown === 'video' ? null : 'video')}>
                                            <Filter size={12} style={{ color: selectedVideos.length < 2 ? 'var(--primary-color)' : 'inherit' }} />
                                        </button>
                                    </div>
                                    {activeFilterDropdown === 'video' && (
                                        <div className="excel-filter-dropdown" style={{ left: '50%', transform: 'translateX(-50%)' }}>
                                            <div className="filter-checkbox-list">
                                                <label className="checkbox-label">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={selectedVideos.length === 2} 
                                                        onChange={(e) => setSelectedVideos(e.target.checked ? ['completed', 'pending'] : [])} 
                                                    />
                                                    <span>(Select All)</span>
                                                </label>
                                                <label className="checkbox-label">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={selectedVideos.includes('completed')} 
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setSelectedVideos([...selectedVideos, 'completed']);
                                                            } else {
                                                                setSelectedVideos(selectedVideos.filter(v => v !== 'completed'));
                                                            }
                                                        }} 
                                                    />
                                                    <span>Completed</span>
                                                </label>
                                                <label className="checkbox-label">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={selectedVideos.includes('pending')} 
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setSelectedVideos([...selectedVideos, 'pending']);
                                                            } else {
                                                                setSelectedVideos(selectedVideos.filter(v => v !== 'pending'));
                                                            }
                                                        }} 
                                                    />
                                                    <span>Pending</span>
                                                </label>
                                            </div>
                                        </div>
                                    )}
                                </th>
                                <th className="th-filter-container" style={{ textAlign: 'center', position: 'relative' }}>
                                    <div className="header-cell-content centered" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                                        <span>Work</span>
                                        <button className="filter-trigger-btn" onClick={() => setActiveFilterDropdown(activeFilterDropdown === 'work' ? null : 'work')}>
                                            <Filter size={12} style={{ color: selectedWorks.length < 2 ? 'var(--primary-color)' : 'inherit' }} />
                                        </button>
                                    </div>
                                    {activeFilterDropdown === 'work' && (
                                        <div className="excel-filter-dropdown" style={{ left: '50%', transform: 'translateX(-50%)' }}>
                                            <div className="filter-checkbox-list">
                                                <label className="checkbox-label">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={selectedWorks.length === 2} 
                                                        onChange={(e) => setSelectedWorks(e.target.checked ? ['completed', 'pending'] : [])} 
                                                    />
                                                    <span>(Select All)</span>
                                                </label>
                                                <label className="checkbox-label">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={selectedWorks.includes('completed')} 
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setSelectedWorks([...selectedWorks, 'completed']);
                                                            } else {
                                                                setSelectedWorks(selectedWorks.filter(w => w !== 'completed'));
                                                            }
                                                        }} 
                                                    />
                                                    <span>Completed</span>
                                                </label>
                                                <label className="checkbox-label">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={selectedWorks.includes('pending')} 
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setSelectedWorks([...selectedWorks, 'pending']);
                                                            } else {
                                                                setSelectedWorks(selectedWorks.filter(w => w !== 'pending'));
                                                            }
                                                        }} 
                                                    />
                                                    <span>Pending</span>
                                                </label>
                                            </div>
                                        </div>
                                    )}
                                </th>
                                <th className="th-filter-container" style={{ position: 'relative' }}>
                                    <div className="header-cell-content" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span>Status</span>
                                        <button className="filter-trigger-btn" onClick={() => setActiveFilterDropdown(activeFilterDropdown === 'status' ? null : 'status')}>
                                            <Filter size={12} style={{ color: selectedStatuses.length < 2 ? 'var(--primary-color)' : 'inherit' }} />
                                        </button>
                                    </div>
                                    {activeFilterDropdown === 'status' && (
                                        <div className="excel-filter-dropdown" style={{ right: 0 }}>
                                            <button className="filter-sort-option" onClick={() => { setSortConfig({ key: 'status', direction: 'asc' }); setActiveFilterDropdown(null); }}>
                                                Sort A to Z
                                            </button>
                                            <button className="filter-sort-option" onClick={() => { setSortConfig({ key: 'status', direction: 'desc' }); setActiveFilterDropdown(null); }}>
                                                Sort Z to A
                                            </button>
                                            <div className="divider"></div>
                                            <div className="filter-checkbox-list">
                                                <label className="checkbox-label">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={selectedStatuses.length === 2} 
                                                        onChange={(e) => setSelectedStatuses(e.target.checked ? ['approved', 'pending'] : [])} 
                                                    />
                                                    <span>(Select All)</span>
                                                </label>
                                                <label className="checkbox-label">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={selectedStatuses.includes('approved')} 
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setSelectedStatuses([...selectedStatuses, 'approved']);
                                                            } else {
                                                                setSelectedStatuses(selectedStatuses.filter(s => s !== 'approved'));
                                                            }
                                                        }} 
                                                    />
                                                    <span>Approved</span>
                                                </label>
                                                <label className="checkbox-label">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={selectedStatuses.includes('pending')} 
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setSelectedStatuses([...selectedStatuses, 'pending']);
                                                            } else {
                                                                setSelectedStatuses(selectedStatuses.filter(s => s !== 'pending'));
                                                            }
                                                        }} 
                                                    />
                                                    <span>Pending Review</span>
                                                </label>
                                            </div>
                                        </div>
                                    )}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {processedProjects.length > 0 ? (
                                processedProjects.map(p => (
                                    <tr key={p.id} onClick={() => {
                                        setSelectedProject(p);
                                        setTeacherComment(p.teacher_comment || '');
                                        setPacketReward(p.packets_awarded !== undefined && p.packets_awarded !== null && p.packets_awarded > 0 ? p.packets_awarded : 0.006);
                                    }} style={{ cursor: 'pointer' }}>
                                        <td>
                                            <div className="project-title-cell" style={{ fontWeight: '700', color: 'var(--slate-800)' }}>
                                                {p.name}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="student-info-cell" style={{ fontWeight: '600', color: 'var(--text-secondary)' }}>
                                                {p.user_nickname} <span className="id-pill">#{p.user_id}</span>
                                            </div>
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <span className={`checklist-icon ${p.teacher_comment ? 'completed' : 'pending'}`}>
                                                {p.teacher_comment ? <CheckCircle size={18}/> : <XCircle size={18}/>}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <span className={`checklist-icon ${p.video_url ? 'completed' : 'pending'}`}>
                                                {p.video_url ? <CheckCircle size={18}/> : <XCircle size={18}/>}
                                            </span>
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <span className={`checklist-icon ${(!p.link && !p.github_link && !p.code_snippet) ? 'pending' : 'completed'}`}>
                                                {(!p.link && !p.github_link && !p.code_snippet) ? <XCircle size={18}/> : <CheckCircle size={18}/>}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                                <span className={`status-text ${p.teacher_comment ? 'approved' : 'pending'}`}>
                                                    {p.teacher_comment ? 'Approved' : 'Pending Review'}
                                                </span>
                                                <ChevronRight size={18} className="chevron-icon" style={{ color: 'var(--text-muted)' }} />
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="empty-row" style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                                        No projects found matching your criteria.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Assign Modal logic removed */}
        </div>
    );
};

export default AdminProjects;
