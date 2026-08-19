import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Loader2, ArrowLeft, Activity, Award, BookOpen, User, ChevronDown, ChevronUp, Zap, TrendingUp, BarChart2 } from 'lucide-react';
import client from '../../api/client';
import { getApiUrl } from '../../utils/apiUrl';
import ContributionGraph from '../../components/profile/ContributionGraph';
import ProjectPortfolio from '../../components/profile/ProjectPortfolio';
import DigitalNotebook from '../../components/profile/DigitalNotebook';
import ProjectModal from '../../components/profile/ProjectModal';
import NoteSlideshow from '../../components/profile/NoteSlideshow';
import DesktopNotice from '../../components/common/DesktopNotice';
import CourseProgress from '../../components/profile/CourseProgress';
import { Line, Bar } from 'react-chartjs-2';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import '../../assets/css/sprite.css';
import '../Profile/Profile.css';
import './ParentReportCard.css';
import Skeleton from '../../components/common/Skeleton';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

/** Returns a human-readable relative time string (e.g. "2 hours ago"). */
function timeAgo(isoString) {
    if (!isoString) return '';
    const now = new Date();
    const then = new Date(isoString);
    const diffMs = now - then;
    const diffSecs = Math.floor(diffMs / 1000);
    if (diffSecs < 60) return 'just now';
    const diffMins = Math.floor(diffSecs / 60);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays < 30) return `${diffDays}d ago`;
    return then.toLocaleDateString();
}

const ParentReportCard = () => {
    const { studentId } = useParams();
    const navigate = useNavigate();
    const [reportData, setReportData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedProject, setSelectedProject] = useState(null);
    const [slideshowIndex, setSlideshowIndex] = useState(null);
    const [historyData, setHistoryData] = useState(null);


    useEffect(() => {
        const fetchReport = async () => {
            try {
                const response = await client.get(`/api/parents/student/${studentId}/report`);
                setReportData(response.data.data);
                // Persist so the nav rail can offer a quick-return link
                localStorage.setItem('parent_last_report_child_id', studentId);
            } catch (err) {
                setError(err.response?.data?.error || 'Failed to load report card');
            } finally {
                setIsLoading(false);
            }
        };
        fetchReport();
    }, [studentId, error]);

    // Fetch historical progress data separately after the main report loads
    useEffect(() => {
        if (!studentId || error) return;
        const fetchHistory = async () => {
            try {
                const response = await client.get(`/api/parents/student/${studentId}/history`);
                setHistoryData(response.data.data);
            } catch (err) {
                // Non-critical: silently fail if history is unavailable
                if (err.response && err.response.status === 403) return; console.warn('Could not load history data:', err);
            }
        };
        fetchHistory();
    }, [studentId, error]);

    if (isLoading) {
        return (
            <div className="report-card-page animate-page-entry" style={{ padding: '2rem' }}>
                <header className="report-header glass-panel" style={{ padding: '1.5rem', marginBottom: '2rem', borderRadius: '12px' }}>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <Skeleton height="36px" width="36px" borderRadius="8px" />
                        <Skeleton height="48px" width="48px" borderRadius="50%" />
                        <div style={{ flexGrow: 1 }}>
                            <Skeleton height="24px" width="150px" style={{ marginBottom: '6px' }} />
                            <Skeleton height="14px" width="100px" />
                        </div>
                    </div>
                </header>
                <div className="dashboard-grid report-dashboard-grid report-dashboard-grid-spaced" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '2rem' }}>
                    <div className="column-left" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        <div className="dashboard-panel" style={{ padding: '1.5rem', background: 'var(--bg-secondary)', borderRadius: '12px' }}>
                            <Skeleton height="28px" width="200px" style={{ marginBottom: '1.5rem' }} />
                            <Skeleton height="180px" borderRadius="8px" />
                        </div>
                        <div className="dashboard-panel" style={{ padding: '1.5rem', background: 'var(--bg-secondary)', borderRadius: '12px' }}>
                            <Skeleton height="28px" width="180px" style={{ marginBottom: '1.5rem' }} />
                            <div style={{ display: 'flex', gap: '1rem' }}>
                                <Skeleton height="80px" width="80px" borderRadius="8px" />
                                <Skeleton height="80px" width="80px" borderRadius="8px" />
                                <Skeleton height="80px" width="80px" borderRadius="8px" />
                            </div>
                        </div>
                    </div>
                    <div className="column-right">
                        <div className="dashboard-panel" style={{ padding: '1.5rem', background: 'var(--bg-secondary)', borderRadius: '12px' }}>
                            <Skeleton height="28px" width="150px" style={{ marginBottom: '1.5rem' }} />
                            <Skeleton height="120px" borderRadius="8px" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (error || !reportData) {
        return (
            <div className="report-card-page animate-page-entry">
                <div className="report-error">
                    <h2>Unable to Load Report</h2>
                    <p>{error || 'Report data is unavailable.'}</p>
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1.5rem' }}>
                        <button
                            className="report-error-back-btn"
                            onClick={() => navigate('/parent/dashboard')}
                        >
                            <ArrowLeft size={16} />
                            Back to Dashboard
                        </button>
                        <button
                            className="btn-primary"
                            onClick={() => navigate('/parent/connect')}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                        >
                            Link a New Student
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const ccLevels = reportData.cc_levels !== undefined ? reportData.cc_levels : (reportData.course_progress?.codecombat?.levels_completed || 0);
    const ozLevels = reportData.oz_levels !== undefined ? reportData.oz_levels : (reportData.course_progress?.ozaria?.levels_completed || 0);
    const totalLevels = ccLevels + ozLevels;

    const isReportEmpty = 
        totalLevels === 0 &&
        (!reportData.unlocked_achievements || reportData.unlocked_achievements.length === 0) &&
        (!reportData.projects || reportData.projects.length === 0) &&
        (!reportData.notes || reportData.notes.length === 0) &&
        (!historyData?.recent_events || historyData.recent_events.length === 0) &&
        (!reportData.contribution_data?.rows || !reportData.contribution_data.rows.some(row => row && row.some(cell => cell && cell.level > 0))) &&
        (!historyData || (
            (!historyData.duck_history?.labels || historyData.duck_history.labels.length === 0) &&
            (!historyData.challenge_history?.labels || historyData.challenge_history.labels.length === 0)
        ));

    return (
        <>
        <div className="report-card-page animate-page-entry">
            {/* ── Header ── */}
            <header className="report-header glass-panel">
                <div className="report-header-inner">
                    <button
                        className="btn-secondary btn-secondary-sm report-back-btn"
                        onClick={() => navigate('/parent/dashboard')}
                        title="Back to Dashboard"
                        aria-label="Back to Dashboard"
                    >
                        <ArrowLeft size={16} />
                    </button>

                    <div className="report-student-info">
                        {reportData.profile_picture_url && !reportData.profile_picture_url.includes('Default_pfp.jpg') ? (
                            <img
                                className="report-student-avatar"
                                src={getApiUrl(reportData.profile_picture_url)}
                                alt={reportData.username}
                            />
                        ) : (
                            <div className="report-student-avatar-placeholder">
                                <User size={20} strokeWidth={1.5} />
                            </div>
                        )}
                        <div className="report-student-details">
                            <h1 className="report-student-name">
                                {reportData.nickname || reportData.username}
                            </h1>
                            {reportData.nickname && (
                                <p className="report-student-id">
                                    {reportData.username}
                                </p>
                            )}
                            {reportData.current_activity && (
                                <p className="student-activity" style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                    <span className="activity-dot"></span>
                                    {reportData.current_activity}
                                </p>
                            )}

                        </div>
                    </div>
                </div>
            </header>

            {/* ── Body Sections ── */}
            <DesktopNotice />
            
            {isReportEmpty ? (
                <div className="report-empty-state glass-panel animate-page-entry" style={{ padding: '3rem', textAlign: 'center', margin: '2rem auto', maxWidth: '600px', borderRadius: '12px' }}>
                    <p style={{ fontSize: '1.2rem', color: 'var(--text-secondary)', margin: 0, fontWeight: '500', lineHeight: '1.6' }}>
                        Welcome to the classroom chat. You'll be able to see your child's activity here.
                    </p>
                </div>
            ) : (
                <div className="dashboard-grid report-dashboard-grid report-dashboard-grid-spaced">
                    <div className="column-left">
                        <CourseProgress target={reportData} isParentView={true} studentId={studentId} />

                        {/* Achievements */}
                        {reportData.unlocked_achievements && reportData.unlocked_achievements.length > 0 && (
                            <section className="dashboard-panel">
                                <div className="panel-header">
                                    <h2><Award size={20} /> Achievements</h2>
                                </div>
                                <div className="achievement-strip-container">
                                    <div className="achievement-strip">
                                        {reportData.unlocked_achievements.map((ua) => (
                                            <div key={ua.id} className="ach-strip-item">
                                                <div className={`badge badge-${ua.achievement?.slug || ua.slug || 'default'} mini`}>&nbsp;</div>
                                                <div className="ach-strip-info">
                                                    <span className="ach-name">
                                                        {ua.achievement?.name || ua.name}
                                                    </span>
                                                    {(ua.achievement?.description || ua.description) && (
                                                        <span className="ach-desc">
                                                            {ua.achievement?.description || ua.description}
                                                        </span>
                                                    )}
                                                    {ua.earned_at && (
                                                        <span className="ach-date">
                                                            Earned {new Date(ua.earned_at).toLocaleDateString()}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </section>
                        )}



                        {/* Recent Events Feed */}
                        {historyData?.recent_events && historyData.recent_events.length > 0 && (
                            <section className="dashboard-panel">
                                <div className="panel-header">
                                    <h2><Activity size={20} /> Recent Activity</h2>
                                </div>
                                <div className="events-feed" style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                                    {historyData.recent_events.map((event, idx) => (
                                        <div key={idx} className={`event-item event-item--${event.type}`}>
                                            <div className="event-icon">
                                                {event.icon === 'award'
                                                    ? <Award size={15} />
                                                    : <Zap size={15} />
                                                }
                                            </div>
                                            <div className="event-body">
                                                <span className="event-label">{event.label}</span>
                                                <span className="event-time">{timeAgo(event.timestamp)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>

                    <div className="column-right">
                        <ProjectPortfolio 
                            projects={reportData.projects} 
                            isOwner={false} 
                            setSelectedProject={setSelectedProject}
                        />

                        {/* Activity / Contribution Graph */}
                        {reportData.contribution_data?.rows?.some(row => row && row.some(cell => cell && cell.level > 0)) && (
                            <section className="dashboard-panel">
                                <div className="panel-header">
                                    <h2><Activity size={20} /> Coding Activity</h2>
                                </div>
                                <div className="contribution-container">
                                    <ContributionGraph data={reportData.contribution_data} />
                                </div>
                            </section>
                        )}

                        <DigitalNotebook 
                            notes={reportData.notes}
                            isOwner={false}
                            setSlideshowIndex={setSlideshowIndex}
                        />
                    </div>
                </div>
            )}
        </div>

        <ProjectModal 
            project={selectedProject} 
            onClose={() => setSelectedProject(null)} 
        />
        {slideshowIndex !== null && (
            <NoteSlideshow
                notes={reportData.notes}
                initialIndex={slideshowIndex}
                onClose={() => setSlideshowIndex(null)}
            />
        )}
        </>
    );
};

export default ParentReportCard;
