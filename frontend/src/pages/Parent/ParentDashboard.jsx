import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, MoreVertical, User, Trophy, Bell, Activity, Zap, Clock, Star, BookOpen, Folder, Award } from 'lucide-react';
import toast from 'react-hot-toast';
import client from '../../api/client';
import { getApiUrl } from '../../utils/apiUrl';
import DuckIcon from '../../components/Icons/DuckIcon';

import DesktopNotice from '../../components/common/DesktopNotice';
import './ParentDashboard.css';
import Skeleton from '../../components/common/Skeleton';

// ── Utility: relative time ────────────────────────────────────────────────────
const timeAgo = (isoString) => {
    if (!isoString) return null;
    const diff = Date.now() - new Date(isoString).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);
    if (mins < 2) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
};

// ── Helper: is within N hours? ────────────────────────────────────────────────
const isWithinHours = (isoString, hours) => {
    if (!isoString) return false;
    return Date.now() - new Date(isoString).getTime() < hours * 3600000;
};

const isWithinDays = (isoString, days) => {
    if (!isoString) return false;
    return Date.now() - new Date(isoString).getTime() < days * 86400000;
};

// ── Component ─────────────────────────────────────────────────────────────────
const ParentDashboard = () => {
    const navigate = useNavigate();
    const [children, setChildren] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [openMenu, setOpenMenu] = useState(null);
    const [connectCode, setConnectCode] = useState('');
    const [connectError, setConnectError] = useState(null);
    const [isConnecting, setIsConnecting] = useState(false);

    // Per-child report and history data
    const [childReports, setChildReports] = useState({});
    const [childHistories, setChildHistories] = useState({});
    const [reportsLoading, setReportsLoading] = useState(false);

    // ── Data Fetching ──────────────────────────────────────────────────────────
    const fetchChildren = useCallback(async () => {
        try {
            const response = await client.get(`/api/parents/children?t=${new Date().getTime()}`);
            const list = response.data.data?.children || response.data.children || [];
            setChildren(list);
            return list;
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load children');
            return [];
        } finally {
            setIsLoading(false);
        }
    }, []);

    const fetchChildReports = useCallback(async (childList) => {
        if (!childList || childList.length === 0) return;
        setReportsLoading(true);
        try {
            const results = await Promise.all(
                childList.map(async (child) => {
                    try {
                        const [resReport, resHistory] = await Promise.all([
                            client.get(`/api/parents/student/${child.id}/report`),
                            client.get(`/api/parents/student/${child.id}/history`)
                        ]);
                        return {
                            id: child.id,
                            report: resReport.data.data,
                            history: resHistory.data.data
                        };
                    } catch (err) {
                        console.error(`Failed to load details for child ${child.id}:`, err);
                        return { id: child.id, report: null, history: null };
                    }
                })
            );
            const reportMap = {};
            const historyMap = {};
            results.forEach(({ id, report, history }) => {
                reportMap[id] = report;
                historyMap[id] = history;
            });
            setChildReports(reportMap);
            setChildHistories(historyMap);
        } finally {
            setReportsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchChildren().then((list) => {
            if (list.length > 0) fetchChildReports(list);
        });
    }, [fetchChildren, fetchChildReports]);

    // ── Connect child ──────────────────────────────────────────────────────────
    const handleConnectChild = async (e) => {
        e.preventDefault();
        setConnectError(null);
        setIsConnecting(true);
        try {
            await client.post('/api/parents/connect/code', { code: connectCode });
            toast.success('Child connected successfully!');
            setConnectCode('');
            const list = await fetchChildren();
            if (list.length > 0) fetchChildReports(list);
        } catch (err) {
            const msg = err.response?.data?.error || 'Failed to connect. Invalid code?';
            setConnectError(msg);
            toast.error(msg);
        } finally {
            setIsConnecting(false);
        }
    };

    // ── Disconnect child ───────────────────────────────────────────────────────
    const handleDisconnect = async (childId, childName) => {
        if (!window.confirm(`Remove ${childName} from your account? You can reconnect later with their code.`)) return;
        try {
            await client.post(`/api/parents/disconnect/${childId}`);
            toast.success(`Disconnected from ${childName}`);
            const list = await fetchChildren();
            if (list.length > 0) fetchChildReports(list);
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to disconnect');
        }
    };

    // Helper to filter, prioritize (projects > notes > achievements > challenges), and slice events
    const getPrioritizedEvents = (events) => {
        if (!events) return [];
        const projects = events.filter(e => e.type === 'project');
        const notes = events.filter(e => e.type === 'note');
        const achievements = events.filter(e => e.type === 'achievement');
        const challenges = events.filter(e => e.type === 'challenge');
        return [...projects, ...notes, ...achievements, ...challenges].slice(0, 5);
    };

    // ── Loading skeleton ───────────────────────────────────────────────────────
    if (isLoading) {
        return (
            <div className="parent-dashboard animate-page-entry" style={{ padding: '2rem' }}>
                <main className="parent-body">
                    <div className="children-grid">
                        {[1, 2].map(i => (
                            <div key={i} className="child-card glass-panel" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', borderRadius: '12px' }}>
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                    <Skeleton height="64px" width="64px" borderRadius="50%" />
                                    <div style={{ flexGrow: 1 }}>
                                        <Skeleton height="24px" width="60%" style={{ marginBottom: '8px' }} />
                                        <Skeleton height="16px" width="40%" />
                                    </div>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: 'auto' }}>
                                    <Skeleton height="40px" borderRadius="8px" />
                                    <Skeleton height="40px" borderRadius="8px" />
                                    <Skeleton height="40px" borderRadius="8px" />
                                </div>
                            </div>
                        ))}
                    </div>
                </main>
            </div>
        );
    }

    // ── Grid class helper ──────────────────────────────────────────────────────
    const totalCards = children.length + 1;
    let gridClass = 'children-grid';
    if (totalCards <= 2) gridClass += ' grid-few';
    else if (totalCards <= 4) gridClass += ' grid-medium';
    else gridClass += ' grid-many';

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <div className="parent-dashboard animate-page-entry" onClick={() => setOpenMenu(null)}>
            <main className="parent-body">
                <DesktopNotice />

                {/* Header */}
                <div className="children-section-header">
                    <h2 className="section-title">
                        <Activity size={18} className="section-icon children-icon" />
                        Children Activity Summary
                    </h2>
                </div>

                <div className={gridClass}>
                    {error && (
                        <div className="parent-error">
                            <h3>Something went wrong</h3>
                            <p>{error}</p>
                        </div>
                    )}

                    {children.map((child) => {
                        const report = childReports[child.id] || null;
                        const history = childHistories[child.id] || null;
                        const isActive = report?.last_activity_time && isWithinHours(report.last_activity_time, 2);
                        const duckBalance = report?.duck_balance ?? child.duck_balance ?? null;
                        const displayName = child.nickname || child.username;

                        // Focus on 30-day activity events
                        const allEvents = history?.recent_events || [];
                        const hasActivity = allEvents.length > 0;
                        const hasAnyActivityEver = history?.has_any_activity_ever ?? true;
                        const displayEvents = getPrioritizedEvents(allEvents);

                        return (
                            <div
                                key={child.id}
                                className="child-card glass-panel child-dashboard-summary-card"
                                onClick={() => navigate(`/parent/report/${child.id}`)}
                                style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'stretch', textAlign: 'left' }}
                            >
                                {/* Card Header with Options Menu */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                        <div style={{ position: 'relative' }}>
                                            {child.profile_picture_url && !child.profile_picture_url.includes('Default_pfp.jpg') ? (
                                                <img
                                                    className="child-avatar"
                                                    src={getApiUrl(child.profile_picture_url)}
                                                    alt={child.username}
                                                    style={{ margin: 0, width: '48px', height: '48px' }}
                                                />
                                            ) : (
                                                <div className="child-avatar-initials" style={{ margin: 0, width: '48px', height: '48px' }}>
                                                    <User size={24} strokeWidth={1.5} />
                                                </div>
                                            )}
                                            <span
                                                className={`activity-dot ${isActive ? 'activity-dot--active' : 'activity-dot--idle'}`}
                                                style={{ position: 'absolute', bottom: 0, right: 0, width: '12px', height: '12px', border: '2px solid white' }}
                                            />
                                        </div>
                                        <div>
                                            <h3 className="child-name" style={{ margin: 0, fontSize: '1.15rem' }}>{displayName}</h3>
                                            <p className="child-nickname" style={{ margin: 0, fontSize: '0.8rem' }}>@{child.username}</p>
                                        </div>
                                    </div>

                                    {/* Duck Balance & Menu */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        {duckBalance !== null && (
                                            <div className="child-duck-balance" style={{ margin: 0, padding: '0.2rem 0.5rem', borderRadius: '8px', background: 'var(--bg-tertiary)' }}>
                                                <DuckIcon size={14} color="#f59e0b" />
                                                <span className="duck-count" style={{ fontSize: '0.8rem' }}>{duckBalance.toLocaleString()}</span>
                                            </div>
                                        )}
                                        <div className="child-card-menu" onClick={(e) => e.stopPropagation()} style={{ position: 'relative', top: 'auto', right: 'auto' }}>
                                            <button
                                                className="menu-btn"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setOpenMenu(openMenu === child.id ? null : child.id);
                                                }}
                                                title="Options"
                                            >
                                                <MoreVertical size={18} />
                                            </button>
                                            {openMenu === child.id && (
                                                <div className="child-menu-dropdown">
                                                    <button
                                                        className="menu-item disconnect"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setOpenMenu(null);
                                                            handleDisconnect(child.id, displayName);
                                                        }}
                                                    >
                                                        Remove Child
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Summary Content */}
                                <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                                    <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '0.5rem', margin: 0 }}>
                                        Activity (Past 30 Days)
                                    </h4>

                                    {reportsLoading && !history ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <Skeleton height="32px" />
                                            <Skeleton height="32px" />
                                            <Skeleton height="32px" />
                                        </div>
                                    ) : hasActivity ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            {displayEvents.map((event, idx) => {
                                                let IconComponent = Zap;
                                                let iconColor = 'var(--primary-color)';
                                                let iconBg = 'rgba(15,118,110,0.08)';

                                                if (event.type === 'project') {
                                                    IconComponent = Folder;
                                                    iconColor = '#6366f1';
                                                    iconBg = 'rgba(99,102,241,0.08)';
                                                } else if (event.type === 'note') {
                                                    IconComponent = BookOpen;
                                                    iconColor = '#ec4899';
                                                    iconBg = 'rgba(236,72,153,0.08)';
                                                } else if (event.type === 'achievement') {
                                                    IconComponent = Award;
                                                    iconColor = '#f59e0b';
                                                    iconBg = 'rgba(245,158,11,0.08)';
                                                }

                                                return (
                                                    <div key={idx} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', background: 'var(--bg-secondary)', padding: '0.5rem', borderRadius: '8px' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '50%', background: iconBg, color: iconColor }}>
                                                            <IconComponent size={14} />
                                                        </div>
                                                        <div style={{ flexGrow: 1, minWidth: 0 }}>
                                                            <div style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                {event.label}
                                                            </div>
                                                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                                <Clock size={10} /> {timeAgo(event.timestamp)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            {allEvents.length > 5 && (
                                                <div style={{ fontSize: '0.75rem', color: 'var(--primary-color)', fontWeight: '600', textAlign: 'center', marginTop: '0.25rem' }}>
                                                    + {allEvents.length - 5} more activities. Click to view full report.
                                                </div>
                                            )}
                                        </div>
                                    ) : !hasAnyActivityEver ? (
                                        /* Welcome & encourage (new student) */
                                        <div style={{ padding: '1rem', background: 'rgba(15,118,110,0.05)', border: '1px dashed var(--primary-color)', borderRadius: '12px', textAlign: 'center' }}>
                                            <span style={{ fontSize: '1.5rem', display: 'block', marginBottom: '0.5rem' }}>👋</span>
                                            <h5 style={{ margin: '0 0 0.25rem 0', color: 'var(--primary-color)' }}>Welcome to Classroom Chat!</h5>
                                            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                We're excited to have {displayName} start their coding journey. Encourage them to complete their first levels and build their first projects to earn badges and Ducks!
                                            </p>
                                        </div>
                                    ) : (
                                        /* Taking a break */
                                        <div style={{ padding: '1rem', background: 'rgba(245,158,11,0.05)', border: '1px dashed #f59e0b', borderRadius: '12px', textAlign: 'center' }}>
                                            <span style={{ fontSize: '1.5rem', display: 'block', marginBottom: '0.5rem' }}>☕</span>
                                            <h5 style={{ margin: '0 0 0.25rem 0', color: '#b45309' }}>Taking a Break</h5>
                                            <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                                It looks like {displayName} is taking a break. Encourage them to jump back in, attempt some more levels, or work on a project to show off their skills!
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}

                    {/* ── Connect Card ── */}
                    {!error && (
                        <div className="child-card connect-card glass-panel" onClick={(e) => e.stopPropagation()}>
                            <h3>Enter Your Code</h3>
                            <p className="connect-card-desc">
                                If you received a physical card or connection code from the school, enter the 6-character code below to instantly link the student.
                            </p>
                            <form onSubmit={handleConnectChild} className="connect-form">
                                <input
                                    type="text"
                                    placeholder="Enter connection code..."
                                    value={connectCode}
                                    onChange={(e) => setConnectCode(e.target.value)}
                                    maxLength={10}
                                    className="connect-input"
                                />
                                <button
                                    type="submit"
                                    className="btn-premium btn-premium-sm connect-submit-btn"
                                    disabled={isConnecting || !connectCode.trim()}
                                >
                                    {isConnecting ? 'Connecting...' : 'Connect'}
                                </button>
                                {connectError && (
                                    <div className="connect-error-msg">{connectError}</div>
                                )}
                            </form>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default ParentDashboard;
