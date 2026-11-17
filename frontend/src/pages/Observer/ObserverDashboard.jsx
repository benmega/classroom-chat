import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
    Search,
    Eye,
    Users,
    Activity,
    Folder,
    BarChart2,
    Map,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
import client from '../../api/client';
import { getApiUrl } from '../../utils/apiUrl';
import { getErrorMessage } from '../../utils/apiError';
import SmartImage from '../../components/common/SmartImage';
import Skeleton from '../../components/common/Skeleton';
import useDocumentTitle from '../../hooks/useDocumentTitle';
import './ObserverDashboard.css';

const PER_PAGE = 24;

const TRACK_FILTERS = [
    { label: 'All Tracks', value: '' },
    { label: 'Computer Science', value: 'cs' },
    { label: 'Ozaria', value: 'ozaria' },
    { label: '3D Modeling', value: '3d' },
];

const ObserverDashboard = () => {
    useDocumentTitle('Observer dashboard');
    const [students, setStudents] = useState([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalStudents, setTotalStudents] = useState(0);
    const [searchInput, setSearchInput] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [activeTrack, setActiveTrack] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearch(searchInput.trim());
            setPage(1);
        }, 250);
        return () => clearTimeout(timer);
    }, [searchInput]);

    const handleTrackChange = (trackValue) => {
        setActiveTrack(trackValue);
        setPage(1);
    };

    const fetchStudents = useCallback(async (signal) => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await client.get('/api/parents/students', {
                params: {
                    page,
                    per_page: PER_PAGE,
                    search: debouncedSearch,
                    track: activeTrack,
                },
                signal,
            });
            const payload = response.data?.data || response.data || {};
            setStudents(payload.students || []);
            setTotalPages(Math.max(1, payload.pages || 1));
            setTotalStudents(payload.total ?? 0);
        } catch (err) {
            if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') return;
            setError(getErrorMessage(err, 'Failed to load student progress directory.'));
        } finally {
            setIsLoading(false);
        }
    }, [page, debouncedSearch, activeTrack]);

    useEffect(() => {
        const controller = new AbortController();
        fetchStudents(controller.signal);
        return () => controller.abort();
    }, [fetchStudents]);

    const rangeEnd = Math.min(page * PER_PAGE, totalStudents);
    const rangeStart = totalStudents === 0 ? 0 : (page - 1) * PER_PAGE + 1;

    return (
        <div className="observer-dashboard animate-page-entry">
            <header className="observer-header">
                <div className="observer-title-group">
                    <div className="observer-title-row">
                        <h1 className="observer-title">Student Progress Directory</h1>
                        <span className="observer-readonly-badge">
                            <Eye size={13} aria-hidden="true" />
                            Read-Only Observer
                        </span>
                    </div>
                    <p className="observer-subtitle">
                        Review progress reports, learning paths, and test results across all students.
                    </p>
                </div>
                <div className="observer-count-pill">
                    <Users size={16} aria-hidden="true" />
                    <span>{totalStudents} {totalStudents === 1 ? 'Student' : 'Students'}</span>
                </div>
            </header>

            <div className="observer-toolbar">
                <div className="observer-search-box">
                    <Search size={16} className="observer-search-icon" aria-hidden="true" />
                    <input
                        type="text"
                        className="observer-search-input"
                        aria-label="Search students"
                        placeholder="Search by name or @username..."
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                    />
                </div>
                <div className="observer-track-tabs" role="group" aria-label="Filter by learning track">
                    {TRACK_FILTERS.map((track) => (
                        <button
                            key={track.value || 'all'}
                            type="button"
                            className={`observer-track-tab ${activeTrack === track.value ? 'active' : ''}`}
                            aria-pressed={activeTrack === track.value}
                            onClick={() => handleTrackChange(track.value)}
                        >
                            {track.label}
                        </button>
                    ))}
                </div>
            </div>

            {error && (
                <div className="observer-error-banner" role="alert">
                    {error}
                </div>
            )}

            {isLoading ? (
                <div className="observer-grid">
                    {[1, 2, 3, 4, 5, 6].map((idx) => (
                        <div key={idx} className="observer-skeleton-card" data-testid="observer-skeleton-card">
                            <Skeleton height="48px" borderRadius="8px" style={{ marginBottom: '0.75rem' }} />
                            <Skeleton height="64px" borderRadius="8px" style={{ marginBottom: '0.75rem' }} />
                            <Skeleton height="34px" borderRadius="8px" />
                        </div>
                    ))}
                </div>
            ) : students.length === 0 ? (
                <div className="observer-empty-state">
                    <p>No students found matching your search.</p>
                </div>
            ) : (
                <div className="observer-grid">
                    {students.map((student) => {
                        const displayName = student.nickname || student.username;
                        return (
                            <article key={student.id} className="observer-card">
                                <div className="observer-card-header">
                                    <SmartImage
                                        src={student.profile_picture ? getApiUrl(`/user/profile_pictures/${student.profile_picture}`) : ''}
                                        alt=""
                                        className="observer-avatar"
                                        fallbackType="avatar"
                                    />
                                    <div className="observer-identity">
                                        <h2 className="observer-name">{displayName}</h2>
                                        <span className="observer-handle">@{student.username}</span>
                                    </div>
                                    <span className={`observer-status-pill ${student.is_online ? 'online' : 'offline'}`}>
                                        <span className="observer-status-dot" aria-hidden="true" />
                                        {student.is_online ? 'Active' : 'Offline'}
                                    </span>
                                </div>

                                {student.current_activity && (
                                    <div className="observer-activity" title={student.current_activity}>
                                        <Activity size={14} aria-hidden="true" />
                                        <span className="observer-activity-text">{student.current_activity}</span>
                                    </div>
                                )}

                                <div className="observer-stats-box">
                                    <div className="observer-total-levels">
                                        <span>Total Levels Completed</span>
                                        <span>{student.total_levels || 0}</span>
                                    </div>
                                    <div className="observer-track-pills">
                                        <span className="observer-track-pill">CS: {student.cc_levels || 0}</span>
                                        <span className="observer-track-pill">Ozaria: {student.oz_levels || 0}</span>
                                        <span className="observer-track-pill">3D: {student.td_levels || 0}</span>
                                    </div>
                                    {student.recent_project?.name && (
                                        <div className="observer-recent-project">
                                            <Folder size={13} aria-hidden="true" />
                                            <span>Recent project: {student.recent_project.name}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="observer-card-actions">
                                    <Link
                                        to={`/parent/report/${student.id}`}
                                        className="observer-action-btn primary"
                                    >
                                        <BarChart2 size={14} aria-hidden="true" />
                                        Progress Report
                                    </Link>
                                    {student.slug && (
                                        <Link
                                            to={`/parent/course-progress/${student.slug}`}
                                            className="observer-action-btn secondary"
                                        >
                                            <Map size={14} aria-hidden="true" />
                                            Learning Path
                                        </Link>
                                    )}
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}

            <div className="observer-pagination">
                <div className="observer-pagination-info">
                    Showing {rangeStart}-{rangeEnd} of {totalStudents} students
                </div>
                <div className="observer-pagination-controls">
                    <button
                        type="button"
                        className="observer-page-btn"
                        disabled={page <= 1 || isLoading}
                        onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                    >
                        <ChevronLeft size={16} aria-hidden="true" /> Previous
                    </button>
                    <button
                        type="button"
                        className="observer-page-btn"
                        disabled={page >= totalPages || isLoading}
                        onClick={() => setPage((prev) => prev + 1)}
                    >
                        Next <ChevronRight size={16} aria-hidden="true" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ObserverDashboard;
