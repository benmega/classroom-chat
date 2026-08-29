import React, { useState, useEffect, useCallback } from 'react';
import { 
    Inbox,
    FolderKanban,
    Award,
    Users,
    ArrowLeftRight,
    CalendarCheck,
    CheckCircle,
    XCircle,
    MessageSquare,
    Download,
    ExternalLink,
    Clock,
    User,
    Hash,
    AlertCircle,
    Sliders,
    Eye,
    TrendingUp,
    ChevronDown,
    ChevronUp,
    Edit
} from 'lucide-react';
import client from '../../api/client';
import toast from 'react-hot-toast';
import { getApiUrl } from '../../utils/apiUrl';
import { formatStaticUrl } from '../../utils/formatters';
import './ToReview.css';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import Skeleton from '../../components/common/Skeleton';
import SmartImage from '../../components/common/SmartImage';

const ToReview = () => {
    // Data lists
    const [projects, setProjects] = useState([]);
    const [certificates, setCertificates] = useState([]);
    const [pendingUsers, setPendingUsers] = useState([]);
    const [trades, setTrades] = useState([]);
    const [trackRequests, setTrackRequests] = useState([]);
    const [courseRequests, setCourseRequests] = useState([]);

    // Support tables for dropdown lists
    const [classrooms, setClassrooms] = useState([]);
    const [courses, setCourses] = useState([]);

    // App state
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('all');
    const [isProcessing, setIsProcessing] = useState(null);

    // Form inputs state
    const [projectComments, setProjectComments] = useState({});
    const [projectRewards, setProjectRewards] = useState({});
    const [selectedClassrooms, setSelectedClassrooms] = useState({});
    const [selectedCourses, setSelectedCourses] = useState({});
    const [expandedCodeSnippets, setExpandedCodeSnippets] = useState({});

    // Bulk Selection State
    const [selectedUsers, setSelectedUsers] = useState(new Set());
    const [selectedTrades, setSelectedTrades] = useState(new Set());
    const [selectedTracks, setSelectedTracks] = useState(new Set());

    const fetchAllData = useCallback(async () => {
        setIsLoading(true);

        try {
            const [
                certsRes,
                projectsRes,
                usersRes,
                tradesRes,
                trackRes,
                courseRes,
                classroomsRes,
                coursesRes
            ] = await Promise.all([
                client.get('/api/achievements/admin/certificates').catch(() => ({ data: { certificates: [] } })),
                client.get('/api/admin/manage-projects?filter=pending').catch(() => ({ data: { data: { projects: [] } } })),
                client.get('/api/admin/pending_users').catch(() => ({ data: { data: { users: [] } } })),
                client.get('/api/admin/pending_trades').catch(() => ({ data: { data: { trades: [] } } })),
                client.get('/api/admin/track-requests/').catch(() => ({ data: { requests: [] } })),
                client.get('/api/course-requests/pending').catch(() => ({ data: { requests: [] } })),
                client.get('/api/admin/crud/classroom').catch(() => ({ data: { data: [] } })),
                client.get('/api/admin/crud/course').catch(() => ({ data: { data: [] } }))
            ]);

            // Set main list states
            setCertificates(certsRes.data.certificates || certsRes.data.data?.certificates || []);
            setProjects(projectsRes.data.data?.projects || []);
            setPendingUsers(usersRes.data.data?.users || []);
            setTrades(tradesRes.data.data?.trades || []);
            setTrackRequests(trackRes.data.requests || trackRes.data.data?.requests || []);
            setCourseRequests(courseRes.data.requests || courseRes.data.data?.requests || []);

            // Set options states
            const clList = classroomsRes.data.data || [];
            const coList = coursesRes.data.data || [];
            setClassrooms(clList);
            setCourses(coList);

            // Prepopulate selectors with default values
            const initialClassrooms = {};
            const initialCourses = {};
            courseRes.data.requests?.forEach(req => {
                if (req.student_classrooms && req.student_classrooms.length > 0) {
                    const studentClassroomIds = req.student_classrooms.map(c => c.id);
                    const matched = clList.find(cl => studentClassroomIds.includes(cl.id));
                    initialClassrooms[req.id] = matched ? matched.id : (clList[0]?.id || '');
                } else {
                    initialClassrooms[req.id] = clList[0]?.id || '';
                }
                
                if (req.requested_course_id && coList.some(c => c.id === req.requested_course_id)) {
                    initialCourses[req.id] = req.requested_course_id;
                } else {
                    initialCourses[req.id] = coList[0]?.id || '';
                }
            });
            setSelectedClassrooms(initialClassrooms);
            setSelectedCourses(initialCourses);

        } catch (error) {
            console.error("Error loading pending items", error);
            toast.error("Failed to load review workspace items.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAllData();
    }, [fetchAllData]);

    // Action Handlers

    // 1. Project Review Actions
    const handleProjectReview = async (projectId, action) => {
        const comment = projectComments[projectId] || '';
        const reward = projectRewards[projectId] !== undefined ? projectRewards[projectId] : 0.006;

        if (action === 'approve' && !comment.trim()) {
            toast.error('Please provide teacher feedback comment before approving.');
            return;
        }

        setIsProcessing(`project-${projectId}`);
        try {
            const response = await client.post(`/api/admin/handle-project-review/${projectId}`, {
                action,
                teacher_comment: comment,
                packet_reward: parseFloat(reward)
            });

            if (response.data.status === 'success') {
                
                setProjects(prev => prev.filter(p => p.id !== projectId));
                // Clean up state
                setProjectComments(prev => { const copy = {...prev}; delete copy[projectId]; return copy; });
                setProjectRewards(prev => { const copy = {...prev}; delete copy[projectId]; return copy; });
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to review project.');
        } finally {
            setIsProcessing(null);
        }
    };

    // 2. Certificate Review Actions
    const handleCertificateReview = async (certId, action = 'approve') => {
        if (action === 'reject') {
            const review_note = window.prompt('Reason for rejecting? (optional)') || undefined;
            setIsProcessing(`cert-${certId}`);
            try {
                const response = await client.post(`/api/achievements/admin/certificates/reject/${certId}`, { review_note });
                if (response.data.status === 'success') {
                    setCertificates(prev => prev.filter(c => c.id !== certId));
                }
            } catch {
                toast.error('Failed to reject certificate.');
            } finally {
                setIsProcessing(null);
            }
            return;
        }

        setIsProcessing(`cert-${certId}`);
        try {
            const response = await client.post(`/api/achievements/admin/certificates/reviewed/${certId}`);
            if (response.data.status === 'success') {

                setCertificates(prev => prev.filter(c => c.id !== certId));
            }
        } catch {
            toast.error('Failed to approve certificate.');
        } finally {
            setIsProcessing(null);
        }
    };

    const handleApproveAllCertificates = async () => {
        if (!window.confirm("Are you sure you want to mark all pending certificates as reviewed?")) return;
        setIsProcessing('cert-all');
        try {
            const response = await client.post('/api/achievements/admin/certificates/reviewed/all');
            if (response.data.status === 'success') {
                
                setCertificates([]); 
            }
        } catch {
            toast.error('Failed to mark all as reviewed.');
        } finally {
            setIsProcessing(null);
        }
    };

    // 3. User Signup Review Actions
    const handleUserApproval = async (userId, action, isBulk = false) => {
        if (!isBulk && action === 'reject' && !window.confirm('Are you sure you want to reject and delete this user?')) return;
        if (!isBulk) setIsProcessing(`user-${userId}`);
        const endpoint = action === 'approve' ? `approve_user/${userId}` : `reject_user/${userId}`;

        try {
            const response = await client.post(`/api/admin/${endpoint}`);
            if (response.data.status === 'success') {
                
                setPendingUsers(prev => prev.filter(u => u.id !== userId));
            }
        } catch {
            if (!isBulk) toast.error(`Failed to ${action} user.`);
        } finally {
            if (!isBulk) setIsProcessing(null);
        }
    };

    const handleBulkUserApproval = async (action) => {
        if (selectedUsers.size === 0) return;
        if (action === 'reject' && !window.confirm(`Are you sure you want to reject and delete ${selectedUsers.size} users?`)) return;
        
        setIsProcessing('bulk-user');
        const ids = Array.from(selectedUsers);
        let successCount = 0;
        for (const id of ids) {
            try {
                await handleUserApproval(id, action, true);
                // eslint-disable-next-line
                successCount++;
            } catch (e) {
                console.error(e);
            }
        }
        
        setSelectedUsers(new Set());
        setIsProcessing(null);
    };

    // 4. Duck Trade Review Actions
    const handleTradeApproval = async (tradeId, action, isBulk = false) => {
        if (!isBulk) setIsProcessing(`trade-${tradeId}`);
        const formData = new FormData();
        formData.append('trade_id', tradeId);
        formData.append('action', action);

        try {
            const response = await client.post('/api/admin/trade_action', formData);
            if (response.data.status === 'success') {
                
                setTrades(prev => prev.filter(t => t.id !== tradeId));
            } else {
                if (!isBulk) toast.error(response.data.message || 'Action failed.');
            }
        } catch {
            if (!isBulk) toast.error('Failed to process trade.');
        } finally {
            if (!isBulk) setIsProcessing(null);
        }
    };

    const handleBulkTradeApproval = async (action) => {
        if (selectedTrades.size === 0) return;
        
        setIsProcessing('bulk-trade');
        const ids = Array.from(selectedTrades);
        for (const id of ids) {
            try {
                await handleTradeApproval(id, action, true);
            } catch (e) {
                console.error(e);
            }
        }
        
        setSelectedTrades(new Set());
        setIsProcessing(null);
    };

    // 5. Track Change Request Actions
    const handleTrackApproval = async (requestId, action, isBulk = false) => {
        if (!isBulk) setIsProcessing(`track-${requestId}`);
        const status = action === 'approve' ? 'approved' : 'denied';

        try {
            const response = await client.put(`/api/admin/track-requests/${requestId}`, { status });
            if (response.data.success) {
                
                setTrackRequests(prev => prev.filter(r => r.id !== requestId));
            } else {
                if (!isBulk) toast.error(response.data.message || 'Action failed.');
            }
        } catch {
            if (!isBulk) toast.error('Failed to process track request.');
        } finally {
            if (!isBulk) setIsProcessing(null);
        }
    };

    const handleBulkTrackApproval = async (action) => {
        if (selectedTracks.size === 0) return;
        
        setIsProcessing('bulk-track');
        const ids = Array.from(selectedTracks);
        for (const id of ids) {
            try {
                await handleTrackApproval(id, action, true);
            } catch (e) {
                console.error(e);
            }
        }
        
        setSelectedTracks(new Set());
        setIsProcessing(null);
    };

    // 6. Course Request Actions
    const handleCourseApproval = async (requestId, action) => {
        setIsProcessing(`course-${requestId}`);

        try {
            if (action === 'approve') {
                const classroom_id = selectedClassrooms[requestId];
                const course_id = selectedCourses[requestId];
                if (!classroom_id || !course_id) {
                    toast.error('Classroom and Course must be selected.');
                    setIsProcessing(null);
                    return;
                }

                const response = await client.post(`/api/course-requests/${requestId}/approve`, {
                    classroom_id,
                    course_id
                });
                if (response.data.success) {
                    
                    setCourseRequests(prev => prev.filter(r => r.id !== requestId));
                }
            } else {
                if (!window.confirm('Are you sure you want to reject this request?')) {
                    setIsProcessing(null);
                    return;
                }
                const response = await client.post(`/api/course-requests/${requestId}/reject`);
                if (response.data.success) {
                    
                    setCourseRequests(prev => prev.filter(r => r.id !== requestId));
                }
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to process course request.');
        } finally {
            setIsProcessing(null);
        }
    };

    // Helper functions
    const formatBits = (bits) => {
        if (!bits || !Array.isArray(bits)) return '0000 0000';
        const paddedBits = [...bits];
        while (paddedBits.length < 8) paddedBits.push(0);
        const reversed = paddedBits.reverse();
        return `${reversed.slice(0, 4).join('')} ${reversed.slice(4, 8).join('')}`;
    };

    const calculateDecimal = (bits) => {
        if (!bits || !Array.isArray(bits)) return 0;
        return bits.reduce((acc, bit, idx) => acc + (bit === 1 ? Math.pow(2, idx) : 0), 0);
    };

    const hasBytes = (bytes) => {
        if (!bytes || !Array.isArray(bytes)) return false;
        return bytes.some(b => b === 1);
    };

    const getTrackName = (slug) => {
        const names = { ozaria: 'Ozaria', cs: 'Computer Science', gd: 'Game Design', wd: 'Web Development' };
        return names[slug] || slug;
    };

    // Tabs setup
    const tabs = [
        { id: 'all', label: 'All Items', icon: Inbox, count: projects.length + certificates.length + pendingUsers.length + trades.length + trackRequests.length + courseRequests.length },
        { id: 'projects', label: 'Projects', icon: FolderKanban, count: projects.length },
        { id: 'certificates', label: 'Certificates', icon: Award, count: certificates.length },
        { id: 'users', label: 'Account Signups', icon: Users, count: pendingUsers.length },
        { id: 'trades', label: 'Duck Trades', icon: ArrowLeftRight, count: trades.length },
        { id: 'tracks', label: 'Track Changes', icon: TrendingUp, count: trackRequests.length },
        { id: 'courses', label: 'Course Requests', icon: CalendarCheck, count: courseRequests.length }
    ];

    const getUnifiedList = () => {
        const unified = [];

        projects.forEach(p => unified.push({ ...p, type: 'project', key: `project-${p.id}`, timestamp: p.submitted_at || p.created_at || new Date().toISOString() }));
        certificates.forEach(c => unified.push({ ...c, type: 'certificate', key: `cert-${c.id}`, timestamp: c.submitted_at || new Date().toISOString() }));
        pendingUsers.forEach(u => unified.push({ ...u, type: 'user', key: `user-${u.id}`, timestamp: new Date().toISOString() })); // default fallback
        trades.forEach(t => unified.push({ ...t, type: 'trade', key: `trade-${t.id}`, timestamp: t.timestamp || new Date().toISOString() }));
        trackRequests.forEach(r => unified.push({ ...r, type: 'track', key: `track-${r.id}`, timestamp: r.requested_at || new Date().toISOString() }));
        courseRequests.forEach(r => unified.push({ ...r, type: 'course', key: `course-${r.id}`, timestamp: r.requested_at || new Date().toISOString() }));

        // Sort descending by timestamp
        return unified.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    };

    const getDisplayItems = () => {
        if (activeTab === 'all') return getUnifiedList();
        if (activeTab === 'projects') return projects.map(p => ({ ...p, type: 'project', key: `project-${p.id}` }));
        if (activeTab === 'certificates') return certificates.map(c => ({ ...c, type: 'certificate', key: `cert-${c.id}` }));
        if (activeTab === 'users') return pendingUsers.map(u => ({ ...u, type: 'user', key: `user-${u.id}` }));
        if (activeTab === 'trades') return trades.map(t => ({ ...t, type: 'trade', key: `trade-${t.id}` }));
        if (activeTab === 'tracks') return trackRequests.map(r => ({ ...r, type: 'track', key: `track-${r.id}` }));
        if (activeTab === 'courses') return courseRequests.map(r => ({ ...r, type: 'course', key: `course-${r.id}` }));
        return [];
    };

    const displayItems = getDisplayItems();

    // Render Cards for each item type

    const renderProjectCard = (p) => {
        const isExpanded = !!expandedCodeSnippets[p.id];
        return (
            <div className="review-card project-review-card" key={p.key}>
                <div className="review-card-header">
                    <div className="card-badge badge-project">
                        <FolderKanban size={14} /> Project
                    </div>
                    <span className="card-time">
                        <Clock size={12} /> {new Date(p.submitted_at || p.created_at).toLocaleString()}
                    </span>
                </div>

                <div className="card-main-content">
                    <div className="student-profile">
                        <div className="avatar-placeholder">
                            <User size={18} />
                        </div>
                        <div>
                            <h4>{p.user_nickname || 'Student'}</h4>
                            <span className="student-handle">@{p.user_username || p.user_slug || `id_${p.user_id}`}</span>
                        </div>
                    </div>

                    <div className="project-header-group">
                        {p.image_url && (
                            <div className="project-thumbnail-icon">
                                <SmartImage 
                                    src={formatStaticUrl(p.image_url)} 
                                    alt="Preview" 
                                    className="review-preview-img" 
                                    fallbackType="project"
                                />
                            </div>
                        )}
                        <div className="project-title-area">
                            <h3 className="project-title">{p.name}</h3>
                            {p.description && <p className="project-description">{p.description}</p>}
                            <div className="project-indicators">
                                {(!p.code_snippet && !p.github_link) && (
                                    <span className="missing-indicator">
                                        <AlertCircle size={12} /> Missing Code
                                    </span>
                                )}
                                {!p.video_url && (
                                    <span className="missing-indicator">
                                        <AlertCircle size={12} /> Missing Video
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="project-links">
                        {p.link && (
                            <a href={p.link} target="_blank" rel="noopener noreferrer" className="project-link-btn">
                                <ExternalLink size={14} /> Live Project
                            </a>
                        )}
                        {p.github_link && (
                            <a href={p.github_link} target="_blank" rel="noopener noreferrer" className="project-link-btn">
                                <ExternalLink size={14} /> GitHub Repo
                            </a>
                        )}
                        {p.video_url && (
                            <a href={p.video_url} target="_blank" rel="noopener noreferrer" className="project-link-btn video">
                                <ExternalLink size={14} /> Watch Recording
                            </a>
                        )}
                    </div>

                    {p.code_snippet && (
                        <div className="collapsible-code">
                            <button 
                                className="code-toggle-btn"
                                onClick={() => setExpandedCodeSnippets(prev => ({ ...prev, [p.id]: !isExpanded }))}
                            >
                                <span>Code Snippet</span>
                                {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                            {isExpanded && (
                                <pre className="code-snippet-box">
                                    <code>{p.code_snippet}</code>
                                </pre>
                            )}
                        </div>
                    )}

                    {p.video_transcript && (
                        <div className="collapsible-code">
                            <button 
                                className="code-toggle-btn"
                                onClick={() => setExpandedCodeSnippets(prev => ({ ...prev, [`transcript-${p.id}`]: !prev[`transcript-${p.id}`] }))}
                            >
                                <span>Video Transcript</span>
                                {expandedCodeSnippets[`transcript-${p.id}`] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                            {expandedCodeSnippets[`transcript-${p.id}`] && (
                                <div className="transcript-view">
                                    {p.video_transcript}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="review-action-section">
                        <div className="feedback-field">
                            <label htmlFor={`feedback-${p.id}`} className="field-label">Teacher Feedback (Required to Approve)</label>
                            <div className="input-with-icon">
                                <MessageSquare size={16} className="input-icon" />
                                <input 
                                    id={`feedback-${p.id}`}
                                    type="text" 
                                    placeholder="Good job! Your project looks great..." 
                                    value={projectComments[p.id] || ''}
                                    onChange={(e) => setProjectComments(prev => ({ ...prev, [p.id]: e.target.value }))}
                                />
                            </div>
                        </div>

                        <div className="reward-field">
                            <div className="reward-label-row">
                                <label htmlFor={`reward-${p.id}`} className="field-label">Packet Reward</label>
                                <span className="reward-value">{(projectRewards[p.id] !== undefined ? projectRewards[p.id] : 0.006).toFixed(3)} packets</span>
                            </div>
                            <div className="slider-container">
                                <Sliders size={16} className="slider-icon" />
                                <input 
                                    id={`reward-${p.id}`}
                                    type="range" 
                                    min="0.000" 
                                    max="0.050" 
                                    step="0.001" 
                                    value={projectRewards[p.id] !== undefined ? projectRewards[p.id] : 0.006}
                                    onChange={(e) => setProjectRewards(prev => ({ ...prev, [p.id]: parseFloat(e.target.value) }))}
                                />
                            </div>
                        </div>

                        <div className="card-actions">
                            <a
                                href={`/project/edit/${p.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-secondary flex-center gap-6"
                                title="Edit Project"
                            >
                                <Edit size={16} /> Edit
                            </a>
                            <button 
                                className="btn-reject"
                                onClick={() => handleProjectReview(p.id, 'reject')}
                                disabled={isProcessing === `project-${p.id}`}
                            >
                                <XCircle size={16} /> Request Revision
                            </button>
                            <button 
                                className="btn-approve"
                                onClick={() => handleProjectReview(p.id, 'approve')}
                                disabled={isProcessing === `project-${p.id}`}
                            >
                                <CheckCircle size={16} /> {isProcessing === `project-${p.id}` ? 'Processing...' : 'Approve Project'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderCertificateCard = (c) => {
        return (
            <div className="review-card certificate-review-card" key={c.key}>
                <div className="review-card-header">
                    <div className="card-badge badge-certificate">
                        <Award size={14} /> Certificate
                    </div>
                    <span className="card-time">
                        <Clock size={12} /> {new Date(c.submitted_at).toLocaleString()}
                    </span>
                </div>

                <div className="card-main-content display-flex-row">
                    <a 
                        href={getApiUrl(`/api/achievements/view_certificate/${c.id}`)} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="cert-preview-thumbnail"
                        title="Click to view full certificate"
                    >
                        <iframe 
                            src={getApiUrl(`/api/achievements/view_certificate/${c.id}#toolbar=0&navpanes=0&scrollbar=0`)} 
                            title="Certificate Preview" 
                            frameBorder="0" 
                            scrolling="no"
                            tabIndex="-1"
                        ></iframe>
                        <div className="preview-overlay">
                            <Eye size={20} />
                        </div>
                    </a>

                    <div className="cert-details">
                        <div className="student-profile">
                            <div className="avatar-placeholder">
                                <User size={18} />
                            </div>
                            <div>
                                <h4>{c.user?.nickname || c.user?.username || 'Student'}</h4>
                                <span className="student-handle">@{c.user?.username || 'username'}</span>
                            </div>
                        </div>

                        <div className="cert-achievement-info">
                            <span className="label">Earned Award</span>
                            <h4 className="achievement-name">{c.achievement?.name || 'Achievement Title'}</h4>
                        </div>

                        <div className="recommendation-badge-container" style={{ margin: '8px 0' }}>
                            {c.is_auto_recommended ? (
                                <div className="badge-recommended" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', backgroundColor: '#e6f4ea', color: '#137333', borderRadius: '16px', fontSize: '0.85rem', fontWeight: '500' }}>
                                    <CheckCircle size={14} /> System Recommends Approval
                                </div>
                            ) : (
                                <div className="badge-manual" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', backgroundColor: '#f3f4f6', color: '#4b5563', border: '1px solid #d1d5db', borderRadius: '16px', fontSize: '0.85rem', fontWeight: '500' }}>
                                    <AlertCircle size={14} /> Manual Review Needed
                                </div>
                            )}
                        </div>

                        {c.recommendation_reason && (
                            <div className="recommendation-reason" style={{ fontSize: '0.85rem', color: '#5f6368', marginBottom: '8px', fontStyle: 'italic', padding: '4px 8px', backgroundColor: '#f8f9fa', borderRadius: '4px', borderLeft: '3px solid #e5e7eb' }}>
                                {c.recommendation_reason}
                            </div>
                        )}

                        {c.url && (
                            <a href={c.url} target="_blank" rel="noopener noreferrer" className="original-cert-link">
                                <ExternalLink size={14} /> Original Certificate Link
                            </a>
                        )}

                        <div className="card-actions mt-auto">
                            <a 
                                href={getApiUrl(`/api/achievements/download_certificate/${c.id}`)} 
                                className="btn-secondary flex-center gap-6"
                                title="Download PDF File"
                            >
                                <Download size={16} /> PDF
                            </a>
                            <button
                                className="btn-reject"
                                onClick={() => handleCertificateReview(c.id, 'reject')}
                                disabled={isProcessing === `cert-${c.id}`}
                            >
                                <XCircle size={16} /> Reject
                            </button>
                            <button
                                className="btn-approve"
                                onClick={() => handleCertificateReview(c.id, 'approve')}
                                disabled={isProcessing === `cert-${c.id}`}
                            >
                                <CheckCircle size={16} /> {isProcessing === `cert-${c.id}` ? 'Approving...' : 'Approve'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderUserCard = (u) => {
        const isSelected = selectedUsers.has(u.id);
        const toggleSelect = () => {
            const next = new Set(selectedUsers);
            if (next.has(u.id)) next.delete(u.id);
            else next.add(u.id);
            setSelectedUsers(next);
        };
        return (
            <div className={`review-card user-review-card ${isSelected ? 'selected' : ''}`} key={u.key}>
                <div className="review-card-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <input type="checkbox" checked={isSelected} onChange={toggleSelect} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                        <div className="card-badge badge-user">
                            <Users size={14} /> Account Signup
                        </div>
                    </div>
                    <span className="card-time">
                        <Clock size={12} /> Awaiting Review
                    </span>
                </div>

                <div className="card-main-content">
                    <div className="student-profile mb-md">
                        <div className="avatar-placeholder big-avatar">
                            <User size={24} />
                        </div>
                        <div>
                            <h4>{u.nickname || u.username}</h4>
                            <span className="student-handle">@{u.username}</span>
                        </div>
                    </div>

                    <div className="info-grid">
                        <div className="info-item">
                            <span className="info-label">Full Name / Nickname</span>
                            <span className="info-val">{u.nickname || 'Not Provided'}</span>
                        </div>
                        <div className="info-item">
                            <span className="info-label">Desired Username</span>
                            <span className="info-val">@{u.username}</span>
                        </div>
                    </div>

                    <div className="card-actions">
                        <button 
                            className="btn-reject"
                            onClick={() => handleUserApproval(u.id, 'reject')}
                            disabled={isProcessing === `user-${u.id}`}
                        >
                            <XCircle size={16} /> Reject & Delete
                        </button>
                        <button 
                            className="btn-approve"
                            onClick={() => handleUserApproval(u.id, 'approve')}
                            disabled={isProcessing === `user-${u.id}`}
                        >
                            <CheckCircle size={16} /> {isProcessing === `user-${u.id}` ? 'Approving...' : 'Approve Account'}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const renderTradeCard = (t) => {
        const isSelected = selectedTrades.has(t.id);
        const toggleSelect = () => {
            const next = new Set(selectedTrades);
            if (next.has(t.id)) next.delete(t.id);
            else next.add(t.id);
            setSelectedTrades(next);
        };
        return (
            <div className={`review-card trade-review-card ${isSelected ? 'selected' : ''}`} key={t.key}>
                <div className="review-card-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <input type="checkbox" checked={isSelected} onChange={toggleSelect} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                        <div className="card-badge badge-trade">
                            <ArrowLeftRight size={14} /> Duck Trade
                        </div>
                    </div>
                    <span className="card-time">
                        <Clock size={12} /> {new Date(t.timestamp).toLocaleString()}
                    </span>
                </div>

                <div className="card-main-content">
                    <div className="student-profile mb-md">
                        <div className="avatar-placeholder">
                            <User size={18} />
                        </div>
                        <div>
                            <h4>{t.nickname || t.username}</h4>
                            <span className="student-handle">@{t.username}</span>
                        </div>
                    </div>

                    <div className="trade-meta-row">
                        <div className="trade-meta-item">
                            <span className="info-label">Trade Request ID</span>
                            <span className="info-val monospace"><Hash size={12} /> {t.id}</span>
                        </div>
                    </div>

                    <div className="trade-binary-details">
                        <div className="binary-column">
                            <span className="binary-header">Bit Representation</span>
                            <span className="binary-val">{formatBits(t.bit_ducks)} bits</span>
                            <span className="binary-dec">({calculateDecimal(t.bit_ducks)} in decimal)</span>
                        </div>

                        {hasBytes(t.byte_ducks) && (
                            <div className="binary-column">
                                <span className="binary-header">Byte Representation</span>
                                <span className="binary-val">{formatBits(t.byte_ducks)} bytes</span>
                                <span className="binary-dec">({calculateDecimal(t.byte_ducks)} in decimal)</span>
                            </div>
                        )}
                    </div>

                    <div className="card-actions">
                        <button 
                            className="btn-reject"
                            onClick={() => handleTradeApproval(t.id, 'reject')}
                            disabled={isProcessing === `trade-${t.id}`}
                        >
                            <XCircle size={16} /> Reject Trade
                        </button>
                        <button 
                            className="btn-approve"
                            onClick={() => handleTradeApproval(t.id, 'approve')}
                            disabled={isProcessing === `trade-${t.id}`}
                        >
                            <CheckCircle size={16} /> {isProcessing === `trade-${t.id}` ? 'Processing...' : 'Approve Trade'}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const renderTrackCard = (r) => {
        const isSelected = selectedTracks.has(r.id);
        const toggleSelect = () => {
            const next = new Set(selectedTracks);
            if (next.has(r.id)) next.delete(r.id);
            else next.add(r.id);
            setSelectedTracks(next);
        };
        return (
            <div className={`review-card track-review-card ${isSelected ? 'selected' : ''}`} key={r.key}>
                <div className="review-card-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <input type="checkbox" checked={isSelected} onChange={toggleSelect} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                        <div className="card-badge badge-track">
                            <TrendingUp size={14} /> Track Change
                        </div>
                    </div>
                    <span className="card-time">
                        <Clock size={12} /> {new Date(r.requested_at).toLocaleString()}
                    </span>
                </div>

                <div className="card-main-content">
                    <div className="student-profile mb-md">
                        <div className="avatar-placeholder">
                            <User size={18} />
                        </div>
                        <div>
                            <h4>{r.student_name || `Student ID: ${r.student_id}`}</h4>
                            <span className="student-handle">Requested by: {r.requester_type}</span>
                        </div>
                    </div>

                    <div className="track-request-details">
                        <div className="track-change-row">
                            <span className="track-label">Change Track To:</span>
                            <span className="track-value-highlight">{getTrackName(r.requested_track)}</span>
                        </div>
                    </div>

                    <div className="card-actions">
                        <button 
                            className="btn-reject"
                            onClick={() => handleTrackApproval(r.id, 'reject')}
                            disabled={isProcessing === `track-${r.id}`}
                        >
                            <XCircle size={16} /> Deny Request
                        </button>
                        <button 
                            className="btn-approve"
                            onClick={() => handleTrackApproval(r.id, 'approve')}
                            disabled={isProcessing === `track-${r.id}`}
                        >
                            <CheckCircle size={16} /> {isProcessing === `track-${r.id}` ? 'Processing...' : 'Approve Track'}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const renderCourseCard = (c) => {
        return (
            <div className="review-card course-review-card" key={c.key}>
                <div className="review-card-header">
                    <div className="card-badge badge-course">
                        <CalendarCheck size={14} /> Course Request
                    </div>
                    <span className="card-time">
                        <Clock size={12} /> {new Date(c.requested_at).toLocaleString()}
                    </span>
                </div>

                <div className="card-main-content">
                    <div className="student-profile mb-md">
                        <div className="avatar-placeholder">
                            <User size={18} />
                        </div>
                        <div>
                            <h4>{c.student_username || `Student #${c.student_id}`}</h4>
                            <span className="student-handle">Awaiting Enrollment Setup</span>
                        </div>
                    </div>

                    <div className="course-request-info">
                        <div className="info-row">
                            <span className="info-label">Requested Course ID</span>
                            <span className="info-value">{c.requested_course_id || 'Not provided'}</span>
                        </div>
                        <div className="info-row">
                            <span className="info-label">Instance ID</span>
                            <span className="info-value">{c.course_instance_id}</span>
                        </div>
                        <div className="info-row">
                            <span className="info-label">CodeCombat / Ozaria URL</span>
                            <a href={c.url} target="_blank" rel="noopener noreferrer" className="url-link flex-center gap-6">
                                View URL <ExternalLink size={12} />
                            </a>
                        </div>
                    </div>

                    <div className="course-approval-selectors">
                        <div className="selector-field">
                            <label className="field-label" htmlFor={`classroom-select-${c.id}`}>Assign to Classroom</label>
                            <select 
                                id={`classroom-select-${c.id}`}
                                value={selectedClassrooms[c.id] || ''}
                                onChange={(e) => setSelectedClassrooms(prev => ({ ...prev, [c.id]: e.target.value }))}
                            >
                                {classrooms.map(room => (
                                    <option key={room.id} value={room.id}>{room.name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="selector-field">
                            <label className="field-label" htmlFor={`course-select-${c.id}`}>Assign Course Template</label>
                            <select 
                                id={`course-select-${c.id}`}
                                value={selectedCourses[c.id] || ''}
                                onChange={(e) => setSelectedCourses(prev => ({ ...prev, [c.id]: e.target.value }))}
                            >
                                {courses.map(crs => (
                                    <option key={crs.id} value={crs.id}>{crs.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="card-actions">
                        <button 
                            className="btn-reject"
                            onClick={() => handleCourseApproval(c.id, 'reject')}
                            disabled={isProcessing === `course-${c.id}`}
                        >
                            <XCircle size={16} /> Reject Request
                        </button>
                        <button 
                            className="btn-approve"
                            onClick={() => handleCourseApproval(c.id, 'approve')}
                            disabled={isProcessing === `course-${c.id}`}
                        >
                            <CheckCircle size={16} /> {isProcessing === `course-${c.id}` ? 'Processing...' : 'Approve & Map'}
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const renderCard = (item) => {
        switch (item.type) {
            case 'project': return renderProjectCard(item);
            case 'certificate': return renderCertificateCard(item);
            case 'user': return renderUserCard(item);
            case 'trade': return renderTradeCard(item);
            case 'track': return renderTrackCard(item);
            case 'course': return renderCourseCard(item);
            default: return null;
        }
    };

    if (isLoading) {
        return (
            <div className="to-review-page container-fluid">
                <AdminPageHeader title="To Review" />
                <div className="review-dashboard-layout">
                    <div className="review-tabs-pane">
                        {[1, 2, 3, 4, 5].map(i => (
                            <div key={i} className="tab-skeleton-wrapper" style={{ marginBottom: '0.75rem' }}>
                                <Skeleton height="45px" width="100%" borderRadius="8px" />
                            </div>
                        ))}
                    </div>
                    <div className="review-content-pane">
                        {[1, 2].map(i => (
                            <div key={i} className="review-card card-skeleton-wrapper" style={{ padding: '1.5rem', marginBottom: '1.5rem', background: '#fff', borderRadius: '16px', border: '1px solid var(--border-subtle)' }}>
                                <Skeleton height="20px" width="120px" className="mb-md" />
                                <div className="d-flex align-center gap-12 mb-md">
                                    <Skeleton height="36px" width="36px" borderRadius="50%" />
                                    <div>
                                        <Skeleton height="16px" width="150px" className="mb-4px" />
                                        <Skeleton height="12px" width="80px" />
                                    </div>
                                </div>
                                <Skeleton height="40px" width="100%" className="mb-md" />
                                <Skeleton height="36px" width="200px" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="to-review-page container-fluid">
            <AdminPageHeader title="To Review" />

            <div className="review-dashboard-layout">
                {/* Left Tabs */}
                <div className="review-tabs-pane">
                    {tabs.map(tab => {
                        const Icon = tab.icon;
                        const active = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                className={`review-tab-item ${active ? 'active' : ''}`}
                                onClick={() => setActiveTab(tab.id)}
                            >
                                <span className="tab-label-group">
                                    <Icon size={18} />
                                    <span>{tab.label}</span>
                                </span>
                                {tab.count > 0 && (
                                    <span className={`tab-badge-count ${active ? 'active' : ''}`}>
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Right Items feed */}
                <div className="review-content-pane">
                    {activeTab === 'certificates' && displayItems.length > 0 && (
                        <div className="bulk-actions-bar" style={{ display: 'flex', gap: '12px', marginBottom: '16px', justifyContent: 'flex-end' }}>
                            <a 
                                href={getApiUrl("/api/achievements/admin/certificates/download_all")}
                                className="btn-secondary"
                            >
                                <Download size={16} /> Download All
                            </a>
                            <button 
                                className="btn-approve"
                                onClick={handleApproveAllCertificates}
                                disabled={isProcessing === 'cert-all'}
                                style={{ flexGrow: 0 }}
                            >
                                <CheckCircle size={16} /> {isProcessing === 'cert-all' ? 'Approving All...' : 'Approve All Certificates'}
                            </button>
                        </div>
                    )}
                    
                    {activeTab === 'users' && displayItems.length > 0 && (
                        <div className="bulk-actions-bar" style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'center', justifyContent: 'space-between', background: '#fff', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input 
                                    type="checkbox" 
                                    checked={selectedUsers.size === pendingUsers.length && pendingUsers.length > 0} 
                                    onChange={(e) => {
                                        if (e.target.checked) setSelectedUsers(new Set(pendingUsers.map(u => u.id)));
                                        else setSelectedUsers(new Set());
                                    }}
                                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                />
                                <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-main)' }}>Select All ({selectedUsers.size})</span>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button className="btn-reject" onClick={() => handleBulkUserApproval('reject')} disabled={selectedUsers.size === 0 || isProcessing === 'bulk-user'}>
                                    <XCircle size={16} /> Reject Selected
                                </button>
                                <button className="btn-approve" onClick={() => handleBulkUserApproval('approve')} disabled={selectedUsers.size === 0 || isProcessing === 'bulk-user'}>
                                    <CheckCircle size={16} /> Approve Selected
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'trades' && displayItems.length > 0 && (
                        <div className="bulk-actions-bar" style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'center', justifyContent: 'space-between', background: '#fff', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input 
                                    type="checkbox" 
                                    checked={selectedTrades.size === trades.length && trades.length > 0} 
                                    onChange={(e) => {
                                        if (e.target.checked) setSelectedTrades(new Set(trades.map(t => t.id)));
                                        else setSelectedTrades(new Set());
                                    }}
                                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                />
                                <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-main)' }}>Select All ({selectedTrades.size})</span>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button className="btn-reject" onClick={() => handleBulkTradeApproval('reject')} disabled={selectedTrades.size === 0 || isProcessing === 'bulk-trade'}>
                                    <XCircle size={16} /> Reject Selected
                                </button>
                                <button className="btn-approve" onClick={() => handleBulkTradeApproval('approve')} disabled={selectedTrades.size === 0 || isProcessing === 'bulk-trade'}>
                                    <CheckCircle size={16} /> Approve Selected
                                </button>
                            </div>
                        </div>
                    )}

                    {activeTab === 'tracks' && displayItems.length > 0 && (
                        <div className="bulk-actions-bar" style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'center', justifyContent: 'space-between', background: '#fff', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <input 
                                    type="checkbox" 
                                    checked={selectedTracks.size === trackRequests.length && trackRequests.length > 0} 
                                    onChange={(e) => {
                                        if (e.target.checked) setSelectedTracks(new Set(trackRequests.map(r => r.id)));
                                        else setSelectedTracks(new Set());
                                    }}
                                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                                />
                                <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-main)' }}>Select All ({selectedTracks.size})</span>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button className="btn-reject" onClick={() => handleBulkTrackApproval('reject')} disabled={selectedTracks.size === 0 || isProcessing === 'bulk-track'}>
                                    <XCircle size={16} /> Deny Selected
                                </button>
                                <button className="btn-approve" onClick={() => handleBulkTrackApproval('approve')} disabled={selectedTracks.size === 0 || isProcessing === 'bulk-track'}>
                                    <CheckCircle size={16} /> Approve Selected
                                </button>
                            </div>
                        </div>
                    )}

                    {displayItems.length > 0 ? (
                        <div className="cards-feed-wrapper">
                            {displayItems.map(item => renderCard(item))}
                        </div>
                    ) : (
                        <div className="inbox-empty-state">
                            <div className="empty-icon-wrap">
                                <Inbox size={48} />
                            </div>
                            <h3>All Caught Up!</h3>
                            <p>No items pending review for <strong>{tabs.find(t => t.id === activeTab)?.label}</strong>.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ToReview;
