import React from 'react';
import { Link } from 'react-router-dom';
import { Home, User, Shield, FileCheck, History, RefreshCw, X, LogOut, MessageSquare, ShoppingCart, Map, Award, Settings } from 'lucide-react';
import useAuthStore from '../../store/useAuthStore';
import { getApiUrl } from '../../utils/apiUrl';
import useParentChildren from '../../hooks/useParentChildren';

const MobileSidebar = ({ user, isParent, isSidebarOpen, setSidebarOpen, handleLogout }) => {
    const { unreadCount, activityUnreadCount } = useAuthStore();
    const { children } = useParentChildren(isParent);

    const close = () => setSidebarOpen(false);

    return (
        <>
            <div role="button" tabIndex={0} 
                className={`mobile-overlay ${isSidebarOpen ? 'show' : ''}`} 
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } }} onClick={close}
            ></div>
            
            <aside className={`mobile-sidebar ${isSidebarOpen ? 'open' : ''}`} aria-label="Navigation">
                <div className="sidebar-header">
                    <div className="sidebar-logo">
                        <img src="/images/logo.ico" alt="Logo" />
                    </div>
                    <button className="sidebar-close" onClick={close} aria-label="Close navigation">
                        <X size={24} />
                    </button>
                </div>
 
                <nav className="sidebar-nav">
                    <ul>
                        {isParent ? (
                            // 👨‍👩‍👧‍👦 Parent Navigation -------------------------------------
                            <>
                                <li>
                                    <Link to="/parent/dashboard" onClick={close}>
                                        <Home size={18} /> Dashboard
                                    </Link>
                                </li>
                                <li>
                                    <Link to="/chat" onClick={close}>
                                        <MessageSquare size={18} /> Messages
                                    </Link>
                                </li>

                                {/* Child report card links */}
                                {children.length > 0 && (
                                    <>
                                        <li className="sidebar-nav-section-label">My Children</li>
                                        {children.map((child) => {
                                            const displayName = child.nickname || child.username;
                                            return (
                                                <li key={child.id}>
                                                    <Link to={`/parent/report/${child.id}`} onClick={close}>
                                                        {child.profile_picture_url && !child.profile_picture_url.includes('Default_pfp.jpg') ? (
                                                            <img
                                                                src={getApiUrl(child.profile_picture_url)}
                                                                alt={displayName}
                                                                className="sidebar-child-avatar"
                                                            />
                                                        ) : (
                                                            <div className="sidebar-child-avatar-fallback">
                                                                {displayName.slice(0, 2).toUpperCase()}
                                                            </div>
                                                        )}
                                                        {displayName}'s Report
                                                    </Link>
                                                </li>
                                            );
                                        })}
                                    </>
                                )}
                            </>
                        ) : (
                            // ── Student / Admin Navigation ─────────────────────────────
                            <>
                                <li>
                                    <Link to="/chat" onClick={close}>
                                        <div className="nav-badge-container" style={{ display: 'inline-flex', alignItems: 'center', width: '100%' }}>
                                            <MessageSquare size={18} />
                                            <span style={{ marginLeft: '12px', flexGrow: 1 }}>Chat</span>
                                            {unreadCount > 0 && (
                                                <span className="nav-unread-badge mobile-badge">{unreadCount}</span>
                                            )}
                                        </div>
                                    </Link>
                                </li>

                                <li>
                                    <Link to="/profile" onClick={close}><User size={18} /> Profile</Link>
                                </li>

                                <li>
                                    <Link to={user?.slug ? `/course-progress/${user.slug}` : '/profile'} onClick={close}>
                                        <Map size={18} /> Learning Path
                                    </Link>
                                </li>

                                {(user?.achievement_count ?? 0) > 0 && (
                                    <li>
                                        <Link to="/achievements" onClick={close}><Award size={18} /> Achievements</Link>
                                    </li>
                                )}

                                {user?.role === 'admin' && (
                                    <li><Link to="/admin" onClick={close}><Shield size={18} /> Admin Panel</Link></li>
                                )}

                                {user?.has_activity && (
                                    <li>
                                        <Link to="/activity" onClick={close}>
                                            <div className="nav-badge-container" style={{ display: 'inline-flex', alignItems: 'center', width: '100%' }}>
                                                <History size={18} />
                                                <span style={{ marginLeft: '12px', flexGrow: 1 }}>Activity</span>
                                                {activityUnreadCount > 0 && (
                                                    <span className="nav-unread-badge mobile-badge">{activityUnreadCount}</span>
                                                )}
                                            </div>
                                        </Link>
                                    </li>
                                )}

                                {(user?.duck_balance ?? 0) > 0 && (
                                    <li><Link to="/bit-shift" onClick={close}><RefreshCw size={18} /> Bit Shift</Link></li>
                                )}

                                {Math.abs(user?.packets ?? 0) > 0.001 && (
                                    <li><Link to="/shop" onClick={close}><ShoppingCart size={18} /> Reward Shop</Link></li>
                                )}

                                <li><Link to="/submit-work" onClick={close}><FileCheck size={18} /> Submit Work</Link></li>
                            </>
                        )}

                        {/* Settings — all roles */}
                        {!isParent && (
                            <li><Link to="/settings" onClick={close}><Settings size={18} /> Settings</Link></li>
                        )}
                    </ul>
                </nav>

                <div className="sidebar-footer">
                    <button onClick={() => { handleLogout(); close(); }} className="sidebar-logout">
                        <LogOut size={18} /> Logout
                    </button>
                </div>
            </aside>
        </>
    );
};

export default MobileSidebar;
