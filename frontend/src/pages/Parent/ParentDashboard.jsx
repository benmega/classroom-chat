import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, LogOut, Users, Eye, User, UserPlus, Plus } from 'lucide-react';
import client from '../../api/client';
import useAuthStore from '../../store/useAuthStore';
import AddChildModal from './AddChildModal';
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
    const [isModalOpen, setIsModalOpen] = useState(false);

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

    const handleLogout = async () => {
        await useAuthStore.getState().logout();
        navigate('/');
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
            <header className="parent-header glass-panel">
                <div className="parent-header-content">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <div className="header-icon-container">
                            <img src="/images/logo.ico" alt="Blossom Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        </div>
                        <div className="parent-header-text">
                            <h1>Your Children's Progress</h1>
                            <p>Track achievements, coursework, and coding activity</p>
                        </div>
                    </div>
                    <div className="parent-header-actions">
                        <button className="btn-premium btn-premium-sm" onClick={() => setIsModalOpen(true)}>
                            <UserPlus size={16} />
                            Add Child
                        </button>
                        <button className="btn-secondary btn-secondary-sm" onClick={handleLogout}>
                            <LogOut size={16} />
                            Sign Out
                        </button>
                    </div>
                </div>
            </header>

            {/* ── Card Grid ── */}
            <main className="parent-body">
                {(() => {
                    let gridClass = 'children-grid';
                    if (children.length > 0) {
                        const totalCards = children.length + 1;
                        if (totalCards <= 2) gridClass += ' grid-few';
                        else if (totalCards <= 4) gridClass += ' grid-medium';
                        else gridClass += ' grid-many';
                    }
                    return (
                        <div className={gridClass}>
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
                            <button className="btn-premium btn-premium-sm" onClick={() => setIsModalOpen(true)} style={{ marginTop: '1.5rem' }}>
                                <UserPlus size={16} />
                                Add Child
                            </button>
                        </div>
                    )}

                    {children.map((child) => (
                        <div 
                            key={child.id} 
                            className="child-card glass-panel"
                            onClick={() => navigate(`/parent/report/${child.id}`)}
                        >
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
                    ))}

                    {children.length > 0 && (
                        <div 
                            className="child-card ghost-card glass-panel"
                            onClick={() => setIsModalOpen(true)}
                        >
                            <div className="ghost-card-icon">
                                <Plus size={32} strokeWidth={2} />
                            </div>
                            <h3 className="child-name ghost-text">Add Child</h3>
                            <p className="child-nickname ghost-text" style={{ marginBottom: 0 }}>Connect another account</p>
                        </div>
                    )}
                </div>
                );
                })()}
            </main>

            <AddChildModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                onAdded={fetchChildren} 
            />
        </div>
    );
};

export default ParentDashboard;
