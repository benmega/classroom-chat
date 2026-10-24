import React from 'react';
import './AdminPageHeader.css';

// Titles only, 1-2 words. No description/subtitle prop -- put explanatory text in comments or docs, not the UI.
// No menu button here: AdminLayout owns the one mobile menu button, and some admin pages have no header.
const AdminPageHeader = ({ title, children }) => (
    <header className="page-header standardized">
        <div className="header-left">
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

export default AdminPageHeader;
