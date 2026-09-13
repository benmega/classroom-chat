import React from 'react';
import { Link } from 'react-router-dom';
import { 
    User, 
    Shield, 
    Award, 
    FileCheck, 
    MessageSquare, 
    LogOut,
    ShoppingCart,
    RefreshCw,
    Map,
    Settings
} from 'lucide-react';
import useAuthStore from '../../store/useAuthStore';

const DesktopNavRail = ({ user, location, handleLogout }) => {
    const { unreadCount } = useAuthStore();

    return (
        <aside className="desktop-nav-rail">
            <Link to="/chat" className="nav-rail-logo" data-tooltip="Classroom Chat">
                <img src="/images/logo.ico" alt="Classroom Chat Logo" />
            </Link>
            
            <div className="nav-rail-center">
                <div className={`nav-rail-item-container ${location.pathname === '/chat' ? 'active' : ''}`}>
                    <div className="nav-rail-indicator" />
                    <Link 
                        to="/chat" 
                        className={`nav-rail-item ${location.pathname === '/chat' ? 'active' : ''}`}
                        data-tooltip="Chat"
                    >
                        <div className="nav-badge-container">
                            <MessageSquare size={20} />
                            {unreadCount > 0 && (
                                <span className="nav-unread-badge">{unreadCount}</span>
                            )}
                        </div>
                    </Link>
                </div>


                <div className={`nav-rail-item-container ${location.pathname.startsWith('/course-progress') ? 'active' : ''}`}>
                    <div className="nav-rail-indicator" />
                    <Link 
                        to={user?.slug ? `/course-progress/${user.slug}` : "/profile"} 
                        className={`nav-rail-item ${location.pathname.startsWith('/course-progress') ? 'active' : ''}`}
                        data-tooltip="Learning Path"
                    >
                        <Map size={20} />
                    </Link>
                </div>

                {(user?.achievement_count ?? 0) > 0 && (
                    <div className={`nav-rail-item-container ${location.pathname === '/achievements' ? 'active' : ''}`}>
                        <div className="nav-rail-indicator" />
                        <Link 
                            to="/achievements" 
                            className={`nav-rail-item ${location.pathname === '/achievements' ? 'active' : ''}`}
                            data-tooltip="Achievements"
                        >
                            <Award size={20} />
                        </Link>
                    </div>
                )}

                {(user?.duck_balance ?? 0) > 0 && (
                    <div className={`nav-rail-item-container ${location.pathname === '/bit-shift' ? 'active' : ''}`}>
                        <div className="nav-rail-indicator" />
                        <Link 
                            to="/bit-shift" 
                            className={`nav-rail-item ${location.pathname === '/bit-shift' ? 'active' : ''}`}
                            data-tooltip="BitShift"
                        >
                            <RefreshCw size={20} />
                        </Link>
                    </div>
                )}

                {Math.abs(user?.packets ?? 0) > 0.001 && (
                    <div className={`nav-rail-item-container ${location.pathname === '/shop' ? 'active' : ''}`}>
                        <div className="nav-rail-indicator" />
                        <Link 
                            to="/shop" 
                            className={`nav-rail-item ${location.pathname === '/shop' ? 'active' : ''}`}
                            data-tooltip="Reward Shop"
                        >
                            <ShoppingCart size={20} />
                        </Link>
                    </div>
                )}

                <div className={`nav-rail-item-container ${location.pathname === '/profile' ? 'active' : ''}`}>
                    <div className="nav-rail-indicator" />
                    <Link 
                        to="/profile" 
                        className={`nav-rail-item ${location.pathname === '/profile' ? 'active' : ''}`}
                        data-tooltip="Profile"
                    >
                        <User size={20} />
                    </Link>
                </div>
            </div>

            <div className="nav-rail-bottom">
                {user?.role === 'admin' && (
                    <div className={`nav-rail-item-container ${location.pathname.startsWith('/admin') ? 'active' : ''}`}>
                        <div className="nav-rail-indicator" />
                        <Link 
                            to="/admin" 
                            className={`nav-rail-item ${location.pathname.startsWith('/admin') ? 'active' : ''}`}
                            data-tooltip="Admin Panel"
                        >
                            <Shield size={20} />
                        </Link>
                    </div>
                )}

                <div className={`nav-rail-item-container ${location.pathname === '/settings' ? 'active' : ''}`}>
                    <div className="nav-rail-indicator" />
                    <Link 
                        to="/settings" 
                        className={`nav-rail-item ${location.pathname === '/settings' ? 'active' : ''}`}
                        data-tooltip="Settings"
                    >
                        <Settings size={20} />
                    </Link>
                </div>

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

export default DesktopNavRail;
