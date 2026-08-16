import React from 'react';
import { Link } from 'react-router-dom';
import { Home, User, Shield, FileCheck, History, RefreshCw, X, LogOut, MessageSquare } from 'lucide-react';
import useAuthStore from '../../store/useAuthStore';

const MobileSidebar = ({ user, isParent, isSidebarOpen, setSidebarOpen, handleLogout }) => {
    const { unreadCount, activityUnreadCount } = useAuthStore();

    return (
        <>
            <div role="button" tabIndex={0} 
                className={`mobile-overlay ${isSidebarOpen ? 'show' : ''}`} 
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => setSidebarOpen(false)}
            ></div>
            
            <aside className={`mobile-sidebar ${isSidebarOpen ? 'open' : ''}`}>
                <div className="sidebar-header">
                    <div className="sidebar-logo">
                        <img src="/images/logo.ico" alt="Logo" />
                    </div>
                    <button className="sidebar-close" onClick={() => setSidebarOpen(false)}>
                        <X size={24} />
                    </button>
                </div>
 
                <nav className="sidebar-nav">
                    <ul>
                        {isParent ? (
                            <li>
                                <Link to="/parent/dashboard" onClick={() => setSidebarOpen(false)}>
                                    <Home size={18} /> Dashboard
                                </Link>
                            </li>
                        ) : (
                            <li>
                                <Link to="/chat" onClick={() => setSidebarOpen(false)}>
                                    <div className="nav-badge-container" style={{ display: 'inline-flex', alignItems: 'center', width: '100%' }}>
                                        <MessageSquare size={18} />
                                        <span style={{ marginLeft: '12px', flexGrow: 1 }}>Chat</span>
                                        {unreadCount > 0 && (
                                            <span className="nav-unread-badge mobile-badge">{unreadCount}</span>
                                        )}
                                    </div>
                                </Link>
                            </li>
                        )}
                        {!isParent && (
                            <li><Link to="/profile" onClick={() => setSidebarOpen(false)}><User size={18} /> Profile</Link></li>
                        )}
                        {user?.role === 'admin' && (
                            <li><Link to="/admin" onClick={() => setSidebarOpen(false)}><Shield size={18} /> Admin Panel</Link></li>
                        )}
                        {!isParent && (
                            <>

                                <li>
                                    <Link to="/activity" onClick={() => setSidebarOpen(false)}>
                                        <div className="nav-badge-container" style={{ display: 'inline-flex', alignItems: 'center', width: '100%' }}>
                                            <History size={18} />
                                            <span style={{ marginLeft: '12px', flexGrow: 1 }}>Activity</span>
                                            {activityUnreadCount > 0 && (
                                                <span className="nav-unread-badge mobile-badge">{activityUnreadCount}</span>
                                            )}
                                        </div>
                                    </Link>
                                </li>
                                {(user?.duck_balance ?? 0) > 0 && (
                                    <li><Link to="/bit-shift" onClick={() => setSidebarOpen(false)}><RefreshCw size={18} /> Bit Shift</Link></li>
                                )}
                            </>
                        )}
                    </ul>
                </nav>

                <div className="sidebar-footer">
                    <button onClick={() => { handleLogout(); setSidebarOpen(false); }} className="sidebar-logout">
                        <LogOut size={18} /> Logout
                    </button>
                </div>
            </aside>
        </>
    );
};

export default MobileSidebar;
