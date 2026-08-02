import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, LogOut, User, MessageSquare } from 'lucide-react';
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
            <div className="nav-rail-center">
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
                    <div className="nav-rail-divider" />
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
                                className={`nav-rail-item nav-rail-item-child ${active ? 'active' : ''}`}
                                data-tooltip={`${displayName}'s Report`}
                                aria-label={`${displayName}'s Report`}
                            >
                                {child.profile_picture_url && !child.profile_picture_url.includes('Default_pfp.jpg') ? (
                                    <img
                                        src={getApiUrl(child.profile_picture_url)}
                                        alt={displayName}
                                        className="nav-rail-avatar"
                                    />
                                ) : (
                                    <div className="nav-rail-avatar-fallback">
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
