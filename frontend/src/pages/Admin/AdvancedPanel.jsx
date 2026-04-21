import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    ArrowLeft, 
    Database, 
    Layers, 
    ExternalLink, 
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

const AdvancedPanel = () => {
    const navigate = useNavigate();
    const [views, setViews] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [logs, setLogs] = useState('');
    const [showLogModal, setShowLogModal] = useState(false);
    const [isFetchingLogs, setIsFetchingLogs] = useState(false);
    
    // In production, the API is served from the same origin as the frontend.
    // In development, we fallback to the known Flask port (8000).
    const apiBaseUrl = import.meta.env.VITE_API_URL || 
                      (import.meta.env.DEV ? 'http://localhost:8000' : window.location.origin);

    const fetchViews = async () => {
        setIsLoading(true);
        try {
            const response = await client.get('/api/admin/advanced-panel');
            if (response.data.status === 'success') {
                setViews(response.data.data.views);
            }
        } catch {
            toast.error('Failed to load advanced panel views.');
        } finally {
            setIsLoading(false);
        }
    };

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

    useEffect(() => {
        fetchViews();
    }, []);

    if (isLoading) return <div className="admin-loading">Loading Advanced Panel...</div>;

    return (
        <div className="admin-advanced-panel">
            <header className="page-header">
                <button onClick={() => navigate('/admin')} className="back-btn">
                    <ArrowLeft size={20} /> Back to Dashboard
                </button>
                <h1>Advanced Database Management</h1>
                <p>Direct access to backend model controllers and system utilities.</p>
            </header>

            <div className="advanced-grid">
                <section className="model-links-section card">
                    <div className="section-header">
                        <Database size={24} />
                        <h2>Model Views (Legacy SSR)</h2>
                    </div>
                    <p className="section-desc">Traditional server-rendered database management. For modern headless management, use the <strong>Headless CRUD</strong> utility below.</p>
                    
                    <div className="model-list">
                        {views.length > 0 ? (
                            views.map((view, idx) => (
                                <a 
                                    key={idx}
                                    href={`${apiBaseUrl}/api/admin/advanced/${view.endpoint}/`} 
                                    className="model-item"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <div className="model-name">
                                        <Layers size={18} />
                                        <span>{view.name}</span>
                                    </div>
                                    <ExternalLink size={16} className="ext-icon" />
                                </a>
                            ))
                        ) : (
                            <div className="empty-state">No models registered.</div>
                        )}
                    </div>
                </section>

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
                            <p>Monitor memory usage and active DB connections.</p>
                            <button className="btn-utility" onClick={() => navigate('/admin/dashboard')}>
                                <BarChart3 size={16} /> View Stats
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
                        <button className="btn-danger" onClick={() => toast('Security confirmation required.')}>
                            <Trash2 size={18} /> Purge History
                        </button>
                    </div>
            </div>
            </div>

            {showLogModal && (
                <div className="log-modal-overlay">
                    <div className="log-modal glass-panel animate-fade-in">
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
        </div>
    );
};

export default AdvancedPanel;
