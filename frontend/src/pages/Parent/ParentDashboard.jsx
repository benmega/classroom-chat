import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, LogOut, Users, Eye, User } from 'lucide-react';
import client from '../../api/client';
import useAuthStore from '../../store/useAuthStore';
import './ParentDashboard.css';

const ParentDashboard = () => {
    const navigate = useNavigate();
    const [children, setChildren] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchChildren = async () => {
            try {
                const response = await client.get('/api/parents/children');
                setChildren(response.data.data?.children || []);
            } catch (err) {
                setError(err.response?.data?.error || 'Failed to load children');
            } finally {
                setIsLoading(false);
            }
        };
        fetchChildren();
    }, []);

    const handleLogout = async () => {
        await useAuthStore.getState().logout();
        navigate('/login');
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
            {/* ── Gradient Header Banner ── */}
            <header className="parent-header">
                <div className="parent-header-content">
                    <div className="parent-header-text">
                        <h1>Your Children's Progress</h1>
                        <p>Track achievements, coursework, and coding activity</p>
                    </div>
                    <button className="parent-logout-btn" onClick={handleLogout}>
                        <LogOut size={16} />
                        Sign Out
                    </button>
                </div>
            </header>

            {/* ── Card Grid ── */}
            <main className="parent-body">
                <div className="children-grid">
                    {error && (
                        <div className="parent-error">
                            <h3>Something went wrong</h3>
                            <p>{error}</p>
                        </div>
                    )}

                    {!error && children.length === 0 && (
                        <div className="parent-empty-state">
                            <Users size={48} strokeWidth={1.2} />
                            <h3>No Children Linked</h3>
                            <p>
                                Your account doesn't have any students linked yet.
                                Please contact the administrator to connect your child's account.
                            </p>
                        </div>
                    )}

                    {children.map((child) => (
                        <div key={child.id} className="child-card">
                            {child.profile_picture_url ? (
                                <img
                                    className="child-avatar"
                                    src={child.profile_picture_url}
                                    alt={child.username}
                                />
                            ) : (
                                <div className="child-avatar-placeholder">
                                    <User size={40} strokeWidth={1.5} />
                                </div>
                            )}
                            <h3 className="child-name">{child.username}</h3>
                            {child.nickname && (
                                <p className="child-nickname">{child.nickname}</p>
                            )}
                            <button
                                className="view-report-btn"
                                onClick={() => navigate(`/parent/report/${child.id}`)}
                            >
                                <Eye size={16} />
                                View Report Card
                            </button>
                        </div>
                    ))}
                </div>
            </main>
        </div>
    );
};

export default ParentDashboard;
