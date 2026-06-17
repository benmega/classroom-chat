import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Loader2, ArrowLeft, Activity, Award, BookOpen, User, ChevronDown, ChevronUp } from 'lucide-react';
import client from '../../api/client';
import ContributionGraph from '../../components/profile/ContributionGraph';
import ProjectPortfolio from '../../components/profile/ProjectPortfolio';
import DigitalNotebook from '../../components/profile/DigitalNotebook';
import ProjectModal from '../../components/profile/ProjectModal';
import NoteSlideshow from '../../components/profile/NoteSlideshow';
import DesktopNotice from '../../components/common/DesktopNotice';
import CourseProgress from '../../components/profile/CourseProgress';
import '../../assets/css/sprite.css';
import '../Profile/Profile.css';
import './ParentReportCard.css';

const ParentReportCard = () => {
    const { studentId } = useParams();
    const navigate = useNavigate();
    const [reportData, setReportData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedProject, setSelectedProject] = useState(null);
    const [slideshowIndex, setSlideshowIndex] = useState(null);

    useEffect(() => {
        const fetchReport = async () => {
            try {
                const response = await client.get(`/api/parents/student/${studentId}/report`);
                setReportData(response.data.data);
            } catch (err) {
                setError(err.response?.data?.error || 'Failed to load report card');
            } finally {
                setIsLoading(false);
            }
        };
        fetchReport();
    }, [studentId]);

    if (isLoading) {
        return (
            <div className="report-loading">
                <Loader2
                    size={56}
                    strokeWidth={1.5}
                    style={{ animation: 'spin 1s linear infinite', color: 'var(--primary-color)' }}
                />
                <div style={{ textAlign: 'center' }}>
                    <h2>Loading Report Card</h2>
                    <p>Fetching your child's progress…</p>
                </div>
                <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
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

    return (
        <>
        <div className="report-card-page animate-page-entry">
            {/* ── Header ── */}
            <header className="report-header glass-panel">
                <div className="report-header-inner" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', justifyContent: 'flex-start' }}>
                    <button
                        className="btn-secondary btn-secondary-sm report-back-btn"
                        style={{ marginBottom: '0' }}
                        onClick={() => navigate('/parent/dashboard')}
                    >
                        <ArrowLeft size={16} />
                        Back
                    </button>

                    <div className="report-student-info">
                        {reportData.profile_picture_url ? (
                            <img
                                className="report-student-avatar"
                                src={reportData.profile_picture_url}
                                alt={reportData.username}
                            />
                        ) : (
                            <div className="report-student-avatar-placeholder">
                                <User size={24} strokeWidth={1.5} />
                            </div>
                        )}
                        <div className="report-student-details">
                            <h1 style={{ fontSize: '1.5rem', marginBottom: '0' }}>{reportData.username}</h1>
                            {reportData.nickname && (
                                <p className="report-student-nick" style={{ margin: '0', fontSize: '0.9rem' }}>{reportData.nickname}</p>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* ── Body Sections ── */}
            <DesktopNotice />
            <div className="dashboard-grid report-dashboard-grid" style={{ marginTop: '20px' }}>
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
