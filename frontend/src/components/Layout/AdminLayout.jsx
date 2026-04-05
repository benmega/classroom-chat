import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Home, LogOut } from 'lucide-react';
import useAuthStore from '../../store/useAuthStore';
import './AdminLayout.css';

const AdminLayout = ({ children }) => {
    const { user, logout, isAuthenticated } = useAuthStore();
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();

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

    if (!isAuthenticated || !user?.is_admin) {
        return (
            <div style={{ padding: '50px', textAlign: 'center' }}>
                <h1>Access Denied</h1>
                <p>You do not have permission to view this page.</p>
                <Link to="/">Go Home</Link>
            </div>
        );
    }

    return (
        <div className="admin-wrapper">
            <header className="admin-header">
                <div className="header-container">
                    <nav>
                        <Link className="navbar-brand" to="/admin">
                            Admin Dashboard
                        </Link>

                        <div className="nav-item dropdown" ref={dropdownRef}>
                            <button 
                                className="profile-toggle" 
                                onClick={toggleDropdown}
                                style={{ background: 'transparent', border: 'none', padding: 0 }}
                                aria-haspopup="true" 
                                aria-expanded={isDropdownOpen}
                            >
                                <img 
                                    src={user?.profile_picture ? `/user/profile_pictures/${user.profile_picture}` : "/static/images/Default_pfp.jpg"} 
                                    alt="Profile" 
                                    className="profile-menu_img" 
                                />
                            </button>
                            <ul className={`dropdown-menu ${isDropdownOpen ? 'show' : ''}`}>
                                <li><Link className="dropdown-item" to="/admin/pending-trades">Pending Trades</Link></li>
                                <li><Link className="dropdown-item" to="/admin/projects">Manage Projects</Link></li>
                                <li><Link className="dropdown-item" to="/admin/add-achievement">Add Achievement</Link></li>
                                <li><Link className="dropdown-item" to="/admin/certificates">Certificates</Link></li>
                                <li><Link className="dropdown-item" to="/admin/documents">Documents</Link></li>
                                <li><Link className="dropdown-item" to="/admin/advanced">Advanced Panel</Link></li>
                                <div className="dropdown-divider"></div>
                                <li><Link className="dropdown-item" to="/"><Home size={18} /> Back to Site</Link></li>
                                <div className="dropdown-divider"></div>
                                <li><a className="dropdown-item" onClick={handleLogout} style={{ cursor: 'pointer' }}><LogOut size={18} /> Logout</a></li>
                            </ul>
                        </div>
                    </nav>
                </div>
            </header>

            <main className="admin-main">
                {children}
            </main>

            <footer className="admin-footer">
                <p>&copy; {new Date().getFullYear()} Classroom Chat Admin. All Rights Reserved.</p>
            </footer>
        </div>
    );
};

export default AdminLayout;
