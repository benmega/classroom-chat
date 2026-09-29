import React from 'react';
import { Link } from 'react-router-dom';
import { 
    User, 
    LogOut,
    Package,
    Menu,
    X
} from 'lucide-react';

import './Layout.css';
import UserSearch from '../common/UserSearch';
import DuckIcon from '../Icons/DuckIcon';
import Tutorial from '../common/Tutorial';

// Hooks
import { useLayout } from '../../hooks/useLayout';
import { getUserNavLinks } from '../../utils/navLinks';

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
        location
    } = useLayout();

    return (
        <div className="app-container">
            {isAuthenticated && <Tutorial />}
            <header className={`${!isAuthenticated || isGuestPage ? 'guest-mode' : ''} ${isChatPage ? 'mobile-hidden' : ''}`}>
                <div className="header-content">
                    {isAuthenticated && (
                        <button 
                            className="hamburger-toggle mobile-only" 
                            onClick={toggleSidebar}
                            aria-label="Toggle Sidebar"
                            aria-expanded={isSidebarOpen}
                        >
                            <Menu size={24} />
                        </button>
                    )}
                    <div id="logo-container">
                        <Link to="/" className="logo">
                            <img src="/images/logo.ico" alt="Classroom Chat Logo" />
                        </Link>
                    </div>

                    {isAuthenticated && <UserSearch />}

                    <nav>
                        <ul>
                            {isAuthenticated && user && (
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

                                    {user.packets > 0.001 && (
                                        <li className="nav-stat-item">
                                            <div className="stat-badge packets">
                                                <Package size={20} className="stat-icon" />
                                                <div className="stat-content">
                                                    <span className="stat-label">Packets</span>
                                                    <span className="stat-value">{Number(user.packets).toLocaleString(undefined, { 
                                                        minimumFractionDigits: 0, 
                                                        maximumFractionDigits: 3 
                                                    })}</span>
                                                </div>
                                            </div>
                                        </li>
                                    )}
                                </>
                            )}

                            {isAuthenticated ? (
                                <li className="profile-menu" ref={dropdownRef}>
                                    <button 
                                        className="profile-toggle" 
                                        onClick={toggleDropdown}
                                        aria-haspopup="true" 
                                        aria-expanded={isDropdownOpen}
                                        title="Account"
                                        data-testid="profile-toggle"
                                    >
                                        <span className="profile-icon">
                                            <User size={18} strokeWidth={2} />
                                        </span>
                                    </button>
                                    <ul className={`dropdown-menu ${isDropdownOpen ? 'show' : ''}`}>
                                        <li className="mobile-only-stat">
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
                                        {user.packets > 0.001 && (
                                            <li className="mobile-only-stat">
                                                <div className="dropdown-stat-link packets">
                                                    <Package size={20} />
                                                    <div className="dropdown-stat-info">
                                                        <span className="dropdown-stat-label">Packets</span>
                                                        <span className="dropdown-stat-value">
                                                            {Number(user.packets).toLocaleString(undefined, { 
                                                                minimumFractionDigits: 0, 
                                                                maximumFractionDigits: 3 
                                                            })}
                                                        </span>
                                                    </div>
                                                </div>
                                            </li>
                                        )}
                                        <li className="mobile-only-stat dropdown-divider"></li>
                                        {getUserNavLinks(user?.is_admin).map(({ to, href, label, icon, testId }) => {
                                            const Icon = icon;
                                            return (
                                                <li key={label}>
                                                    {href ? (
                                                        <a href={href} target="_blank" rel="noopener noreferrer" onClick={() => setIsDropdownOpen(false)}><Icon size={18} /> {label}</a>
                                                    ) : (
                                                        <Link to={to} onClick={() => setIsDropdownOpen(false)} data-testid={testId}><Icon size={18} /> {label}</Link>
                                                    )}
                                                </li>
                                            );
                                        })}
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
            {!isChatPage && (
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
                                {getUserNavLinks(user?.is_admin).map(({ to, href, label, icon }) => {
                                    const Icon = icon;
                                    return (
                                        <li key={label}>
                                            {href ? (
                                                <a href={href} target="_blank" rel="noopener noreferrer" onClick={() => setSidebarOpen(false)}><Icon size={18} /> {label}</a>
                                            ) : (
                                                <Link to={to} onClick={() => setSidebarOpen(false)}><Icon size={18} /> {label}</Link>
                                            )}
                                        </li>
                                    );
                                })}
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

            <footer>
                <p>&copy; {new Date().getFullYear()} Classroom Chat. All Rights Reserved.</p>
            </footer>
        </div>
    );
};

export default Layout;
