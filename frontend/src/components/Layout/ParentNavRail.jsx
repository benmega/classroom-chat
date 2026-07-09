import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Home, MessageCircle, BarChart2, LogOut } from 'lucide-react';

const ParentNavRail = ({ location, handleLogout }) => {
    const navigate = useNavigate();

    const handleReportCardNav = () => {
        const lastReport = localStorage.getItem('parent_last_report_child_id');
        if (lastReport) {
            navigate(`/parent/report/${lastReport}`);
        } else {
            navigate('/parent/dashboard');
        }
    };

    const isActive = (path) => location.pathname === path;
    const isReportActive = location.pathname.startsWith('/parent/report');

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

                {/* Message Teacher — links to dashboard (contact form lives there) */}
                <div className={`nav-rail-item-container`}>
                    <div className="nav-rail-indicator" />
                    <Link
                        to="/parent/dashboard"
                        className="nav-rail-item"
                        data-tooltip="Message Teacher"
                        aria-label="Message Teacher"
                    >
                        <MessageCircle size={20} />
                    </Link>
                </div>

                {/* Report Card — smart navigation */}
                <div className={`nav-rail-item-container ${isReportActive ? 'active' : ''}`}>
                    <div className="nav-rail-indicator" />
                    <button
                        onClick={handleReportCardNav}
                        className={`nav-rail-item ${isReportActive ? 'active' : ''}`}
                        data-tooltip="Report Card"
                        aria-label="Report Card"
                    >
                        <BarChart2 size={20} />
                    </button>
                </div>
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
