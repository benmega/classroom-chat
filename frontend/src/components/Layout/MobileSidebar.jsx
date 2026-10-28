import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Home, User, Shield, FileCheck, History, RefreshCw, X, LogOut, MessageSquare, ShoppingCart, Map, Award, Settings, HelpCircle, ClipboardCheck } from 'lucide-react';
import useAuthStore from '../../store/useAuthStore';
import { getApiUrl } from '../../utils/apiUrl';
import useParentChildren from '../../hooks/useParentChildren';
import useModalA11y from '../../hooks/useModalA11y';
import { MOBILE_SIDEBAR_ID } from './layoutIds';

// Above this width the sidebar is display:none (the nav rail takes over), see Layout.css.
const DESKTOP_QUERY = '(min-width: 801px)';

const MobileSidebar = ({ user, isParent, isSidebarOpen, setSidebarOpen, handleLogout, onContactTeacher }) => {
    const { unreadCount, activityUnreadCount } = useAuthStore();
    const { children } = useParentChildren(isParent);

    const close = () => setSidebarOpen(false);

    // While open: Escape closes, Tab stays inside, focus moves in and returns to the hamburger on close.
    const asideRef = useRef(null);
    useModalA11y({ isOpen: isSidebarOpen, onClose: close, containerRef: asideRef });

    // Widening the window past the breakpoint hides the sidebar for good; close it so a trapped Tab cannot
    // outlive the drawer it belonged to.
    const closeRef = useRef(close);
    useEffect(() => {
        closeRef.current = close;
    });
    useEffect(() => {
        if (!isSidebarOpen || typeof window.matchMedia !== 'function') return undefined;
        const desktop = window.matchMedia(DESKTOP_QUERY);
        const onChange = (e) => { if (e.matches) closeRef.current(); };
        desktop.addEventListener('change', onChange);
        return () => desktop.removeEventListener('change', onChange);
    }, [isSidebarOpen]);

    return (
        <>
            {/* A real button so assistive tech can find "Close menu". Out of the tab order on purpose: the close
                button inside the sidebar and Escape do the same for a keyboard user. */}
            <button type="button" tabIndex={-1} aria-label="Close menu" inert={!isSidebarOpen}
                className={`mobile-overlay ${isSidebarOpen ? 'show' : ''}`}
                onClick={close}
            ></button>

            {/* inert while closed: the links are slid off-screen, not removed, so without it Tab walks through them */}
            <aside id={MOBILE_SIDEBAR_ID} ref={asideRef} tabIndex={-1} inert={!isSidebarOpen}
                className={`mobile-sidebar ${isSidebarOpen ? 'open' : ''}`} aria-label="Navigation">
                <div className="sidebar-header">
                    <div className="sidebar-logo">
                        <img src="/images/logo.png" alt="Logo" />
                    </div>
                    <button className="sidebar-close" onClick={close} aria-label="Close navigation" data-autofocus>
                        <X size={24} />
                    </button>
                </div>
 
                <nav className="sidebar-nav">
                    <ul>
                        {isParent ? (

                            <>
                                <li>
                                    <Link to="/parent/dashboard" onClick={close}>
                                        <Home size={18} /> Dashboard
                                    </Link>
                                </li>
                                <li>
                                    <button onClick={() => { onContactTeacher(); close(); }} className="sidebar-link-btn" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%', background: 'none', border: 'none', padding: '0.75rem 1rem', color: 'var(--text-primary)', fontSize: '0.95rem', cursor: 'pointer', textAlign: 'left' }}>
                                        <HelpCircle size={18} /> Message Teacher
                                    </button>
                                </li>


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

                                <li>
                                    <Link to="/tests" onClick={close}><ClipboardCheck size={18} /> Tests</Link>
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

                                {Math.abs(user?.packets ?? 0) > 0.00001 && (
                                    <li><Link to="/shop" onClick={close}><ShoppingCart size={18} /> Reward Shop</Link></li>
                                )}

                                <li><Link to="/submit-work" onClick={close}><FileCheck size={18} /> Submit Work</Link></li>
                            </>
                        )}


                        <li><Link to="/settings" onClick={close}><Settings size={18} /> Settings</Link></li>
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
