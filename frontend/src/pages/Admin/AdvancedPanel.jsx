import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Layers, 
    ShieldAlert, 
    Terminal, 
    Activity, 
    Trash2, 
    FileText, 
    Code, 
    BarChart3 
} from 'lucide-react';
import client from '../../api/client';
import toast from 'react-hot-toast';
import './AdvancedPanel.css';
import { X } from 'lucide-react';
import AdminPageHeader from '../../components/admin/AdminPageHeader';

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
                toast.success(`History purged! Deleted ${response.data.data.deleted_messages} messages.`);
                setShowPurgeModal(false);
            }
        } catch (err) {
            toast.error('Failed to purge history.');
            console.error(err);
        } finally {
            setIsPurging(false);
        }
    };



    if (isLoading) return <div className="admin-loading">Loading Advanced Panel...</div>;

    return (
        <div className="admin-advanced-panel">
            <AdminPageHeader 
                title="Advanced Database Management" 
                description="Direct access to backend model controllers and system utilities."
            />

            <div className="advanced-grid">


                <div className="utility-stack">
                    <section className="utility-card card">
                        <div className="utility-icon warning"><ShieldAlert size={20} /></div>
                        <div className="utility-content">
                            <h3>System Logs</h3>
                            <p>View real-time server output and error traces.</p>
                            <button 
                                className="btn-utility" 
                                onClick={fetchLogs}
                                disabled={isFetchingLogs}
                            >
                                <FileText size={16} /> {isFetchingLogs ? 'Fetching...' : 'Open Log Viewer'}
                            </button>
                        </div>
                    </section>

                    <section className="utility-card card premium-card">
                        <div className="utility-icon premium"><Layers size={20} /></div>
                        <div className="utility-content">
                            <h3>Headless Database Management</h3>
                            <p>Manage all database records via the new React-based headless interface.</p>
                            <button className="btn-premium" onClick={() => navigate('/admin/advanced-crud')}>
                                <Activity size={16} /> Open Headless CRUD
                            </button>
                        </div>
                    </section>

                    <section className="utility-card card">
                        <div className="utility-icon primary"><Terminal size={20} /></div>
                        <div className="utility-content">
                            <h3>API Documentation</h3>
                            <p>Browse available endpoints and request schemas.</p>
                            <button className="btn-utility" onClick={() => window.open(`${apiBaseUrl}/api/docs/`, '_blank')}>
                                <Code size={16} /> View Swagger
                            </button>
                        </div>
                    </section>

                    <section className="utility-card card">
                        <div className="utility-icon secondary"><Activity size={20} /></div>
                        <div className="utility-content">
                            <h3>Server Performance</h3>
                            <p>Monitor memory usage and database table counts.</p>
                            <button 
                                className="btn-utility" 
                                onClick={fetchExtendedStats}
                                disabled={isFetchingStats}
                            >
                                <BarChart3 size={16} /> {isFetchingStats ? 'Loading...' : 'View Extended Stats'}
                            </button>
                        </div>
                    </section>
                </div>
            </div>
            
            <div className="danger-zone">
                <div className="danger-header">
                    <ShieldAlert size={20} />
                    <h3>Danger Zone</h3>
                </div>
                <div className="danger-content">
                    <div className="danger-item">
                        <div className="text">
                            <h4>Clear All History</h4>
                            <p>Permanently deletes all message and conversation history. This cannot be undone.</p>
                        </div>
                        <button className="btn-danger" onClick={() => setShowPurgeModal(true)}>
                            <Trash2 size={18} /> Purge History
                        </button>
                    </div>
            </div>
            </div>

            {showLogModal && (
                <div className="log-modal-overlay" onClick={() => setShowLogModal(false)}>
                    <div className="log-modal glass-panel animate-fade-in" onClick={e => e.stopPropagation()}>
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
                <div className="log-modal-overlay" onClick={() => setShowStatsModal(false)}>
                    <div className="log-modal glass-panel animate-fade-in" onClick={e => e.stopPropagation()}>
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
                <div className="log-modal-overlay" onClick={() => setShowPurgeModal(false)}>
                    <div className="log-modal glass-panel animate-fade-in purge-confirm" onClick={e => e.stopPropagation()}>
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
