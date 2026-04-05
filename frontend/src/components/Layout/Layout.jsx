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
    LogOut 
} from 'lucide-react';
import './Layout.css';

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
                        <img src="/static/images/logo.ico" alt="Classroom Chat Logo" />
                    </Link>
                </div>

                <nav>
                    <ul>
                        {isAuthenticated && user && (
                            <div className="user-info">
                                <li>
                                    <Link className="digital-ducks" to="/bit-shift">
                                        <span className="label">Ducks:</span>
                                        <span className="count">{user.duck_balance}</span>
                                    </Link>
                                </li>

                                {user.packets > 0.001 && (
                                    <li>
                                        <div className="digital-ducks">
                                            <span className="label">Packets:</span>
                                            <span className="count">{Number(user.packets).toFixed(5)}</span>
                                        </div>
                                    </li>
                                )}
                            </div>
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
                                    <img 
                                        src={user?.profile_picture ? `/user/profile_pictures/${user.profile_picture}` : "/static/images/Default_pfp.jpg"} 
                                        alt="Profile Picture"
                                        className="profile-menu_img"
                                    />
                                    <span className="profile-icon">
                                        <User size={18} strokeWidth={2} />
                                    </span>
                                </button>
                                <ul className={`dropdown-menu ${isDropdownOpen ? 'show' : ''}`}>
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
