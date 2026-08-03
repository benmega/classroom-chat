import React, { useState, useEffect } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import {
    Home,
    LogOut,
    Shield,
    LayoutDashboard,
    FolderKanban,
    Award,
    Settings2,
    Users,
    Menu,
    X,
    ArrowLeftRight,
    BookMarked,
    School,
    ClipboardList
} from 'lucide-react';
import useAuthStore from '../../store/useAuthStore';
import useSidebar from '../../hooks/useSidebar';
import client from '../../api/client';
import './AdminLayout.css';

const AdminLayout = ({ children }) => {
    const { user, isAuthenticated } = useAuthStore();
    const { isSidebarOpen, setSidebarOpen } = useSidebar();
    const location = useLocation();
    const [reviewCounts, setReviewCounts] = useState({
        pending_users: 0,
        pending_trades: 0,
        pending_projects: 0,
        pending_certificates: 0,
        pending_track_requests: 0,
        pending_course_requests: 0,
        total_incomplete: 0
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const response = await client.get('/api/admin/review_counts');
                if (response.data?.status === 'success') {
                    setReviewCounts(response.data.data);
                }
            } catch (err) {
                console.error("Failed to fetch review counts", err);
            }
        };

        if (isAuthenticated && user?.role === 'admin') {
            fetchData();
            const interval = setInterval(fetchData, 15000); // refresh every 15s
            return () => clearInterval(interval);
        }
    }, [isAuthenticated, user]);

    // Close mobile menu on route change
    useEffect(() => {
        setSidebarOpen(false);
    }, [location.pathname, setSidebarOpen]);

    if (!isAuthenticated || user?.role !== 'admin') {
        return (
            <div className="access-denied-container">
                <div className="access-denied-card">
                    <Shield size={64} color="var(--error-color)" />
                    <h1>Access Denied</h1>
                    <p>You do not have administrative permission to view this page. Restricted area.</p>
                    <Link to="/chat" className="btn-back">
                        <Home size={18} /> Back to Site
                    </Link>
                </div>
            </div>
        );
    }

    const navItems = [
        { path: '/admin', label: 'Dashboard', tooltip: 'Admin Dashboard', icon: LayoutDashboard, end: true },
        { path: '/admin/to-review', label: 'To Review', tooltip: 'Items To Review', icon: ClipboardList },
        { path: '/admin/users', label: 'Users', tooltip: 'User Management', icon: Users },
        { path: '/admin/classes', label: 'Classes', tooltip: 'Classes & Enrolments', icon: School },
        { path: '/admin/standard-projects', label: 'Standard Projects', tooltip: 'Standard Project Templates', icon: BookMarked },
        { path: '/admin/advanced', label: 'Advanced Panel', tooltip: 'Advanced System CRUD', icon: Settings2 },
        { path: '/chat', label: 'Back to Site', tooltip: 'Return to Main App', icon: Home },
    ];

    const isItemActive = (item) => {
        if (item.end) return location.pathname === item.path;
        return item.path !== '/admin' && location.pathname.startsWith(item.path);
    };

    return (
        <div className={`admin-app-container ${isSidebarOpen ? 'mobile-open' : ''}`}>
            {/* Mobile Overlay */}
            <div role="button" tabIndex={0} className="admin-mobile-overlay" onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => setSidebarOpen(false)}></div>

            {/* Sidebar */}
            <aside className="admin-sidebar">
                {/* Logo */}
                <Link
                    className="admin-rail-logo"
                    to="/admin"
                    data-tooltip="Admin HQ Home"
                    title="Admin HQ Home"
                    aria-label="Admin HQ Home"
                >
                    <img src="/images/logo.ico" alt="Admin HQ Logo" />
                    <span className="admin-brand-text">Admin HQ</span>
                </Link>

                {/* Mobile close button */}
                <button
                    className="admin-mobile-close mobile-only"
                    onClick={() => setSidebarOpen(false)}
                    aria-label="Close sidebar"
                >
                    <X size={22} />
                </button>

                {/* Nav items — center section */}
                <div className="admin-rail-center">
                    <span className="admin-nav-group-label mobile-only">Management</span>

                    {navItems.map((item) => {
                        const active = isItemActive(item);
                        const tooltipText = item.tooltip || item.label;
                        return (
                            <div
                                key={item.path}
                                className={`admin-rail-item-container${active ? ' active' : ''}`}
                            >
                                <div className="admin-rail-indicator" />
                                <NavLink
                                    to={item.path}
                                    end={item.end}
                                    className={({ isActive }) =>
                                        `admin-rail-item${isActive || active ? ' active' : ''}`
                                    }
                                    data-tooltip={tooltipText}
                                    title={tooltipText}
                                    aria-label={tooltipText}
                                >
                                    <span className="admin-rail-icon-wrap">
                                        <item.icon size={20} />
                                        {item.path === '/admin/to-review' && reviewCounts.total_incomplete > 0 && (
                                            <span className="admin-nav-badge">{reviewCounts.total_incomplete}</span>
                                        )}
                                        {item.path === '/admin/users' && reviewCounts.pending_users > 0 && (
                                            <span className="admin-nav-badge">{reviewCounts.pending_users}</span>
                                        )}
                                        {item.path === '/admin/pending-trades' && reviewCounts.pending_trades > 0 && (
                                            <span className="admin-nav-badge">{reviewCounts.pending_trades}</span>
                                        )}
                                        {item.path === '/admin/projects' && reviewCounts.pending_projects > 0 && (
                                            <span className="admin-nav-badge">{reviewCounts.pending_projects}</span>
                                        )}
                                        {item.path === '/admin/certificates' && reviewCounts.pending_certificates > 0 && (
                                            <span className="admin-nav-badge">{reviewCounts.pending_certificates}</span>
                                        )}
                                        {item.path === '/admin' && reviewCounts.pending_track_requests > 0 && (
                                            <span className="admin-nav-badge">{reviewCounts.pending_track_requests}</span>
                                        )}
                                    </span>
                                    <span className="admin-nav-label">{item.label}</span>
                                    {item.path === '/admin/to-review' && reviewCounts.total_incomplete > 0 && (
                                        <span className="admin-nav-badge mobile-badge">{reviewCounts.total_incomplete}</span>
                                    )}
                                    {item.path === '/admin/users' && reviewCounts.pending_users > 0 && (
                                        <span className="admin-nav-badge mobile-badge">{reviewCounts.pending_users}</span>
                                    )}
                                    {item.path === '/admin/pending-trades' && reviewCounts.pending_trades > 0 && (
                                        <span className="admin-nav-badge mobile-badge">{reviewCounts.pending_trades}</span>
                                    )}
                                    {item.path === '/admin/projects' && reviewCounts.pending_projects > 0 && (
                                        <span className="admin-nav-badge mobile-badge">{reviewCounts.pending_projects}</span>
                                    )}
                                    {item.path === '/admin/certificates' && reviewCounts.pending_certificates > 0 && (
                                        <span className="admin-nav-badge mobile-badge">{reviewCounts.pending_certificates}</span>
                                    )}
                                    {item.path === '/admin' && reviewCounts.pending_track_requests > 0 && (
                                        <span className="admin-nav-badge mobile-badge">{reviewCounts.pending_track_requests}</span>
                                    )}
                                </NavLink>
                            </div>
                        );
                    })}
                </div>

                {/* Bottom section — logout */}
                <div className="admin-rail-bottom">
                    <div className="admin-rail-item-container admin-logout-container">
                        <div className="admin-rail-indicator" />
                        <button
                            onClick={async () => {
                                await useAuthStore.getState().logout();
                                window.location.href = '/';
                            }}
                            className="admin-rail-item admin-logout-btn"
                            data-tooltip="Logout"
                            title="Logout"
                            aria-label="Logout"
                        >
                            <span className="admin-rail-icon-wrap">
                                <LogOut size={20} />
                            </span>
                            <span className="admin-nav-label">Logout</span>
                        </button>
                    </div>
                </div>
            </aside>

            {/* Mobile Hamburger Button + Main Content */}
            <div className="admin-main-wrapper">
                <div className="admin-mobile-top-bar mobile-only">
                    <button
                        className="admin-hamburger"
                        onClick={() => setSidebarOpen(true)}
                        aria-label="Open Sidebar"
                    >
                        <Menu size={24} />
                    </button>
                </div>

                {/* Main Content Area */}
                <main
                    key={location.pathname.startsWith('/admin/advanced-crud') ? '/admin/advanced-crud' : location.pathname}
                    className="admin-body animate-page-entry"
                >
                    {children}
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;
