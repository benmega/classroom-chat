import React from 'react';
import { Link } from 'react-router-dom';
import { Home, User, Shield, FileCheck, RefreshCw, X, LogOut } from 'lucide-react';

const MobileSidebar = ({ user, isParent, isSidebarOpen, setSidebarOpen, handleLogout }) => {
    return (
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
    );
};

export default MobileSidebar;
