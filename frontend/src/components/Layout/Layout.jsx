import React, { useState, useEffect, useRef, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { Menu, Package, HelpCircle, User } from 'lucide-react';

import './Layout.css';
import UserSearch from '../common/UserSearch';
import DuckIcon from '../Icons/DuckIcon';
import Tutorial from '../common/Tutorial';
import HamburgerIcon from '../common/HamburgerIcon';
import ContactTeacherModal from '../common/ContactTeacherModal';
import ContentLoader from '../common/ContentLoader';
import SkipLink from '../common/SkipLink';

// Sub-components
import ParentNavRail from './ParentNavRail';
import DesktopNavRail from './DesktopNavRail';
import MobileSidebar from './MobileSidebar';
import { MAIN_CONTENT_ID, MOBILE_SIDEBAR_ID } from './layoutIds';

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
    const [isContactModalOpen, setIsContactModalOpen] = useState(false);

    // <main> is remounted for every path (key below), so a route change would leave a keyboard or screen reader
    // user on a link that no longer exists. Move focus to the new page instead, but not on the first render,
    // and not when the page already put focus inside itself (an autofocused field).
    const mainRef = useRef(null);
    const lastPathname = useRef(location.pathname);
    useEffect(() => {
        if (lastPathname.current === location.pathname) return;
        lastPathname.current = location.pathname;
        const main = mainRef.current;
        if (main && !main.contains(document.activeElement)) main.focus({ preventScroll: true });
    }, [location.pathname]);

    return (
        <div className="app-container">
            <SkipLink targetRef={mainRef} />
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
                                aria-controls={MOBILE_SIDEBAR_ID}
                                aria-expanded={isSidebarOpen}
                            >
                                <Menu size={24} />
                            </button>
                        )}
                        <div id="logo-container" className="header-logo-wrap">
                            <Link to={isParent ? "/parent/dashboard" : "/chat"} className="logo-link">
                                <div className="logo-icon-wrapper">
                                    <img src="/images/logo.png" alt="Classroom Chat Logo" className="logo-img" />
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

                                        {Math.abs(user.packets) > 0.00001 && (
                                            <li className="nav-stat-item">
                                                <Link className="stat-badge packets" to="/shop">
                                                    <Package size={20} className="stat-icon" />
                                                    <div className="stat-content">
                                                        <span className="stat-label">Packets</span>
                                                        <span className={`stat-value ${user.packets < 0 ? 'text-error' : ''}`}>
                                                            {Number(user.packets || 0).toLocaleString(undefined, { 
                                                                minimumFractionDigits: 0, 
                                                                maximumFractionDigits: 4 
                                                            })}
                                                        </span>
                                                    </div>
                                                </Link>
                                            </li>
                                        )}
                                    </>
                                )}

                                {isAuthenticated && isParent && (
                                    <li className="nav-stat-item">
                                        <button
                                            className="stat-badge help"
                                            title="Message the teacher"
                                            onClick={() => setIsContactModalOpen(true)}
                                            style={{ cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
                                        >
                                            <HelpCircle size={20} className="stat-icon" />
                                            <div className="stat-content">
                                                <span className="stat-label">Support</span>
                                                <span className="stat-value">Help</span>
                                            </div>
                                        </button>
                                    </li>
                                )}

                                {!isAuthenticated && !isGuestPage && (
                                    <li><Link className="nav-button" to="/login">Login</Link></li>
                                )}
                            </ul>
                        </nav>
                    </div>
                </header>

                <main key={location.pathname} ref={mainRef} id={MAIN_CONTENT_ID} tabIndex={-1} className={`${isChatPage ? 'main-full' : ''} animate-page-entry`}>
                    <Suspense fallback={<ContentLoader />}>
                        {children}
                    </Suspense>
                </main>
                
                {/* Mobile Navigation Sidebar — all authenticated users */}
                {user && (
                    <MobileSidebar 
                        user={user} 
                        isParent={isParent} 
                        isSidebarOpen={isSidebarOpen} 
                        setSidebarOpen={setSidebarOpen} 
                        handleLogout={handleLogout} 
                        onContactTeacher={() => setIsContactModalOpen(true)}
                    />
                )}
            </div>

            {/* Contact Teacher Modal — parent users only */}
            {isParent && (
                <ContactTeacherModal
                    isOpen={isContactModalOpen}
                    onClose={() => setIsContactModalOpen(false)}
                />
            )}
        </div>
    );
};

export default Layout;
