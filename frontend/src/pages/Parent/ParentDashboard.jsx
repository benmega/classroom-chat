import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, MoreVertical } from 'lucide-react';
import toast from 'react-hot-toast';
import client from '../../api/client';
import useAuthStore from '../../store/useAuthStore';
import './ParentDashboard.css';

const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.split(/[\s_-]+/);
    if (parts.length > 1) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
};

const ParentDashboard = () => {
    const navigate = useNavigate();
    const [children, setChildren] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [openMenu, setOpenMenu] = useState(null);
    const [connectCode, setConnectCode] = useState('');
    const [connectError, setConnectError] = useState(null);
    const [isConnecting, setIsConnecting] = useState(false);

    const handleConnectChild = async (e) => {
        e.preventDefault();
        setConnectError(null);
        setIsConnecting(true);
        
        try {
            await client.post('/api/parents/connect/code', { code: connectCode });
            toast.success('Child connected successfully!');
            setConnectCode('');
            fetchChildren();
        } catch (err) {
            setConnectError(err.response?.data?.error || 'Failed to connect. Invalid code?');
        } finally {
            setIsConnecting(false);
        }
    };

    const fetchChildren = async () => {
        try {
            const response = await client.get(`/api/parents/children?t=${new Date().getTime()}`);
            setChildren(response.data.data?.children || response.data.children || []);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load children');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchChildren();
    }, []);


    const handleDisconnect = async (childId, childName) => {
        if (!window.confirm(`Remove ${childName} from your account? You can reconnect later with their code.`)) {
            return;
        }

        try {
            await client.post(`/api/parents/disconnect/${childId}`);
            toast.success(`Disconnected from ${childName}`);
            fetchChildren();
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to disconnect');
        }
    };

    if (isLoading) {
        return (
            <div className="parent-loading">
                <Loader2
                    size={56}
                    strokeWidth={1.5}
                    style={{ animation: 'spin 1s linear infinite', color: 'var(--primary-color)' }}
                />
                <div style={{ textAlign: 'center' }}>
                    <h2>Classroom Chat</h2>
                    <p>Loading your dashboard…</p>
                </div>
                <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    return (
        <div className="parent-dashboard animate-page-entry">
            {/* ── Card Grid ── */}
            <main className="parent-body">
                {(() => {
                    let gridClass = 'children-grid';
                    const totalCards = children.length + 1;
                    if (totalCards <= 2) gridClass += ' grid-few';
                    else if (totalCards <= 4) gridClass += ' grid-medium';
                    else gridClass += ' grid-many';

                    return (
                        <div className={gridClass}>
                            {error && (
                                <div className="parent-error">
                                    <h3>Something went wrong</h3>
                                    <p>{error}</p>
                                </div>
                            )}

                            {children.map((child) => (
                                <div
                                    key={child.id}
                                    className="child-card glass-panel"
                                >
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
                                                        handleDisconnect(child.id, child.nickname || child.username);
                                                    }}
                                                >
                                                    Remove Child
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <div onClick={() => navigate(`/parent/report/${child.id}`)} style={{ cursor: 'pointer', flex: 1 }}>
                                        {child.profile_picture_url && !child.profile_picture_url.includes('Default_pfp.jpg') ? (
                                            <img
                                                className="child-avatar"
                                                src={child.profile_picture_url}
                                                alt={child.username}
                                            />
                                        ) : (
                                            <div className="child-avatar-initials">
                                                {getInitials(child.nickname || child.username)}
                                            </div>
                                        )}
                                        <h3 className="child-name">{child.nickname || child.username}</h3>
                                        <p className="child-nickname" style={{ marginBottom: 0 }}>@{child.username}</p>
                                    </div>
                                </div>
                            ))}

                            {!error && (
                                <div className="child-card connect-card glass-panel">
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
                                            className="btn-premium btn-premium-sm" 
                                            disabled={isConnecting || !connectCode.trim()}
                                            style={{ width: '100%', justifyContent: 'center' }}
                                        >
                                            {isConnecting ? 'Connecting...' : 'Connect'}
                                        </button>
                                        {connectError && (
                                            <div className="connect-error-msg">
                                                {connectError}
                                            </div>
                                        )}
                                    </form>
                                </div>
                            )}
                        </div>
                    );
                })()}
            </main>
        </div>
    );
};

export default ParentDashboard;
