import React from 'react';
import { Link } from 'react-router-dom';
import { Menu, Package, Archive, HelpCircle, User } from 'lucide-react';

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
        isSidebarOpen,
        setSidebarOpen,
        toggleSidebar,
        handleLogout,
        isGuestPage,
        isChatPage,
        location
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
                        {isAuthenticated && user && (
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

                        {isAuthenticated && user && <UserSearch />}

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

                                {isAuthenticated && isParent && (
                                    <li className="nav-stat-item">
                                        <div className="stat-badge help" title="Parent Help" style={{ cursor: 'help' }}>
                                            <HelpCircle size={20} className="stat-icon" />
                                            <div className="stat-content">
                                                <span className="stat-label">Support</span>
                                                <span className="stat-value">Help</span>
                                            </div>
                                        </div>
                                    </li>
                                )}

                                {!isAuthenticated && !isGuestPage && (
                                    <li><Link className="nav-button" to="/login">Login</Link></li>
                                )}
                            </ul>
                        </nav>
                    </div>
                </header>

                <main key={location.pathname} className={`${isChatPage ? 'main-full' : ''} animate-page-entry`}>
                    {children}
                </main>
                
                {/* Mobile Navigation Sidebar — all authenticated users */}
                {user && (
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
