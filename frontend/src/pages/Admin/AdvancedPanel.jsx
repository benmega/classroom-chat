import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Layers,
    ShieldAlert,
    Terminal,
    Activity,
    Trash2,
    Code,
    BarChart3
} from 'lucide-react';
import client from '../../api/client';
import toast from 'react-hot-toast';
import './AdvancedPanel.css';
import { X } from 'lucide-react';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import Skeleton from '../../components/common/Skeleton';

const AdvancedPanel = () => {
    const navigate = useNavigate();
    const isLoading = false; // Currently static
    const [logs, setLogs] = useState('');
    const [showLogModal, setShowLogModal] = useState(false);
    const [showStatsModal, setShowStatsModal] = useState(false);
    const [showPurgeModal, setShowPurgeModal] = useState(false);
    const [isFetchingLogs, setIsFetchingLogs] = useState(false);
    const [isFetchingStats, setIsFetchingStats] = useState(false);
    const [isPurging, setIsPurging] = useState(false);
    const [extendedStats, setExtendedStats] = useState(null);

    // In production, the API is served from the same origin as the frontend.
    // In development, we fallback to the known Flask port (8000).
    const apiBaseUrl = import.meta.env.VITE_API_URL ||
        (import.meta.env.DEV ? 'http://localhost:8000' : window.location.origin);



    const fetchLogs = async () => {
        setIsFetchingLogs(true);
        try {
            const response = await client.get('/api/admin/logs');
            if (response.data.status === 'success') {
                setLogs(response.data.data.logs || 'No logs found.');
                setShowLogModal(true);
            }
        } catch (err) {
            toast.error('Failed to fetch system logs.');
            console.error(err);
        } finally {
            setIsFetchingLogs(false);
        }
    };

    const fetchExtendedStats = async () => {
        setIsFetchingStats(true);
        try {
            const response = await client.get('/api/admin/advanced/stats-extended');
            if (response.data.status === 'success') {
                setExtendedStats(response.data.data);
                setShowStatsModal(true);
            }
        } catch (err) {
            toast.error('Failed to fetch server statistics.');
            console.error(err);
        } finally {
            setIsFetchingStats(false);
        }
    };

    const purgeHistory = async () => {
        setIsPurging(true);
        try {
            const response = await client.post('/api/admin/advanced/purge-history');
            if (response.data.status === 'success') {

                setShowPurgeModal(false);
            }
        } catch (err) {
            toast.error('Failed to purge history.');
            console.error(err);
        } finally {
            setIsPurging(false);
        }
    };



    if (isLoading) return (
        <div className="admin-advanced-panel animate-page-entry p-2rem">
            <header className="page-header">
                <Skeleton height="40px" width="300px" className="skeleton-title mb-2rem" />
            </header>
            <div className="advanced-grid">
                {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
                    <div key={i} className="action-button" style={{ background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                        <Skeleton height="28px" width="28px" borderRadius="8px" style={{ marginBottom: '8px' }} />
                        <Skeleton height="20px" width="70%" />
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div className="admin-advanced-panel">
            <AdminPageHeader title="Database" />

            <div className="advanced-grid">
                <button className="btn-premium action-button" onClick={() => navigate('/admin/advanced-crud')}>
                    <Layers size={18} /> Headless Database CRUD
                </button>

                <button className="btn-utility action-button" onClick={() => window.open(`${apiBaseUrl}/api/docs/`, '_blank')}>
                    <Terminal size={18} /> API Documentation
                </button>

                <button
                    className="btn-utility action-button"
                    onClick={fetchExtendedStats}
                    disabled={isFetchingStats}
                >
                    <Activity size={18} /> {isFetchingStats ? 'Loading...' : 'Server Performance Stats'}
                </button>

                <button
                    className="btn-utility action-button"
                    onClick={fetchLogs}
                    disabled={isFetchingLogs}
                >
                    <ShieldAlert size={18} /> {isFetchingLogs ? 'Fetching...' : 'System Logs'}
                </button>

                <button
                    className="btn-danger action-button"
                    onClick={() => setShowPurgeModal(true)}
                >
                    <Trash2 size={18} /> Purge History
                </button>
            </div>

            {showLogModal && (
                <div role="button" tabIndex={0} className="log-modal-overlay" onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => setShowLogModal(false)}>
                    <div role="button" tabIndex={0} className="log-modal glass-panel animate-fade-in" onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } }} onClick={e => e.stopPropagation()}>
                        <div className="log-modal-header">
                            <div className="title-group">
                                <Terminal size={20} />
                                <h3>System Logs</h3>
                            </div>
                            <button className="close-btn" onClick={() => setShowLogModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="log-content">
                            <pre>{logs}</pre>
                        </div>
                        <div className="log-modal-footer">
                            <button className="btn-secondary" onClick={() => setShowLogModal(false)}>Close</button>
                            <button className="btn-premium" onClick={fetchLogs}>Refresh</button>
                        </div>
                    </div>
                </div>
            )}

            {showStatsModal && extendedStats && (
                <div role="button" tabIndex={0} className="log-modal-overlay" onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => setShowStatsModal(false)}>
                    <div role="button" tabIndex={0} className="log-modal glass-panel animate-fade-in" onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } }} onClick={e => e.stopPropagation()}>
                        <div className="log-modal-header">
                            <div className="title-group">
                                <Activity size={20} />
                                <h3>Server Statistics</h3>
                            </div>
                            <button className="close-btn" onClick={() => setShowStatsModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="log-content">
                            <div className="stats-grid">
                                <div className="stat-box">
                                    <span className="label">Memory Usage</span>
                                    <span className="value">{extendedStats.memory_usage_mb} MB</span>
                                </div>
                                <div className="stat-box">
                                    <span className="label">CPU Usage</span>
                                    <span className="value">{extendedStats.cpu_percent}%</span>
                                </div>
                                <div className="stat-box">
                                    <span className="label">Uptime</span>
                                    <span className="value">{Math.floor(extendedStats.uptime_seconds / 3600)}h {Math.floor((extendedStats.uptime_seconds % 3600) / 60)}m</span>
                                </div>
                            </div>

                            <h4>Database Table Counts</h4>
                            <div className="table-counts">
                                {Object.entries(extendedStats.table_counts).map(([name, count]) => (
                                    <div key={name} className="table-row">
                                        <span>{name}</span>
                                        <strong>{count}</strong>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="log-modal-footer">
                            <button className="btn-secondary" onClick={() => setShowStatsModal(false)}>Close</button>
                            <button className="btn-premium" onClick={fetchExtendedStats}>Refresh</button>
                        </div>
                    </div>
                </div>
            )}

            {showPurgeModal && (
                <div role="button" tabIndex={0} className="log-modal-overlay" onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => setShowPurgeModal(false)}>
                    <div role="button" tabIndex={0} className="log-modal glass-panel animate-fade-in purge-confirm" onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } }} onClick={e => e.stopPropagation()}>
                        <div className="log-modal-header danger">
                            <div className="title-group">
                                <ShieldAlert size={20} />
                                <h3>Confirm History Purge</h3>
                            </div>
                            <button className="close-btn" onClick={() => setShowPurgeModal(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <div className="log-content">
                            <p className="warning-text">This action is <strong>PERMANENT</strong> and will delete all messages and conversations from the database.</p>
                            <p>Are you absolutely sure you want to proceed?</p>
                        </div>
                        <div className="log-modal-footer">
                            <button className="btn-secondary" onClick={() => setShowPurgeModal(false)}>Cancel</button>
                            <button
                                className="btn-danger"
                                onClick={purgeHistory}
                                disabled={isPurging}
                            >
                                {isPurging ? 'Purging...' : 'Yes, Delete All History'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdvancedPanel;
