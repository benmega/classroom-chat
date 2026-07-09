import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, LogOut, User } from 'lucide-react';
import client from '../../api/client';
import { getApiUrl } from '../../utils/apiUrl';

const ParentNavRail = ({ handleLogout }) => {
    const location = useLocation();
    const [children, setChildren] = useState([]);

    useEffect(() => {
        const fetchChildren = async () => {
            try {
                const response = await client.get(`/api/parents/children?t=${new Date().getTime()}`);
                setChildren(response.data.data?.children || response.data.children || []);
            } catch (err) {
                console.error('Failed to load children in nav rail:', err);
            }
        };
        fetchChildren();
    }, []);

    const isActive = (path) => location.pathname === path;
    const isReportActive = (childId) => location.pathname === `/parent/report/${childId}`;

    return (
        <aside className="desktop-nav-rail">
            {/* Logo */}
            <Link to="/parent/dashboard" className="nav-rail-logo" data-tooltip="Classroom Chat">
                <img src="/images/logo.ico" alt="Classroom Chat Logo" />
            </Link>

            {/* Center nav items */}
            <div className="nav-rail-center" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center' }}>
                {/* Home / Dashboard */}
                <div className={`nav-rail-item-container ${isActive('/parent/dashboard') ? 'active' : ''}`}>
                    <div className="nav-rail-indicator" />
                    <Link
                        to="/parent/dashboard"
                        className={`nav-rail-item ${isActive('/parent/dashboard') ? 'active' : ''}`}
                        data-tooltip="Dashboard"
                        aria-label="Dashboard"
                    >
                        <Home size={20} />
                    </Link>
                </div>

                {/* Divider if we have children */}
                {children.length > 0 && (
                    <div style={{ width: '20px', height: '1px', background: 'var(--border-subtle)', margin: '0.5rem 0' }} />
                )}

                {/* Dynamic Child Links */}
                {children.map((child) => {
                    const active = isReportActive(child.id);
                    const displayName = child.nickname || child.username;
                    
                    return (
                        <div key={child.id} className={`nav-rail-item-container ${active ? 'active' : ''}`}>
                            <div className="nav-rail-indicator" />
                            <Link
                                to={`/parent/report/${child.id}`}
                                className={`nav-rail-item ${active ? 'active' : ''}`}
                                data-tooltip={`${displayName}'s Report`}
                                aria-label={`${displayName}'s Report`}
                                style={{ padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                                {child.profile_picture_url && !child.profile_picture_url.includes('Default_pfp.jpg') ? (
                                    <img
                                        src={getApiUrl(child.profile_picture_url)}
                                        alt={displayName}
                                        style={{
                                            width: '24px',
                                            height: '24px',
                                            borderRadius: '50%',
                                            objectFit: 'cover',
                                            border: active ? '2px solid var(--primary-color)' : '1px solid var(--border-subtle)'
                                        }}
                                    />
                                ) : (
                                    <div
                                        style={{
                                            width: '24px',
                                            height: '24px',
                                            borderRadius: '50%',
                                            background: active ? 'var(--primary-light)' : 'var(--bg-tertiary)',
                                            color: active ? 'var(--primary-color)' : 'var(--text-muted)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '10px',
                                            fontWeight: 'bold',
                                            border: active ? '2px solid var(--primary-color)' : '1px solid var(--border-subtle)'
                                        }}
                                    >
                                        {displayName.slice(0, 2).toUpperCase()}
                                    </div>
                                )}
                            </Link>
                        </div>
                    );
                })}
            </div>

            {/* Bottom — logout */}
            <div className="nav-rail-bottom">
                <div className="nav-rail-item-container logout-container">
                    <div className="nav-rail-indicator" />
                    <button
                        onClick={handleLogout}
                        className="nav-rail-item logout-btn-rail"
                        data-tooltip="Logout"
                        aria-label="Logout"
                    >
                        <LogOut size={20} />
                    </button>
                </div>
            </div>
        </aside>
    );
};

export default ParentNavRail;
