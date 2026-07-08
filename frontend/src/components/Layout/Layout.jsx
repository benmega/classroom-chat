import React from 'react';
import { Link } from 'react-router-dom';
import { 
    User, 
    Shield, 
    Award, 
    FileCheck, 
    MessageSquare, 
    LogOut,
    Package,
    Menu,
    X,
    Home,
    ShoppingCart,
    RefreshCw,
    Map,
    Settings
} from 'lucide-react';

import './Layout.css';
import UserSearch from '../common/UserSearch';
import DuckIcon from '../Icons/DuckIcon';
import Tutorial from '../common/Tutorial';
import HamburgerIcon from '../common/HamburgerIcon';

// Hooks
import { useLayout } from '../../hooks/useLayout';

const Layout = ({ children }) => {
    const {
        user,
        isAuthenticated,
        isDropdownOpen,
        setIsDropdownOpen,
        dropdownRef,
        isSidebarOpen,
        setSidebarOpen,
        toggleSidebar,
        toggleDropdown,
        handleLogout,
        isGuestPage,
        isChatPage,
        location,
        hamburgerProgress
    } = useLayout();

    const isParent = user?.role === 'parent';

    return (
        <div className="app-container">
            {isAuthenticated && <Tutorial />}
            
            {/* Parent Desktop Navigation Rail */}
            {isAuthenticated && isParent && (
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
            )}

            {/* Desktop Navigation Rail (Option B) */}
            {isAuthenticated && !isParent && (
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
                                <MessageSquare size={20} />
                            </Link>
                        </div>

                        <div className={`nav-rail-item-container ${location.pathname.startsWith('/submit-work') ? 'active' : ''}`}>
                            <div className="nav-rail-indicator" />
                            <Link 
                                to="/submit-work" 
                                className={`nav-rail-item ${location.pathname.startsWith('/submit-work') ? 'active' : ''}`}
                                data-tooltip="Submit Work"
                            >
                                <FileCheck size={20} />
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
                        {user?.is_admin && (
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
            )}

            <div className="main-layout-content">
                <header className={`${!isAuthenticated || isGuestPage ? 'guest-mode' : ''} ${isChatPage ? 'mobile-hidden' : ''}`}>
                <div className="header-content">
                    {isAuthenticated && !isParent && (
                        <button 
                            className="hamburger-toggle mobile-only" 
                            onClick={toggleSidebar}
                            aria-label="Toggle Sidebar"
                            aria-expanded={isSidebarOpen}
                        >
                            <Menu size={24} />
                        </button>
                    )}
                    <div id="logo-container" className="header-logo-wrap">
                        <Link to={isParent ? "/parent/dashboard" : "/chat"} className="logo-link">
                            <div className="logo-icon-wrapper">
                                <img src="/images/logo.ico" alt="Classroom Chat Logo" className="logo-img" />
                            </div>
                            <span className="logo-text">ClassroomChat</span>
                        </Link>
                    </div>

                    {isAuthenticated && !isParent && <UserSearch />}

                    <nav>
                        <ul>
                            {isAuthenticated && user && user.role !== 'parent' && (
                                <>
                                    <li className="nav-stat-item">
                                        <Link className="stat-badge ducks" to="/bit-shift" data-testid="nav-bit-shift">
                                            <DuckIcon size={20} className="stat-icon" color="var(--primary-color)" />
                                            <div className="stat-content">
                                                <span className="stat-label">Ducks</span>
                                                <span className="stat-value">
                                                    {(user.duck_balance ?? 0).toLocaleString(undefined, { 
                                                        minimumFractionDigits: 0, 
                                                        maximumFractionDigits: 3 
                                                    })}
                                                </span>
                                            </div>
                                        </Link>
                                    </li>

                                    {Math.abs(user.packets) > 0.001 && (
                                        <li className="nav-stat-item">
                                            <Link className="stat-badge packets" to="/shop">
                                                <Package size={20} className="stat-icon" />
                                                <div className="stat-content">
                                                    <span className="stat-label">Packets</span>
                                                    <span className="stat-value" style={{ color: user.packets < 0 ? 'var(--error-color, #ff4444)' : 'inherit' }}>{Number(user.packets || 0).toLocaleString(undefined, { 
                                                        minimumFractionDigits: 0, 
                                                        maximumFractionDigits: 3 
                                                    })}</span>
                                                </div>
                                            </Link>
                                        </li>
                                    )}
                                </>
                            )}

                            {isAuthenticated ? (
                                <li className="profile-menu" ref={dropdownRef}>
                                    <button 
                                        className="profile-toggle" 
                                        onClick={(e) => {
                                            // Prevent double-click race condition
                                            if (e.detail > 1) return;
                                            toggleDropdown();
                                        }}
                                        aria-haspopup="true" 
                                        aria-expanded={isDropdownOpen}
                                        title="Account"
                                        data-testid="profile-toggle"
                                    >
                                        <span className="profile-icon">
                                            <HamburgerIcon progress={user?.role === 'student' ? hamburgerProgress : 1} size={20} />
                                        </span>
                                    </button>
                                    <ul className={`dropdown-menu ${isDropdownOpen ? 'show' : ''}`}>
                                        {user?.role !== 'parent' && (
                                            <>
                                                <li className="mobile-only-stat mobile-only">
                                                    <Link to="/bit-shift" onClick={() => setIsDropdownOpen(false)} className="dropdown-stat-link">
                                                        <DuckIcon size={20} />
                                                        <div className="dropdown-stat-info">
                                                            <span className="dropdown-stat-label">Ducks</span>
                                                            <span className="dropdown-stat-value">
                                                                {(user.duck_balance ?? 0).toLocaleString(undefined, { 
                                                                    minimumFractionDigits: 0, 
                                                                    maximumFractionDigits: 3 
                                                                })}
                                                            </span>
                                                        </div>
                                                    </Link>
                                                </li>
                                                {Math.abs(user.packets) > 0.001 && (
                                                    <li className="mobile-only-stat mobile-only">
                                                        <Link to="/shop" onClick={() => setIsDropdownOpen(false)} className="dropdown-stat-link packets" style={{ textDecoration: 'none' }}>
                                                            <Package size={20} />
                                                            <div className="dropdown-stat-info">
                                                                <span className="dropdown-stat-label">Packets</span>
                                                                <span className="dropdown-stat-value" style={{ color: user.packets < 0 ? 'var(--error-color, #ff4444)' : 'inherit' }}>
                                                                    {Number(user.packets || 0).toLocaleString(undefined, { 
                                                                        minimumFractionDigits: 0, 
                                                                        maximumFractionDigits: 3 
                                                                    })}
                                                                </span>
                                                            </div>
                                                        </Link>
                                                    </li>
                                                )}
                                            </>
                                        )}
                                        {user?.role !== 'parent' && <li className="mobile-only-stat mobile-only dropdown-divider"></li>}
                                        {!isParent && (
                                            <li><Link to="/profile" onClick={() => setIsDropdownOpen(false)} data-testid="nav-profile"><User size={18} /> Profile</Link></li>
                                        )}
                                        {user?.is_admin && (
                                            <li><Link to="/admin" onClick={() => setIsDropdownOpen(false)}><Shield size={18} /> Admin Panel</Link></li>
                                        )}
                                        {!isParent && (
                                            <>
                                                <li><Link to="/submit-work" onClick={() => setIsDropdownOpen(false)}><FileCheck size={18} /> Submit Work</Link></li>
                                                {(user?.duck_balance ?? 0) > 0 && (
                                                    <li><Link to="/bit-shift" onClick={() => setIsDropdownOpen(false)}><RefreshCw size={18} /> Bit Shift</Link></li>
                                                )}
                                            </>
                                        )}
                                        <li><button onClick={() => { handleLogout(); setIsDropdownOpen(false); }} className="logout-btn"><LogOut size={18} /> Logout</button></li>
                                    </ul>
                                </li>
                            ) : (
                                !isGuestPage && (
                                    <li><Link className="nav-button" to="/login">Login</Link></li>
                                )
                            )}
                        </ul>
                    </nav>
                </div>
            </header>

            <main key={location.pathname} className={`${isChatPage ? 'main-full' : ''} animate-page-entry`}>
                {children}
            </main>
            
            {/* Mobile Navigation Sidebar */}
            {!isChatPage && !isParent && (
                <>
                    <div 
                        className={`mobile-overlay ${isSidebarOpen ? 'show' : ''}`} 
                        onClick={() => setSidebarOpen(false)}
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
                                <li><Link to={isParent ? "/parent/dashboard" : "/"} onClick={() => setSidebarOpen(false)}><Home size={18} /> {isParent ? 'Dashboard' : 'Chat'}</Link></li>
                                {!isParent && (
                                    <li><Link to="/profile" onClick={() => setSidebarOpen(false)}><User size={18} /> Profile</Link></li>
                                )}
                                {user?.is_admin && (
                                    <li><Link to="/admin" onClick={() => setSidebarOpen(false)}><Shield size={18} /> Admin Panel</Link></li>
                                )}
                                {!isParent && (
                                    <>
                                        <li><Link to="/submit-work" onClick={() => setSidebarOpen(false)}><FileCheck size={18} /> Submit Work</Link></li>
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
            )}

            </div>
        </div>
    );
};

export default Layout;
