import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, MoreVertical, User, Trophy, Bell, Activity, Zap, Clock, Star } from 'lucide-react';
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

    // Per-child report data keyed by child ID
    const [childReports, setChildReports] = useState({});
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
                        const res = await client.get(`/api/parents/student/${child.id}/report`);
                        return { id: child.id, data: res.data.data };
                    } catch {
                        return { id: child.id, data: null };
                    }
                })
            );
            const map = {};
            results.forEach(({ id, data }) => { map[id] = data; });
            setChildReports(map);
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

    // ── Derived: Recent Wins ───────────────────────────────────────────────────
    const recentWins = React.useMemo(() => {
        const wins = [];
        children.forEach((child) => {
            const report = childReports[child.id];
            if (!report?.unlocked_achievements) return;
            report.unlocked_achievements.forEach((ua) => {
                wins.push({
                    childName: child.nickname || child.username,
                    childId: child.id,
                    achievementName: ua.name || ua.achievement_name || 'Achievement Unlocked',
                    earnedAt: ua.earned_at || ua.unlocked_at || null,
                    icon: ua.icon || '🏆',
                });
            });
        });
        // Sort descending by date, take top 3
        wins.sort((a, b) => new Date(b.earnedAt || 0) - new Date(a.earnedAt || 0));
        return wins.slice(0, 3);
    }, [children, childReports]);

    // ── Derived: Activity Notifications ───────────────────────────────────────
    const activityNotifications = React.useMemo(() => {
        const items = [];
        children.forEach((child) => {
            const report = childReports[child.id];
            const childName = child.nickname || child.username;

            // Recent activity within last 24h
            if (report?.last_activity_time && isWithinDays(report.last_activity_time, 1)) {
                items.push({
                    type: 'activity',
                    icon: Activity,
                    childName,
                    childId: child.id,
                    description: report.current_activity
                        ? `Started "${report.current_activity}"`
                        : 'Was recently active',
                    time: report.last_activity_time,
                    color: 'var(--primary-color)',
                    bgColor: 'rgba(15,118,110,0.08)',
                });
            }

            // New achievements within last 7 days
            if (report?.unlocked_achievements) {
                report.unlocked_achievements
                    .filter((ua) => isWithinDays(ua.earned_at || ua.unlocked_at, 7))
                    .slice(0, 2)
                    .forEach((ua) => {
                        items.push({
                            type: 'achievement',
                            icon: Star,
                            childName,
                            childId: child.id,
                            description: `Earned "${ua.name || ua.achievement_name || 'an achievement'}"`,
                            time: ua.earned_at || ua.unlocked_at,
                            color: '#f59e0b',
                            bgColor: 'rgba(245,158,11,0.08)',
                        });
                    });
            }
        });

        // Sort by most recent
        items.sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0));
        return items.slice(0, 5);
    }, [children, childReports]);

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

                {/* ── Feature 2: Recent Wins Feed ── */}
                {recentWins.length > 0 && (
                    <section className="recent-wins-section">
                        <div className="section-header">
                            <Trophy size={20} className="section-icon wins-icon" />
                            <h2 className="section-title">Recent Wins</h2>
                            <span className="section-badge">{recentWins.length}</span>
                        </div>
                        <div className="wins-strip">
                            {recentWins.map((win, i) => (
                                <div
                                    key={i}
                                    className="win-card"
                                    onClick={() => navigate(`/parent/report/${win.childId}`)}
                                    style={{ animationDelay: `${i * 80}ms` }}
                                >
                                    <div className="win-trophy-glow">
                                        <span className="win-achievement-icon">{win.icon}</span>
                                        <Trophy size={16} className="win-trophy-overlay" />
                                    </div>
                                    <div className="win-info">
                                        <span className="win-child-name">{win.childName}</span>
                                        <span className="win-achievement-name">{win.achievementName}</span>
                                        {win.earnedAt && (
                                            <span className="win-time">
                                                <Clock size={11} /> {timeAgo(win.earnedAt)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Empty state for wins (only show if children are loaded & have reports) */}
                {recentWins.length === 0 && children.length > 0 && !reportsLoading && (
                    <section className="recent-wins-section recent-wins-empty">
                        <div className="section-header">
                            <Trophy size={20} className="section-icon wins-icon" />
                            <h2 className="section-title">Recent Wins</h2>
                        </div>
                        <div className="wins-empty-state">
                            <span className="wins-empty-emoji">🌟</span>
                            <p>Achievements will appear here as your children earn them — keep them motivated!</p>
                        </div>
                    </section>
                )}

                {/* ── Feature 3: Activity Notifications ── */}
                {activityNotifications.length > 0 && (
                    <section className="activity-feed-section">
                        <div className="section-header">
                            <Bell size={20} className="section-icon notif-icon" />
                            <h2 className="section-title">What's New</h2>
                            <span className="section-badge notif-badge">{activityNotifications.length}</span>
                        </div>
                        <div className="activity-feed">
                            {activityNotifications.map((item, i) => {
                                const Icon = item.icon;
                                return (
                                    <div
                                        key={i}
                                        className="activity-item"
                                        onClick={() => navigate(`/parent/report/${item.childId}`)}
                                        style={{ animationDelay: `${i * 60}ms` }}
                                    >
                                        <div
                                            className="activity-icon-wrap"
                                            style={{ background: item.bgColor, color: item.color }}
                                        >
                                            <Icon size={15} />
                                        </div>
                                        <div className="activity-item-body">
                                            <span className="activity-child">{item.childName}</span>
                                            <span className="activity-desc">{item.description}</span>
                                        </div>
                                        {item.time && (
                                            <span className="activity-time">
                                                <Clock size={11} />
                                                {timeAgo(item.time)}
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                )}

                {/* ── Feature 1: Children Grid ── */}
                <div className="children-section-header">
                    <h2 className="section-title">
                        <Zap size={18} className="section-icon children-icon" />
                        Your Children
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
                        const isActive = report?.last_activity_time && isWithinHours(report.last_activity_time, 2);
                        const duckBalance = report?.duck_balance ?? child.duck_balance ?? null;
                        const latestAchievement = report?.unlocked_achievements?.[0] ?? null;
                        const displayName = child.nickname || child.username;

                        return (
                            <div
                                key={child.id}
                                className="child-card glass-panel"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {/* ── Menu ── */}
                                <div className="child-card-menu">
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

                                {/* ── Clickable content → report ── */}
                                <div onClick={() => navigate(`/parent/report/${child.id}`)} className="child-card-clickable">

                                    {/* Avatar + activity dot */}
                                    <div className="child-avatar-wrap">
                                        {child.profile_picture_url && !child.profile_picture_url.includes('Default_pfp.jpg') ? (
                                            <img
                                                className="child-avatar"
                                                src={getApiUrl(child.profile_picture_url)}
                                                alt={child.username}
                                            />
                                        ) : (
                                            <div className="child-avatar-initials">
                                                <User size={36} strokeWidth={1.5} />
                                            </div>
                                        )}
                                        <span
                                            className={`activity-dot ${isActive ? 'activity-dot--active' : 'activity-dot--idle'}`}
                                            title={isActive ? 'Active recently' : 'Not recently active'}
                                        />
                                    </div>

                                    {/* Name & username */}
                                    <h3 className="child-name">{displayName}</h3>
                                    <p className="child-nickname">@{child.username}</p>

                                    {/* Duck balance */}
                                    {duckBalance !== null ? (
                                        <div className="child-duck-balance">
                                            <DuckIcon size={16} color="#f59e0b" />
                                            <span className="duck-count">{duckBalance.toLocaleString()}</span>
                                            <span className="duck-label">ducks</span>
                                        </div>
                                    ) : reportsLoading ? (
                                        <div className="child-duck-balance loading-shimmer">
                                            <DuckIcon size={16} color="#d1d5db" />
                                            <span className="duck-count" style={{ color: 'var(--text-muted)' }}>—</span>
                                        </div>
                                    ) : null}

                                    {/* Latest achievement badge */}
                                    {latestAchievement && (
                                        <div className="child-achievement-badge">
                                            <Star size={11} />
                                            <span>{latestAchievement.name || latestAchievement.achievement_name || 'Achievement'}</span>
                                        </div>
                                    )}

                                    {/* Activity status line */}
                                    {report?.last_activity_time && (
                                        <div className={`child-activity-status ${isActive ? 'status--active' : 'status--idle'}`}>
                                            <Activity size={12} />
                                            <span>
                                                {report.current_activity
                                                    ? `In "${report.current_activity}"`
                                                    : `Last seen ${timeAgo(report.last_activity_time)}`}
                                            </span>
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
