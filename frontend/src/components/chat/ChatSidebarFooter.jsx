import React from 'react';
import { Link } from 'react-router-dom';
import { 
    User as UserIcon, 
    Shield, 
    Award, 
    FileCheck, 
    Zap, 
    RefreshCw, 
    Disc, 
    MessageSquare,
    LogOut,
    ShoppingCart
} from 'lucide-react';

const ChatSidebarFooter = ({ user, onAction, onLogout }) => {
    return (
        <div className="chat-sidebar-footer mobile-only">
            <Link to="/profile" className="sidebar-footer-item" onClick={onAction}>
                <UserIcon size={18} /> Profile
            </Link>
            
            {user?.is_admin && (
                <Link to="/admin" className="sidebar-footer-item" onClick={onAction}>
                    <Shield size={18} /> Admin Panel
                </Link>
            )}
            
            <Link to="/achievements" className="sidebar-footer-item" onClick={onAction}>
                <Award size={18} /> Achievements
            </Link>
            

            
            <Link to="/submit-work" className="sidebar-footer-item" onClick={onAction}>
                <Zap size={18} /> Submit Work
            </Link>
            
            <Link to="/bit-shift" className="sidebar-footer-item" onClick={onAction}>
                <RefreshCw size={18} /> Bit Shift
            </Link>
            
            <Link to="/shop" className="sidebar-footer-item" style={{ color: '#facc15' }} onClick={onAction}>
                <ShoppingCart size={18} /> Packet Shop
            </Link>
            
            <a 
                href="https://benmega.github.io/screen-recorder/" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="sidebar-footer-item" 
                onClick={onAction}
            >
                <Disc size={18} /> Record
            </a>
            
            <Link to="/history" className="sidebar-footer-item" onClick={onAction}>
                <MessageSquare size={18} /> History
            </Link>
            
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
