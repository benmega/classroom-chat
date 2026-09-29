import React from 'react';
import { Link } from 'react-router-dom';
import { LogOut } from 'lucide-react';
import { getUserNavLinks } from '../../utils/navLinks';

const ChatSidebarFooter = ({ user, onAction, onLogout }) => {
    return (
        <div className="chat-sidebar-footer mobile-only">
            {getUserNavLinks(user?.is_admin).map(({ to, href, label, icon }) => {
                const Icon = icon;
                return href ? (
                    <a 
                        key={label}
                        href={href} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="sidebar-footer-item" 
                        onClick={onAction}
                    >
                        <Icon size={18} /> {label}
                    </a>
                ) : (
                    <Link key={label} to={to} className="sidebar-footer-item" onClick={onAction}>
                        <Icon size={18} /> {label}
                    </Link>
                );
            })}
            
            <button 
                onClick={onLogout} 
                className="sidebar-footer-item logout-btn" 
                style={{ 
                    borderTop: '1px solid var(--border-subtle)', 
                    marginTop: '8px', 
                    color: 'var(--error-color)', 
                    width: '100%', 
                    textAlign: 'left', 
                    background: 'none', 
                    border: 'none', 
                    cursor: 'pointer' 
                }}
            >
                <LogOut size={18} /> Logout
            </button>
        </div>
    );
};

export default ChatSidebarFooter;
