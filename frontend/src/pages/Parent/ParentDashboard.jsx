import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, MoreVertical, User, Trophy, Bell, Activity, Zap, Clock, Star, BookOpen, Folder, Award, ChevronRight, AlertCircle, Plus } from 'lucide-react';
import toast from 'react-hot-toast';
import client from '../../api/client';
import { getApiUrl } from '../../utils/apiUrl';

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

// ── Component ─────────────────────────────────────────────────────────────────
const ParentDashboard = () => {
    const navigate = useNavigate();
    const [children, setChildren] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [openMenu, setOpenMenu] = useState(null);
    const [connectCode, setConnectCode] = useState('');
    const [connectError, setConnectError] = useState(null);
    const [isConnecting, setIsConnecting] = useState(false);
    const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);

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
            toast.error(err.response?.data?.error || 'Failed to load children');
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
            setIsLinkModalOpen(false);
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

    // ── Merge and Prioritize Activity across all children ──────────────────────
    const mergedActivityFeed = useMemo(() => {
        const events = [];
        children.forEach((child) => {
            const history = childHistories[child.id];
            if (!history?.recent_events) return;

            history.recent_events.forEach((event) => {
                events.push({
                    ...event,
                    childName: child.nickname || child.username,
                    childId: child.id,
                    childAvatar: child.profile_picture_url
                });
            });
        });

        // Separate and prioritize projects over levels
        const projects = events.filter(e => e.type === 'project');
        const notes = events.filter(e => e.type === 'note');
        const achievements = events.filter(e => e.type === 'achievement');
        const challenges = events.filter(e => e.type === 'challenge');

        return [...projects, ...notes, ...achievements, ...challenges]
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .slice(0, 10);
    }, [children, childHistories]);

    // ── Loading skeleton ───────────────────────────────────────────────────────
    if (isLoading) {
        return (
            <div className="parent-dashboard parent-loading animate-page-entry p-2rem">
                <main className="parent-body">
                    <div className="parent-grid-layout">
                        <div className="glass-panel p-2rem h-400px">
                            <Skeleton height="32px" width="40%" className="mb-1-5rem" />
                            <Skeleton height="80px" className="mb-md" />
                            <Skeleton height="80px" className="mb-md" />
                            <Skeleton height="80px" />
                        </div>
                        <div className="d-flex flex-col gap-1-5rem">
                            <div className="glass-panel p-2rem h-200px">
                                <Skeleton height="24px" width="60%" className="mb-md" />
                                <Skeleton height="40px" />
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div role="button" tabIndex={0} className="parent-dashboard animate-page-entry" onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => setOpenMenu(null)}>
            <main className="parent-body">
                <DesktopNotice />

                {/* Cohesive Dashboard Layout */}
                <div className="dashboard-layout parent-dashboard-layout">
                    
                    {/* Left Column: Cohesive Activity Feed */}
                    <div className="left-column">
                        <section className="dashboard-panel dashboard-panel-styled">
                            <div className="panel-header-styled">
                                <div className="d-flex align-center gap-0-75rem">
                                    <Activity size={22} color="var(--primary-color)" />
                                    <h2 className="panel-title-text">Recent Family Activity</h2>
                                </div>
                                <span className="panel-subtitle-text">Past 30 Days</span>
                            </div>

                            {reportsLoading && Object.keys(childHistories).length === 0 ? (
                                <div className="d-flex flex-col gap-md">
                                    <Skeleton height="64px" borderRadius="12px" />
                                    <Skeleton height="64px" borderRadius="12px" />
                                    <Skeleton height="64px" borderRadius="12px" />
                                </div>
                            ) : mergedActivityFeed.length > 0 ? (
                                <div className="activity-timeline d-flex flex-col gap-1-25rem">
                                    {mergedActivityFeed.map((event, idx) => {
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
                                            <div role="button" tabIndex={0} 
                                                key={idx} 
                                                className="timeline-item"
                                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => navigate(`/parent/report/${event.childId}`)}
                                                style={{
                                                    display: 'flex', 
                                                    gap: '1.25rem', 
                                                    alignItems: 'center', 
                                                    background: 'var(--bg-secondary)', 
                                                    padding: '1rem 1.25rem', 
                                                    borderRadius: '12px',
                                                    border: '1px solid var(--border-subtle)',
                                                    cursor: 'pointer',
                                                    transition: 'transform 0.2s, box-shadow 0.2s'
                                                }}
                                            >
                                                {/* Child Avatar indicator */}
                                                <div className="pos-rel d-flex align-center">
                                                    {event.childAvatar && !event.childAvatar.includes('Default_pfp.jpg') ? (
                                                        <img
                                                            src={getApiUrl(event.childAvatar)}
                                                            alt={event.childName}
                                                            className="w-36px h-36px radius-50 object-cover"
                                                        />
                                                    ) : (
                                                        <div className="child-avatar-initials w-36px h-36px m-0 text-0-8rem">
                                                            <User size={16} />
                                                        </div>
                                                    )}
                                                    {/* Event Type Icon Badge */}
                                                    <div 
                                                        style={{ 
                                                            position: 'absolute', 
                                                            bottom: '-4px', 
                                                            right: '-4px', 
                                                            display: 'flex', 
                                                            alignItems: 'center', 
                                                            justifyContent: 'center', 
                                                            width: '18px', 
                                                            height: '18px', 
                                                            borderRadius: '50%', 
                                                            background: iconBg, 
                                                            color: iconColor,
                                                            border: '2px solid var(--bg-primary)',
                                                            boxShadow: 'var(--shadow-sm)'
                                                        }}
                                                    >
                                                        <IconComponent size={10} />
                                                    </div>
                                                </div>

                                                {/* Event Info */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="d-flex justify-between align-center gap-sm">
                                                        <span className="text-0-9rem fw-bold text-primary">
                                                            {event.childName}
                                                        </span>
                                                        <span className="text-xs text-muted d-flex align-center gap-4px">
                                                            <Clock size={11} /> {timeAgo(event.timestamp)}
                                                        </span>
                                                    </div>
                                                    <p className="text-ellipsis-desc">
                                                        {event.label}
                                                    </p>
                                                </div>
                                                <ChevronRight size={16} color="var(--text-muted)" className="flex-shrink-0" />
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                /* Encouragement section if there's no activity */
                                <div className="d-flex flex-col gap-1-25rem">
                                    {children.map((child) => {
                                        const history = childHistories[child.id];
                                        const hasAnyActivityEver = history?.has_any_activity_ever ?? true;
                                        const displayName = child.nickname || child.username;

                                        return (
                                            <div role="button" tabIndex={0} 
                                                key={child.id}
                                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => navigate(`/parent/report/${child.id}`)}
                                                style={{ 
                                                    padding: '1.5rem', 
                                                    background: hasAnyActivityEver ? 'rgba(245,158,11,0.03)' : 'rgba(15,118,110,0.03)', 
                                                    border: hasAnyActivityEver ? '1px dashed #f59e0b' : '1px dashed var(--primary-color)', 
                                                    borderRadius: '12px',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                <div className="d-flex gap-md align-start">
                                                    <span className="text-1-75rem">{hasAnyActivityEver ? '☕' : '👋'}</span>
                                                    <div>
                                                        <h4 style={{ margin: '0 0 0.35rem 0', color: hasAnyActivityEver ? '#b45309' : 'var(--primary-color)', fontSize: '1rem' }}>
                                                            {hasAnyActivityEver ? `${displayName} is taking a break` : `Welcome ${displayName}!`}
                                                        </h4>
                                                        <p className="m-0 text-xs text-secondary lh-1-5">
                                                            {hasAnyActivityEver 
                                                                ? `It looks like ${displayName} hasn't been active in the last 30 days. Try encouraging them to attempt some levels or showcase their skills in a project!` 
                                                                : `We're excited to have ${displayName} get started on their coding journey! Encourage them to complete their first challenges or build a project to earn Ducks.`
                                                            }
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </section>
                    </div>

                    {/* Right Column: Family List */}
                    <div className="right-column d-flex flex-col gap-1-5rem">
                        
                        {/* Children List */}
                        <section className="dashboard-panel dashboard-panel-styled-small">
                            <div className="panel-header-styled-small">
                                <h3 className="panel-title-small">
                                    Family Members
                                </h3>
                                <button 
                                    onClick={() => setIsLinkModalOpen(true)}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        width: '28px',
                                        height: '28px',
                                        borderRadius: '50%',
                                        background: 'rgba(99, 102, 241, 0.1)',
                                        color: '#6366f1',
                                        border: '1px solid rgba(99, 102, 241, 0.2)',
                                        cursor: 'pointer',
                                        transition: 'background 0.2s, transform 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(99, 102, 241, 0.2)'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)'}
                                    title="Link another child"
                                >
                                    <Plus size={16} />
                                </button>
                            </div>
                            <div className="d-flex flex-col gap-md">
                                {children.map((child) => {
                                    const report = childReports[child.id];
                                    const isActive = report?.last_activity_time && isWithinHours(report.last_activity_time, 2);
                                    const displayName = child.nickname || child.username;

                                    return (
                                        <div role="button" tabIndex={0} 
                                            key={child.id} 
                                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => navigate(`/parent/report/${child.id}`)}
                                            style={{ 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                justifyContent: 'space-between',
                                                padding: '0.75rem 1rem',
                                                background: 'var(--bg-secondary)',
                                                borderRadius: '12px',
                                                border: '1px solid var(--border-subtle)',
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <div className="d-flex gap-0-75rem align-center">
                                                <div className="pos-rel">
                                                    {child.profile_picture_url && !child.profile_picture_url.includes('Default_pfp.jpg') ? (
                                                        <img
                                                            src={getApiUrl(child.profile_picture_url)}
                                                            alt={child.username}
                                                            style={{ width: '32px', height: '32px', borderRadius: '50%', objectFit: 'cover' }}
                                                        />
                                                    ) : (
                                                        <div className="child-avatar-initials" style={{ width: '32px', height: '32px', margin: 0, fontSize: '0.75rem' }}>
                                                            <User size={14} />
                                                        </div>
                                                    )}
                                                    <span className={`activity-dot ${isActive ? 'activity-dot--active' : 'activity-dot--idle'} status-dot-small`} />
                                                </div>
                                                <div>
                                                    <div className="text-0-85rem fw-bold text-primary">{displayName}</div>
                                                    <div className="text-xs text-muted">@{child.username}</div>
                                                </div>
                                            </div>

                                            {/* Options Menu Only (No Duck Balance) */}
                                            <div role="button" tabIndex={0} className="d-flex align-center" onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } }} onClick={(e) => e.stopPropagation()}>
                                                <div className="child-card-menu pos-rel top-auto right-auto">
                                                    <button
                                                        type="button"
                                                        className="menu-btn"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            e.preventDefault();
                                                            setOpenMenu(openMenu === child.id ? null : child.id);
                                                        }}
                                                        title="Options"
                                                    >
                                                        <MoreVertical size={16} />
                                                    </button>
                                                    {openMenu === child.id && (
                                                        <div className="child-menu-dropdown">
                                                            <button
                                                                className="menu-item disconnect"
                                                                onClick={() => {
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
                                    );
                                })}
                            </div>
                        </section>
                    </div>
                </div>
            </main>

            {/* Link Another Child Modal */}
            {isLinkModalOpen && (
                <div role="button" tabIndex={0} 
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(15, 23, 42, 0.6)',
                        backdropFilter: 'blur(4px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                        animation: 'fadeIn 0.25s ease'
                    }}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => setIsLinkModalOpen(false)}
                >
                    <div role="button" tabIndex={0} 
                        className="glass-panel"
                        style={{
                            width: '90%',
                            maxWidth: '400px',
                            padding: '2rem',
                            background: 'var(--bg-primary)',
                            borderRadius: '16px',
                            boxShadow: 'var(--shadow-xl)',
                            position: 'relative'
                        }}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } }} onClick={(e) => e.stopPropagation()}
                    >
                        <h3 style={{ fontSize: '1.2rem', margin: '0 0 0.5rem 0', fontWeight: '700' }}>Link Another Child</h3>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0 0 1.25rem 0', lineHeight: 1.4 }}>
                            Enter the 6-character connection code to link another student.
                        </p>
                        <form onSubmit={handleConnectChild} className="connect-form d-flex flex-col gap-md">
                            <input
                                type="text"
                                placeholder="CODE"
                                value={connectCode}
                                onChange={(e) => setConnectCode(e.target.value)}
                                maxLength={10}
                                className="connect-input"
                                style={{ padding: '0.75rem', fontSize: '1.1rem', textAlign: 'center', letterSpacing: '2px', textTransform: 'uppercase' }}
                                
                            />
                            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                                <button
                                    type="button"
                                    className="btn-secondary"
                                    onClick={() => setIsLinkModalOpen(false)}
                                    style={{ flex: 1, justifyContent: 'center', fontSize: '0.85rem' }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn-premium"
                                    disabled={isConnecting || !connectCode.trim()}
                                    style={{ flex: 1, justifyContent: 'center', fontSize: '0.85rem' }}
                                >
                                    {isConnecting ? 'Linking...' : 'Link Child'}
                                </button>
                            </div>
                            {connectError && (
                                <div className="connect-error-msg" style={{ fontSize: '0.75rem', color: 'var(--error-color)', textAlign: 'center', marginTop: '0.25rem' }}>
                                    {connectError}
                                </div>
                            )}
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ParentDashboard;
