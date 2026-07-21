import React, { useState, useEffect } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import {
    Home,
    LogOut,
    Shield,
    LayoutDashboard,
    FolderKanban,
    FileCheck,
    ShieldAlert,
    Users,
    Menu,
    X,
    ShoppingBag,
    GraduationCap,
    BookOpen
} from 'lucide-react';
import useAuthStore from '../../store/useAuthStore';
import useSidebar from '../../hooks/useSidebar';
import client from '../../api/client';
import './AdminLayout.css';

const AdminLayout = ({ children }) => {
    const { user, isAuthenticated } = useAuthStore();
    const { isSidebarOpen, setSidebarOpen } = useSidebar();
    const location = useLocation();
    const [pendingCount, setPendingCount] = useState(0);
    const [pendingTrackRequestsCount, setPendingTrackRequestsCount] = useState(0);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [usersRes, requestsRes] = await Promise.all([
                    client.get('/api/admin/pending_users').catch(() => ({ data: {} })),
                    client.get('/api/admin/track-requests/').catch(() => ({ data: {} }))
                ]);
                
                if (usersRes.data?.status === 'success') {
                    setPendingCount(usersRes.data.data?.users?.length || 0);
                }
                if (requestsRes.data?.success) {
                    setPendingTrackRequestsCount(requestsRes.data.requests?.length || 0);
                }
            } catch (err) {
                console.error("Failed to fetch pending counts", err);
            }
        };

        if (isAuthenticated && user?.is_admin) {
            fetchData();
            const interval = setInterval(fetchData, 15000); // refresh every 15s
            return () => clearInterval(interval);
        }
    }, [isAuthenticated, user]);

    // Close mobile menu on route change
    useEffect(() => {
        setSidebarOpen(false);
    }, [location.pathname, setSidebarOpen]);

    if (!isAuthenticated || !user?.is_admin) {
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
        { path: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
        { path: '/admin/users', label: 'Users', icon: Users },
        { path: '/admin/classes', label: 'Classes', icon: BookOpen },
        { path: '/admin/pending-trades', label: 'Pending Trades', icon: ShoppingBag },
        { path: '/admin/projects', label: 'Projects', icon: FolderKanban },
        { path: '/admin/standard-projects', label: 'Standard Projects', icon: BookOpen },
        { path: '/admin/course-instances', label: 'Course Instances', icon: GraduationCap },
        { path: '/admin/certificates', label: 'Certificates', icon: FileCheck },
        { path: '/admin/advanced', label: 'Advanced Panel', icon: ShieldAlert },
        { path: '/chat', label: 'Back to Site', icon: Home },
    ];

    const isItemActive = (item) => {
        if (item.end) return location.pathname === item.path;
        return item.path !== '/admin' && location.pathname.startsWith(item.path);
    };

    return (
        <div className={`admin-app-container ${isSidebarOpen ? 'mobile-open' : ''}`}>
            {/* Mobile Overlay */}
            <div className="admin-mobile-overlay" onClick={() => setSidebarOpen(false)}></div>

            {/* Sidebar */}
            <aside className="admin-sidebar">
                {/* Logo */}
                <Link
                    className="admin-rail-logo"
                    to="/admin"
                    data-tooltip="Admin HQ"
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
                                    data-tooltip={item.label}
                                >
                                    <span className="admin-rail-icon-wrap">
                                        <item.icon size={20} />
                                        {item.path === '/admin/users' && pendingCount > 0 && (
                                            <span className="admin-nav-badge">{pendingCount}</span>
                                        )}
                                        {item.path === '/admin' && pendingTrackRequestsCount > 0 && (
                                            <span className="admin-nav-badge">{pendingTrackRequestsCount}</span>
                                        )}
                                    </span>
                                    <span className="admin-nav-label">{item.label}</span>
                                    {item.path === '/admin/users' && pendingCount > 0 && (
                                        <span className="admin-nav-badge mobile-badge">{pendingCount}</span>
                                    )}
                                    {item.path === '/admin' && pendingTrackRequestsCount > 0 && (
                                        <span className="admin-nav-badge mobile-badge">{pendingTrackRequestsCount}</span>
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
