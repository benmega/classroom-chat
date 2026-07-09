import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Loader2, ArrowLeft, Activity, Award, BookOpen, User, ChevronDown, ChevronUp, Printer, Zap, TrendingUp, BarChart2 } from 'lucide-react';
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
    }, [studentId]);

    // Fetch historical progress data separately after the main report loads
    useEffect(() => {
        if (!studentId) return;
        const fetchHistory = async () => {
            try {
                const response = await client.get(`/api/parents/student/${studentId}/history`);
                setHistoryData(response.data.data);
            } catch (err) {
                // Non-critical: silently fail if history is unavailable
                console.warn('Could not load history data:', err);
            }
        };
        fetchHistory();
    }, [studentId]);

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
                    <button
                        className="report-error-back-btn"
                        onClick={() => navigate('/parent/dashboard')}
                    >
                        <ArrowLeft size={16} />
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    // Chart.js data configurations
    const duckChartData = historyData?.duck_history ? {
        labels: historyData.duck_history.labels,
        datasets: [{
            label: 'Duck Balance',
            data: historyData.duck_history.data,
            borderColor: '#0eb2bb',
            backgroundColor: 'rgba(14, 178, 187, 0.12)',
            pointBackgroundColor: '#0eb2bb',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 4,
            tension: 0.4,
            fill: true,
        }],
    } : null;

    const challengeChartData = historyData?.challenge_history ? {
        labels: historyData.challenge_history.labels,
        datasets: [{
            label: 'Challenges Completed',
            data: historyData.challenge_history.data,
            backgroundColor: 'rgba(16, 185, 129, 0.75)',
            borderColor: '#10b981',
            borderRadius: 6,
            borderSkipped: false,
        }],
    } : null;

    const sharedChartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(15, 15, 25, 0.92)',
                titleColor: '#e2e8f0',
                bodyColor: '#94a3b8',
                borderColor: 'rgba(255,255,255,0.08)',
                borderWidth: 1,
                padding: 10,
                cornerRadius: 8,
            },
        },
        scales: {
            x: {
                grid: { color: 'rgba(255,255,255,0.05)' },
                ticks: { color: 'var(--text-muted)', font: { size: 11 }, maxTicksLimit: 8 },
            },
            y: {
                grid: { color: 'rgba(255,255,255,0.05)' },
                ticks: { color: 'var(--text-muted)', font: { size: 11 } },
                beginAtZero: true,
            },
        },
    };

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
                                    <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--primary-color)', marginRight: '6px' }}></span>
                                    {reportData.current_activity}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Feature 6: Print Report Button */}
                    <button
                        className="btn-secondary btn-secondary-sm print-report-btn"
                        onClick={() => window.print()}
                        title="Print Report"
                        aria-label="Print Report"
                    >
                        <Printer size={14} />
                        <span>Print</span>
                    </button>
                </div>
            </header>

            {/* ── Body Sections ── */}
            <DesktopNotice />
            <div className="dashboard-grid report-dashboard-grid report-dashboard-grid-spaced">
                <div className="column-left">
                    <CourseProgress target={reportData} isParentView={true} studentId={studentId} />

                    {/* Achievements */}
                    <section className="dashboard-panel">
                        <div className="panel-header">
                            <h2><Award size={20} /> Achievements</h2>
                        </div>
                        {(!reportData.unlocked_achievements || reportData.unlocked_achievements.length === 0) ? (
                            <div className="report-empty-achievements">
                                <Award size={32} strokeWidth={1.2} />
                                <p>No achievements earned yet.</p>
                            </div>
                        ) : (
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
                        )}
                    </section>

                    {/* Feature 4: Historical Progress Charts */}
                    <section className="dashboard-panel">
                        <div className="panel-header">
                            <h2><TrendingUp size={20} /> Progress Over Time</h2>
                        </div>

                        {!historyData ? (
                            <div className="history-charts-loading">
                                <Skeleton height="200px" borderRadius="8px" style={{ marginBottom: '1.5rem' }} />
                                <Skeleton height="200px" borderRadius="8px" />
                            </div>
                        ) : (
                            <div className="history-charts-wrapper">
                                {/* Duck Balance Line Chart */}
                                <div className="chart-block">
                                    <p className="chart-label">
                                        🦆 Duck Balance (last 30 days)
                                    </p>
                                    {duckChartData && duckChartData.labels.length > 0 ? (
                                        <div style={{ height: '200px', position: 'relative' }}>
                                            <Line data={duckChartData} options={sharedChartOptions} />
                                        </div>
                                    ) : (
                                        <div className="chart-empty">No duck transactions in the last 30 days.</div>
                                    )}
                                </div>

                                {/* Challenge Completions Bar Chart */}
                                <div className="chart-block">
                                    <p className="chart-label">
                                        <BarChart2 size={14} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
                                        Daily Challenge Completions
                                    </p>
                                    {challengeChartData && challengeChartData.labels.length > 0 ? (
                                        <div style={{ height: '200px', position: 'relative' }}>
                                            <Bar data={challengeChartData} options={sharedChartOptions} />
                                        </div>
                                    ) : (
                                        <div className="chart-empty">No challenge completions in the last 30 days.</div>
                                    )}
                                </div>
                            </div>
                        )}
                    </section>

                    {/* Recent Events Feed */}
                    {historyData?.recent_events && historyData.recent_events.length > 0 && (
                        <section className="dashboard-panel">
                            <div className="panel-header">
                                <h2><Activity size={20} /> Recent Activity</h2>
                            </div>
                            <div className="events-feed">
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
                    <section className="dashboard-panel">
                        <div className="panel-header">
                            <h2><Activity size={20} /> Coding Activity</h2>
                        </div>
                        <div className="contribution-container">
                            <ContributionGraph data={reportData.contribution_data} />
                        </div>
                    </section>

                    <DigitalNotebook 
                        notes={reportData.notes}
                        isOwner={false}
                        setSlideshowIndex={setSlideshowIndex}
                    />
                </div>
            </div>
        </div>

        <ProjectModal 
            project={selectedProject} 
            onClose={() => setSelectedProject(null)} 
        />

        <NoteSlideshow 
            notes={reportData.notes}
            currentIndex={slideshowIndex}
            onClose={() => setSlideshowIndex(null)}
            onPrev={() => setSlideshowIndex(i => i > 0 ? i - 1 : reportData.notes.length - 1)}
            onNext={() => setSlideshowIndex(i => i < reportData.notes.length - 1 ? i + 1 : 0)}
        />
        </>
    );
};

export default ParentReportCard;
