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
    Package
} from 'lucide-react';
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

    const toggleDropdown = (e) => {
        e.stopPropagation();
        setIsDropdownOpen(!isDropdownOpen);
    };

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

    return (
        <>
            <header className={!isAuthenticated || isGuestPage ? 'guest-mode' : ''}>
                <div id="logo-container">
                    <Link to="/" className="logo">
                        <img src="/images/logo.svg" alt="Classroom Chat Logo" />
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
                                            <span><strong>{user.duck_balance}</strong> Ducks</span>
                                        </Link>
                                    </li>
                                    {user.packets > 0.001 && (
                                        <li className="mobile-only-stat">
                                            <div className="dropdown-stat-link packets">
                                                <Package size={20} />
                                                <span><strong>{Number(user.packets).toFixed(5)}</strong> Packets</span>
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
            </header>

            <main>
                {children}
            </main>

            <footer>
                <p>&copy; {new Date().getFullYear()} Classroom Chat. All Rights Reserved.</p>
            </footer>
        </>
    );
};

export default Layout;
