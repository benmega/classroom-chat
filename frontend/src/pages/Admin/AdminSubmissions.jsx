import React, { useState, useEffect, useCallback } from 'react';
import {
    Inbox,
    User,
    Clock,
    Download,
    CheckCircle,
    Trash2,
    FileText,
    StickyNote,
    Reply
} from 'lucide-react';
import client from '../../api/client';
import toast from 'react-hot-toast';
import { getApiUrl } from '../../utils/apiUrl';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import Skeleton from '../../components/common/Skeleton';
import './AdminSubmissions.css';

const formatFileSize = (bytes) => {
    if (bytes === null || bytes === undefined || isNaN(bytes)) return '';
    if (bytes < 1024) return `${bytes} B`;
    const units = ['KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = -1;
    do {
        size /= 1024;
        unitIndex++;
    } while (size >= 1024 && unitIndex < units.length - 1);
    return `${size.toFixed(1)} ${units[unitIndex]}`;
};

const AdminSubmissions = () => {
    const [submissions, setSubmissions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(null);
    const [statusFilter, setStatusFilter] = useState('pending');
    const [noteDrafts, setNoteDrafts] = useState({});

    const fetchSubmissions = useCallback(async (status) => {
        setIsLoading(true);
        try {
            const response = await client.get('/api/admin/submissions', {
                params: status === 'all' ? {} : { status }
            });
            if (response.data.status === 'success') {
                setSubmissions(response.data.data.submissions || []);
            }
        } catch {
            toast.error('Failed to load student file submissions.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSubmissions(statusFilter);
    }, [statusFilter, fetchSubmissions]);

    const handleMarkReviewed = async (id) => {
        setIsProcessing(id);
        try {
            const teacherNote = noteDrafts[id] || '';
            const response = await client.post(`/api/admin/submissions/${id}/mark-reviewed`, {
                teacher_note: teacherNote
            });
            if (response.data.status === 'success') {
                if (statusFilter === 'pending') {
                    setSubmissions((prev) => prev.filter((s) => s.id !== id));
                } else {
                    const updated = response.data.data?.submission;
                    setSubmissions((prev) => prev.map((s) => (s.id === id ? { ...s, ...updated, status: 'reviewed' } : s)));
                }
                setNoteDrafts((prev) => {
                    const next = { ...prev };
                    delete next[id];
                    return next;
                });
                toast.success('Marked as reviewed.');
            } else {
                toast.error(response.data.error || 'Failed to update submission.');
            }
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to update submission.');
        } finally {
            setIsProcessing(null);
        }
    };

    const handleNoteDraftChange = (id, value) => {
        setNoteDrafts((prev) => ({ ...prev, [id]: value }));
    };

    const handleDelete = async (id, filename) => {
        if (!window.confirm(`Are you sure you want to delete "${filename}"? This cannot be undone.`)) return;

        setIsProcessing(id);
        try {
            const response = await client.delete(`/api/admin/submissions/${id}`);
            if (response.data.status === 'success') {
                setSubmissions((prev) => prev.filter((s) => s.id !== id));
                toast.success('Submission deleted.');
            } else {
                toast.error(response.data.error || 'Failed to delete submission.');
            }
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to delete submission.');
        } finally {
            setIsProcessing(null);
        }
    };

    if (isLoading) return (
        <div className="admin-submissions-page animate-page-entry p-2rem">
            <header className="page-header">
                <Skeleton height="40px" width="240px" className="skeleton-title mb-2rem" />
            </header>
            <div className="submissions-list">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="submission-card card" style={{ padding: '1.5rem', marginBottom: '1rem', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                        <div className="d-flex justify-between align-center mb-md">
                            <div className="d-flex align-center gap-12">
                                <Skeleton height="48px" width="48px" borderRadius="50%" />
                                <div>
                                    <Skeleton height="18px" width="120px" className="mb-4px" />
                                    <Skeleton height="14px" width="80px" />
                                </div>
                            </div>
                            <Skeleton height="24px" width="100px" borderRadius="12px" />
                        </div>
                        <div className="d-flex gap-md mt-1-5rem">
                            <Skeleton height="36px" width="100px" borderRadius="6px" />
                            <Skeleton height="36px" width="100px" borderRadius="6px" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div className="admin-submissions-page">
            <AdminPageHeader title="File Submissions" />

            <div className="filter-tabs-container">
                <div className="filter-tabs">
                    <button
                        className={`tab-btn ${statusFilter === 'pending' ? 'active' : ''}`}
                        onClick={() => setStatusFilter('pending')}
                    >
                        Pending
                    </button>
                    <button
                        className={`tab-btn ${statusFilter === 'all' ? 'active' : ''}`}
                        onClick={() => setStatusFilter('all')}
                    >
                        All
                    </button>
                </div>
            </div>

            <div className="submissions-list">
                {submissions.length > 0 ? (
                    submissions.map((submission) => (
                        <div key={submission.id} className="submission-card card">
                            <div className="submission-header">
                                <div className="user-info">
                                    <div className="avatar-placeholder">
                                        <User size={24} />
                                    </div>
                                    <div className="submission-user-details">
                                        <h3 className="submission-user-name">{submission.nickname || submission.username}</h3>
                                        <span className="submission-user-handle">@{submission.username}</span>
                                    </div>
                                </div>
                                <div className="submission-meta-column">
                                    <span className={`status-badge status-${submission.status}`}>
                                        {submission.status === 'reviewed' ? 'Reviewed' : 'Pending'}
                                    </span>
                                    <span className="timestamp timestamp-mt-0">
                                        <Clock size={12} />
                                        {new Date(submission.timestamp).toLocaleString()}
                                    </span>
                                </div>
                            </div>

                            <div className="submission-details">
                                <div className="submission-file-row">
                                    <FileText size={18} />
                                    <span className="submission-filename">{submission.original_filename}</span>
                                    <span className="submission-filesize">{formatFileSize(submission.file_size)}</span>
                                </div>
                                {submission.note && (
                                    <div className="submission-note-row">
                                        <StickyNote size={14} />
                                        <span>{submission.note}</span>
                                    </div>
                                )}
                                {submission.teacher_note && (
                                    <div className="submission-note-row teacher-note-row">
                                        <Reply size={14} />
                                        <span>You: {submission.teacher_note}</span>
                                    </div>
                                )}
                            </div>

                            {submission.status !== 'reviewed' && (
                                <div className="teacher-note-input-row">
                                    <input
                                        type="text"
                                        className="teacher-note-input"
                                        placeholder="Optional note back to the student..."
                                        value={noteDrafts[submission.id] || ''}
                                        onChange={(e) => handleNoteDraftChange(submission.id, e.target.value)}
                                        maxLength={500}
                                        disabled={isProcessing === submission.id}
                                    />
                                </div>
                            )}

                            <div className="submission-actions">
                                <a
                                    href={getApiUrl(`/api/admin/submissions/${submission.id}/download`)}
                                    className="btn-secondary"
                                    title="Download file"
                                >
                                    <Download size={16} /> Download
                                </a>
                                {submission.status !== 'reviewed' && (
                                    <button
                                        className="btn-approve"
                                        onClick={() => handleMarkReviewed(submission.id)}
                                        disabled={isProcessing === submission.id}
                                    >
                                        <CheckCircle size={16} /> {isProcessing === submission.id ? 'Working...' : 'Mark Reviewed'}
                                    </button>
                                )}
                                <button
                                    className="btn-reject"
                                    onClick={() => handleDelete(submission.id, submission.original_filename)}
                                    disabled={isProcessing === submission.id}
                                >
                                    <Trash2 size={16} /> Delete
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="empty-state card">
                        <Inbox size={48} />
                        <h3>No Submissions</h3>
                        <p>
                            {statusFilter === 'pending'
                                ? 'When students send files from the Submit Work page, they will show up here.'
                                : 'Nothing to show for this filter yet.'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminSubmissions;
