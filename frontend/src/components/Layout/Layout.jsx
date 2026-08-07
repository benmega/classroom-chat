import React from 'react';
import { Link } from 'react-router-dom';
import { Menu, Package, Archive } from 'lucide-react';

import './Layout.css';
import UserSearch from '../common/UserSearch';
import DuckIcon from '../Icons/DuckIcon';
import Tutorial from '../common/Tutorial';
import HamburgerIcon from '../common/HamburgerIcon';

// Sub-components
import ParentNavRail from './ParentNavRail';
import DesktopNavRail from './DesktopNavRail';
import MobileSidebar from './MobileSidebar';

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
        hamburgerProgress,
        activityUnreadCount
    } = useLayout();

    const isParent = user?.role === 'parent';

    return (
        <div className="app-container">
            {isAuthenticated && <Tutorial />}
            
            {/* Desktop Navigation Rails */}
            {isAuthenticated && isParent && (
                <ParentNavRail location={location} handleLogout={handleLogout} />
            )}

            {isAuthenticated && user && user.role !== 'parent' && (
                <DesktopNavRail user={user} location={location} handleLogout={handleLogout} />
            )}

            <div className="main-layout-content">
                <header className={`${!isAuthenticated || isGuestPage ? 'guest-mode' : ''}`}>
                    <div className="header-content">
                        {isAuthenticated && user && user.role !== 'parent' && (
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

                        {isAuthenticated && user && user.role !== 'parent' && <UserSearch />}

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
                                                        <span className={`stat-value ${user.packets < 0 ? 'text-error' : ''}`}>
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

                                {isAuthenticated && user && user.role !== 'parent' && (
                                    <li className="nav-stat-item">
                                        <Link className="stat-badge drawer" to="/profile" title="View Profile" data-testid="header-drawer">
                                            <Archive size={20} className="stat-icon" />
                                            <div className="stat-content">
                                                <span className="stat-label">Drawer</span>
                                                <span className="stat-value">{user.drawer || 'N/A'}</span>
                                            </div>
                                        </Link>
                                    </li>
                                )}

                                {isAuthenticated ? (
                                    <li className="profile-menu" ref={dropdownRef}>
                                        <button 
                                            className="profile-toggle" 
                                            onClick={(e) => {
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
                                            <li className="dropdown-user-header">
                                                {user?.role === 'parent' ? (
                                                    <div className="dropdown-user-link">
                                                        <span className="dropdown-user-name">{user.nickname || user.username}</span>
                                                        <span className="dropdown-user-handle">@{user.username}</span>
                                                    </div>
                                                ) : (
                                                    <Link to="/profile" onClick={() => setIsDropdownOpen(false)} className="dropdown-user-link">
                                                        <span className="dropdown-user-name">{user.nickname || user.username}</span>
                                                        <span className="dropdown-user-handle">@{user.username}</span>
                                                    </Link>
                                                )}
                                            </li>
                                            <li className="dropdown-divider"></li>

                                            {user?.role !== 'parent' && (
                                                <>
                                                    {user.drawer && (
                                                        <li className="mobile-only-stat mobile-only">
                                                            <div className="dropdown-stat-link drawer">
                                                                <Archive size={20} />
                                                                <div className="dropdown-stat-info">
                                                                    <span className="dropdown-stat-label">Drawer</span>
                                                                    <span className="dropdown-stat-value">{user.drawer}</span>
                                                                </div>
                                                            </div>
                                                        </li>
                                                    )}
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
                                                            <Link to="/shop" onClick={() => setIsDropdownOpen(false)} className="dropdown-stat-link packets">
                                                                <Package size={20} />
                                                                <div className="dropdown-stat-info">
                                                                    <span className="dropdown-stat-label">Packets</span>
                                                                    <span className={`dropdown-stat-value ${user.packets < 0 ? 'text-error' : ''}`}>
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
                                            {user?.role !== 'parent' && (
                                                <li>
                                                    <Link to="/profile" onClick={() => setIsDropdownOpen(false)} data-testid="nav-profile">
                                                        <span className="flex items-center gap-2">Profile</span>
                                                    </Link>
                                                </li>
                                            )}
                                            {user?.role === 'admin' && (
                                                <li><Link to="/admin" onClick={() => setIsDropdownOpen(false)}>Admin Panel</Link></li>
                                            )}
                                            {!isParent && (
                                                <>
                                                    <li><Link to="/submit-work" onClick={() => setIsDropdownOpen(false)}>Submit Work</Link></li>
                                                    <li>
                                                        <Link to="/activity" onClick={() => setIsDropdownOpen(false)}>
                                                            Activity
                                                            {activityUnreadCount > 0 && <span className="nav-unread-badge">{activityUnreadCount}</span>}
                                                        </Link>
                                                    </li>
                                                    {(user?.duck_balance ?? 0) > 0 && (
                                                        <li><Link to="/bit-shift" onClick={() => setIsDropdownOpen(false)}>Bit Shift</Link></li>
                                                    )}
                                                </>
                                            )}
                                            <li><button onClick={() => { handleLogout(); setIsDropdownOpen(false); }} className="logout-btn">Logout</button></li>
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
                {user && user.role !== 'parent' && (
                    <MobileSidebar 
                        user={user} 
                        isParent={isParent} 
                        isSidebarOpen={isSidebarOpen} 
                        setSidebarOpen={setSidebarOpen} 
                        handleLogout={handleLogout} 
                    />
                )}
            </div>
        </div>
    );
};

export default Layout;
