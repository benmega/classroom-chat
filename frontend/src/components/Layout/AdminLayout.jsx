import React, { useState, useEffect } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import {
    Home,
    LogOut,
    Shield,
    LayoutDashboard,
    BarChart3,
    FolderKanban,
    Trophy,
    FileCheck,
    FileText,
    ShieldAlert,
    Users,
    Menu,
    X,
    ChevronLeft,
    ChevronRight,
    ShoppingBag
} from 'lucide-react';
import useAuthStore from '../../store/useAuthStore';
import useSidebar from '../../hooks/useSidebar';
import './AdminLayout.css';
import SmartImage from '../common/SmartImage';
import { getApiUrl } from '../../utils/apiUrl';

const AdminLayout = ({ children }) => {
    const { user, isAuthenticated } = useAuthStore();
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const { isSidebarOpen, setSidebarOpen } = useSidebar();
    const location = useLocation();

    const toggleSidebarDesktop = () => setIsSidebarCollapsed(!isSidebarCollapsed);

    // Close mobile menu on route change
    useEffect(() => {
        setSidebarOpen(false);
    }, [location.pathname, setSidebarOpen]);

    if (!isAuthenticated || !user?.is_admin) {
        return (
            <div className="access-denied-container">
                <div className="access-denied-card">
                    <Shield size={64} color="#ef4444" />
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
        { path: '/admin/pending-trades', label: 'Pending Trades', icon: ShoppingBag },
        { path: '/admin/projects', label: 'Projects', icon: FolderKanban },
        { path: '/admin/certificates', label: 'Certificates', icon: FileCheck },
        { path: '/admin/advanced', label: 'Advanced Panel', icon: ShieldAlert },
        { path: '/chat', label: 'Back to Site', icon: Home },
        { path: '/logout', label: 'Logout', icon: LogOut },
    ];

    return (
        <div className={`admin-app-container ${isSidebarCollapsed ? 'collapsed' : ''} ${isSidebarOpen ? 'mobile-open' : ''}`}>
            {/* Mobile Overlay */}
            <div className="mobile-overlay" onClick={() => setSidebarOpen(false)}></div>

            {/* Sidebar */}
            <aside className="admin-sidebar">
                <div className="sidebar-header">
                    <Link className="sidebar-brand" to="/admin">
                        <img src="/images/logo.ico" alt="Admin HQ Logo" className="brand-logo-img" />
                        <span className="brand-text">Admin HQ</span>
                    </Link>
                    <button className="sidebar-toggle-btn desktop-only" onClick={toggleSidebarDesktop} aria-label="Toggle Sidebar">
                        {isSidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                    </button>
                    <button className="mobile-close-btn mobile-only" onClick={() => setSidebarOpen(false)}>
                        <X size={24} />
                    </button>
                </div>

                <nav className="sidebar-nav">
                    <div className="nav-group">
                        <span className="nav-group-label">Management</span>
                        {navItems.map((item) => {
                            if (item.path === '/logout') {
                                return (
                                    <button
                                        key={item.path}
                                        onClick={async (e) => {
                                            e.preventDefault();
                                            await useAuthStore.getState().logout();
                                            window.location.href = '/';
                                        }}
                                        className="nav-item"
                                        title={item.label}
                                        style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}
                                    >
                                        <item.icon size={22} className="nav-icon" />
                                        <span className="nav-label">{item.label}</span>
                                    </button>
                                );
                            }

                            return (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    end={item.end}
                                    className={({ isActive }) => `nav-item ${isActive || (item.path !== '/admin' && location.pathname.startsWith(item.path)) ? 'active' : ''}`}
                                    title={item.label}
                                >
                                    <item.icon size={22} className="nav-icon" />
                                    <span className="nav-label">{item.label}</span>
                                    {item.badge && (
                                        <span className="nav-badge">NEW</span>
                                    )}
                                </NavLink>
                            );
                        })}
                    </div>

                    {/* Secondary system group removed; Logout now in primary navigation */}
                </nav>

                <div className="sidebar-user">
                    <SmartImage
                        src={user?.profile_picture ? getApiUrl(`/user/profile_pictures/${user.profile_picture}`) : ''}
                        alt="Profile"
                        className="user-avatar"
                        fallbackType="avatar"
                    />
                    <div className="user-info">
                        <span className="user-name">{user?.nickname || user?.username}</span>
                        <span className="user-role">Administrator</span>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="admin-main-wrapper">
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
