import React from 'react';
import { ChevronLeft, Menu } from 'lucide-react';
import useSidebar from '../../hooks/useSidebar';
import './AdminPageHeader.css';

// Titles only, 1-2 words. No description/subtitle prop -- put explanatory text in comments or docs, not the UI.
const AdminPageHeader = ({ title, children }) => {
    const { toggleSidebar } = useSidebar();

    return (
        <header className="page-header standardized">
            <div className="header-left">
                <button className="hamburger-toggle mobile-only" onClick={toggleSidebar}>
                    <Menu size={24} />
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
