import React from 'react';
import { ChevronLeft, Menu } from 'lucide-react';
import useSidebar from '../../hooks/useSidebar';
import './AdminPageHeader.css';

const AdminPageHeader = ({ title, description, children }) => {
    const { toggleSidebar } = useSidebar();

    return (
        <header className="page-header standardized">
            <div className="header-left">
                <button className="hamburger-toggle mobile-only" onClick={toggleSidebar}>
                    <Menu size={24} />
                </button>
                <div className="title-stack">
                    <h1>{title}</h1>
                    {description && <p>{description}</p>}
                </div>
            </div>
            {children && (
                <div className="header-actions">
                    {children}
                </div>
            )}
        </header>
    );
};

export default AdminPageHeader;
