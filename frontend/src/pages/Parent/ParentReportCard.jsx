import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft, Activity, Award, BookOpen, User } from 'lucide-react';
import client from '../../api/client';
import ContributionGraph from '../../components/profile/ContributionGraph';
import '../../assets/css/sprite.css';
import './ParentReportCard.css';

const ParentReportCard = () => {
    const { studentId } = useParams();
    const navigate = useNavigate();
    const [reportData, setReportData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

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

    const cc = reportData.course_progress?.codecombat || {};
    const oz = reportData.course_progress?.ozaria || {};

    return (
        <div className="report-card-page animate-page-entry">
            {/* ── Header ── */}
            <header className="report-header">
                <div className="report-header-inner">
                    <button
                        className="report-back-btn"
                        onClick={() => navigate('/parent/dashboard')}
                    >
                        <ArrowLeft size={16} />
                        Back to Dashboard
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
                                <User size={32} strokeWidth={1.5} />
                            </div>
                        )}
                        <div className="report-student-details">
                            <h1>{reportData.username}</h1>
                            {reportData.nickname && (
                                <p className="report-student-nick">{reportData.nickname}</p>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            {/* ── Body Sections ── */}
            <div className="report-body">

                {/* Activity / Contribution Graph */}
                <section className="report-section">
                    <div className="report-section-header">
                        <h2><Activity size={20} /> Coding Activity</h2>
                    </div>
                    <div className="report-activity-visual">
                        <ContributionGraph data={reportData.contribution_data} />
                    </div>
                </section>

                {/* Course Progress */}
                <section className="report-section">
                    <div className="report-section-header">
                        <h2><BookOpen size={20} /> Course Progress</h2>
                    </div>
                    <div className="report-progress-list">
                        <div className="report-progress-item">
                            <div className="report-prog-label">
                                <span>CodeCombat</span>
                                <span>{cc.percent || 0}%</span>
                            </div>
                            <div className="report-progress-track">
                                <div
                                    className="report-progress-fill"
                                    style={{ width: `${cc.percent || 0}%` }}
                                />
                            </div>
                            <small>{cc.levels_completed || 0} Levels Completed</small>
                        </div>

                        {(oz.levels_completed > 0 || oz.percent > 0) && (
                            <div className="report-progress-item">
                                <div className="report-prog-label">
                                    <span>Ozaria</span>
                                    <span>{oz.percent || 0}%</span>
                                </div>
                                <div className="report-progress-track">
                                    <div
                                        className="report-progress-fill ozaria"
                                        style={{ width: `${oz.percent || 0}%` }}
                                    />
                                </div>
                                <small>{oz.levels_completed || 0} Levels Completed</small>
                            </div>
                        )}
                    </div>
                </section>

                {/* Achievements */}
                <section className="report-section">
                    <div className="report-section-header">
                        <h2><Award size={20} /> Achievements</h2>
                    </div>
                    {(!reportData.unlocked_achievements || reportData.unlocked_achievements.length === 0) ? (
                        <div className="report-empty-achievements">
                            <Award size={32} strokeWidth={1.2} />
                            <p>No achievements earned yet.</p>
                        </div>
                    ) : (
                        <div className="report-achievements-grid">
                            {reportData.unlocked_achievements.map((ua) => (
                                <div key={ua.id} className="report-achievement-item">
                                    <div className={`badge badge-${ua.achievement?.slug || ua.slug || 'default'} mini`}>&nbsp;</div>
                                    <div className="report-achievement-info">
                                        <span className="report-ach-name">
                                            {ua.achievement?.name || ua.name}
                                        </span>
                                        {(ua.achievement?.description || ua.description) && (
                                            <span className="report-ach-desc">
                                                {ua.achievement?.description || ua.description}
                                            </span>
                                        )}
                                        {ua.earned_at && (
                                            <span className="report-ach-date">
                                                Earned {new Date(ua.earned_at).toLocaleDateString()}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

            </div>
        </div>
    );
};

export default ParentReportCard;
