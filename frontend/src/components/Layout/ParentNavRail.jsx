import React from 'react';
import { Link } from 'react-router-dom';
import { Home, LogOut } from 'lucide-react';

const ParentNavRail = ({ location, handleLogout }) => {
    return (
        <aside className="desktop-nav-rail">
            <Link to="/parent/dashboard" className="nav-rail-logo" data-tooltip="Classroom Chat">
                <img src="/images/logo.ico" alt="Classroom Chat Logo" />
            </Link>

            <div className="nav-rail-center">
                <div className={`nav-rail-item-container ${location.pathname === '/parent/dashboard' ? 'active' : ''}`}>
                    <div className="nav-rail-indicator" />
                    <Link
                        to="/parent/dashboard"
                        className={`nav-rail-item ${location.pathname === '/parent/dashboard' ? 'active' : ''}`}
                        data-tooltip="Dashboard"
                    >
                        <Home size={20} />
                    </Link>
                </div>
            </div>

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
