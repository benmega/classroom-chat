import React from 'react';
import { Link } from 'react-router-dom';
import { 
    User, 
    Shield, 
    Award, 
    FileCheck, 
    Zap, 
    MessageSquare, 
    LogOut,
    Package,
    Menu,
    X,
    Home,
    ShoppingCart
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
                        <Link to="/chat" className="logo-link">
                            <div className="logo-icon-wrapper">
                                <img src="/images/logo.ico" alt="Classroom Chat Logo" className="logo-img" />
                            </div>
                            <span className="logo-text">ClassroomChat</span>
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
                                            <Link className="stat-badge packets" to="/shop">
                                                <Package size={20} className="stat-icon" />
                                                <div className="stat-content">
                                                    <span className="stat-label">Packets</span>
                                                    <span className="stat-value">{Number(user.packets).toLocaleString(undefined, { 
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
                                            <HamburgerIcon progress={hamburgerProgress} size={20} />
                                        </span>
                                    </button>
                                    <ul className={`dropdown-menu ${isDropdownOpen ? 'show' : ''}`}>
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
                                        {user.packets > 0.001 && (
                                            <li className="mobile-only-stat mobile-only">
<<<<<<< Updated upstream
                                                <Link to="/shop" onClick={() => setIsDropdownOpen(false)} className="dropdown-stat-link packets">
=======
                                                <div className="dropdown-stat-link packets">
>>>>>>> Stashed changes
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
                                                </Link>
                                            </li>
                                        )}
                                        <li className="mobile-only-stat mobile-only dropdown-divider"></li>
                                        <li><Link to="/profile" onClick={() => setIsDropdownOpen(false)} data-testid="nav-profile"><User size={18} /> Profile</Link></li>
                                        {user?.is_admin && (
                                            <li><Link to="/admin" onClick={() => setIsDropdownOpen(false)}><Shield size={18} /> Admin Panel</Link></li>
                                        )}
                                        <li><Link to="/submit-work" onClick={() => setIsDropdownOpen(false)}><FileCheck size={18} /> Submit Work</Link></li>
<<<<<<< Updated upstream
=======
                                        <li><Link to="/bit-shift" onClick={() => setIsDropdownOpen(false)}><RefreshCw size={18} /> Bit Shift</Link></li>
                                        <li><a href="https://benmega.github.io/screen-recorder/" target="_blank" rel="noopener noreferrer" onClick={() => setIsDropdownOpen(false)}><Disc size={18} /> Record</a></li>
>>>>>>> Stashed changes
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
                                <li><Link to="/" onClick={() => setSidebarOpen(false)}><Home size={18} /> Chat</Link></li>
                                <li><Link to="/profile" onClick={() => setSidebarOpen(false)}><User size={18} /> Profile</Link></li>
                                {user?.is_admin && (
                                    <li><Link to="/admin" onClick={() => setSidebarOpen(false)}><Shield size={18} /> Admin Panel</Link></li>
                                )}
                                <li><Link to="/submit-work" onClick={() => setSidebarOpen(false)}><FileCheck size={18} /> Submit Work</Link></li>
<<<<<<< Updated upstream
=======
                                <li><Link to="/bit-shift" onClick={() => setSidebarOpen(false)}><RefreshCw size={18} /> Bit Shift</Link></li>
                                <li><a href="https://benmega.github.io/screen-recorder/" target="_blank" rel="noopener noreferrer" onClick={() => setSidebarOpen(false)}><Disc size={18} /> Record</a></li>
>>>>>>> Stashed changes
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

<<<<<<< Updated upstream

=======
>>>>>>> Stashed changes
        </div>
    );
};

export default Layout;
