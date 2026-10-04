import React from 'react';
import { Menu } from 'lucide-react';
import useSidebar from '../../hooks/useSidebar';
import './AdminPageHeader.css';

// Titles only, 1-2 words. No description/subtitle prop -- put explanatory text in comments or docs, not the UI.
const AdminPageHeader = ({ title, children }) => {
    const { toggleSidebar, isSidebarOpen } = useSidebar();

    return (
        <header className="page-header standardized">
            <div className="header-left">
                <button
                    type="button"
                    className="hamburger-toggle mobile-only"
                    onClick={toggleSidebar}
                    aria-label="Open menu"
                    aria-expanded={Boolean(isSidebarOpen)}
                >
                    <Menu size={24} aria-hidden="true" />
                </button>
                <div className="title-stack">
                    <h1>{title}</h1>
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
