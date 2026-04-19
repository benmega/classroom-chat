import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import useAuthStore from '../../store/useAuthStore';
import { 
    User, 
    Shield, 
    Award, 
    FileCheck, 
    Zap, 
    RefreshCw, 
    Disc, 
    MessageSquare, 
    LogOut,
    Package,
    Menu,
    X
} from 'lucide-react';
import useSidebar from '../../hooks/useSidebar';

import './Layout.css';
import SmartImage from '../common/SmartImage';
import UserSearch from '../common/UserSearch';
import DuckIcon from '../common/DuckIcon';

const Layout = ({ children }) => {
    const { user, logout, isAuthenticated } = useAuthStore();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();
    const location = useLocation();
    const { isSidebarOpen, toggleSidebar, setSidebarOpen } = useSidebar();


    const toggleDropdown = (e) => {
        e.stopPropagation();
        setIsDropdownOpen(!isDropdownOpen);
    };

    // --- Duck Balance Tracking for Quack Sound ---
    const prevDuckBalanceRef = useRef(user?.duck_balance);

    useEffect(() => {
        // If user logs out or isn't there, reset ref and return
        if (!user || user.duck_balance === undefined) {
            prevDuckBalanceRef.current = user?.duck_balance;
            return;
        }

        // Only quack if we had a previous balance (don't quack on initial load)
        if (prevDuckBalanceRef.current !== undefined && prevDuckBalanceRef.current !== null) {
            const currentDucks = Math.floor(user.duck_balance || 0);
            const prevDucks = Math.floor(prevDuckBalanceRef.current || 0);
            const diff = currentDucks - prevDucks;

            if (diff > 0) {
                // Play quacks with a slight overlap (60ms delay)
                // Cap at 100 to avoid major performance/noise issues, 
                // matching the user's example of "quack 100 times".
                const quackCount = Math.min(diff, 100);
                let quacksPlayed = 0;
                
                const quackInterval = setInterval(() => {
                    if (quacksPlayed >= quackCount) {
                        clearInterval(quackInterval);
                        return;
                    }
                    const audio = new Audio('/static/sounds/quack.mp3');
                    audio.play().catch(err => console.warn('Quack autoplay prevented:', err));
                    quacksPlayed++;
                }, 60); 
            }
        }
        
        // Update the ref for next comparison
        prevDuckBalanceRef.current = user.duck_balance;
    }, [user?.duck_balance, user]);
    // --- Heartbeat ---
    useEffect(() => {
        if (!isAuthenticated || !user) return;

        const HEARTBEAT_INTERVAL = 30000; // 30 seconds
        
        const sendHeartbeat = async () => {
            try {
                // We use the imported client or a direct fetch if preferred.
                // client from useAuthStore (via useAuthStore.js) is preferred if available.
                // Since this file doesn't import client directly, I'll use fetch or import it if I can.
                // But wait, the file already imports useAuthStore.
                // I'll use a direct fetch for simplicity if I don't want to mess with imports,
                // but let's check if I can import client.
                await fetch('/session/heartbeat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                });
            } catch (err) {
                console.error('Heartbeat failed:', err);
            }
        };

        // Send initial heartbeat
        sendHeartbeat();

        const interval = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);
        return () => clearInterval(interval);
    }, [isAuthenticated, user]);
    // ----------------------------------------------

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    const isGuestPage = ['/login', '/signup'].includes(location.pathname);
    const isChatPage = location.pathname === '/' || location.pathname.startsWith('/chat');

    return (
        <div className="app-container">
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
                                        <Link className="stat-badge ducks" to="/bit-shift">
                                            <DuckIcon size={24} className="stat-icon" color="var(--primary-color)" />
                                            <div className="stat-content">
                                                <span className="stat-label">Ducks</span>
                                                <span className="stat-value">
                                                    {user.duck_balance?.toLocaleString(undefined, { 
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
                                                        maximumFractionDigits: 5 
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
                                    >
                                        <SmartImage 
                                            src={user?.profile_picture ? `/user/profile_pictures/${user.profile_picture}` : ''} 
                                            alt="Profile Picture"
                                            className="profile-menu_img"
                                            fallbackType="avatar"
                                        />
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
                                                        {user.duck_balance?.toLocaleString(undefined, { 
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
                                                                maximumFractionDigits: 5 
                                                            })}
                                                        </span>
                                                    </div>
                                                </div>
                                            </li>
                                        )}
                                        <li className="mobile-only-stat dropdown-divider"></li>
                                        <li><Link to="/profile" onClick={() => setIsDropdownOpen(false)}><User size={18} /> Profile</Link></li>
                                        {user?.is_admin && (
                                            <li><Link to="/admin" onClick={() => setIsDropdownOpen(false)}><Shield size={18} /> Admin Panel</Link></li>
                                        )}
                                        <li><Link to="/achievements" onClick={() => setIsDropdownOpen(false)}><Award size={18} /> Achievements</Link></li>
                                        <li><Link to="/submit-certificate" onClick={() => setIsDropdownOpen(false)}><FileCheck size={18} /> Certificate</Link></li>
                                        <li><Link to="/submit-challenge" onClick={() => setIsDropdownOpen(false)}><Zap size={18} /> Challenge</Link></li>
                                        <li><Link to="/bit-shift" onClick={() => setIsDropdownOpen(false)}><RefreshCw size={18} /> Bit Shift</Link></li>
                                        <li><a href="https://benmega.github.io/screen-recorder/" target="_blank" rel="noopener noreferrer" onClick={() => setIsDropdownOpen(false)}><Disc size={18} /> Record</a></li>
                                        <li><Link to="/history" onClick={() => setIsDropdownOpen(false)}><MessageSquare size={18} /> History</Link></li>
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

            <main className={isChatPage ? 'main-full' : ''}>
                {children}
            </main>
            
            {/* Mobile Navigation Sidebar */}
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
                        <li><Link to="/profile" onClick={() => setSidebarOpen(false)}><User size={18} /> Profile</Link></li>
                        {user?.is_admin && (
                            <li><Link to="/admin" onClick={() => setSidebarOpen(false)}><Shield size={18} /> Admin Panel</Link></li>
                        )}
                        <li><Link to="/achievements" onClick={() => setSidebarOpen(false)}><Award size={18} /> Achievements</Link></li>
                        <li><Link to="/submit-certificate" onClick={() => setSidebarOpen(false)}><FileCheck size={18} /> Certificate</Link></li>
                        <li><Link to="/submit-challenge" onClick={() => setSidebarOpen(false)}><Zap size={18} /> Challenge</Link></li>
                        <li><Link to="/bit-shift" onClick={() => setSidebarOpen(false)}><RefreshCw size={18} /> Bit Shift</Link></li>
                        <li><a href="https://benmega.github.io/screen-recorder/" target="_blank" rel="noopener noreferrer" onClick={() => setSidebarOpen(false)}><Disc size={18} /> Record</a></li>
                        <li><Link to="/history" onClick={() => setSidebarOpen(false)}><MessageSquare size={18} /> History</Link></li>
                    </ul>
                </nav>

                <div className="sidebar-footer">
                    <button onClick={() => { handleLogout(); setSidebarOpen(false); }} className="sidebar-logout">
                        <LogOut size={18} /> Logout
                    </button>
                </div>
            </aside>

            <footer>
                <p>&copy; {new Date().getFullYear()} Classroom Chat. All Rights Reserved.</p>
            </footer>
        </div>
    );
};

export default Layout;
