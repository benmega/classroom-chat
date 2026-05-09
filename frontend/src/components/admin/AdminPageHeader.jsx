import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import './AdminPageHeader.css';

const AdminPageHeader = ({ title, description, showBack = true, backPath = '/admin', onBack, children }) => {
    const navigate = useNavigate();

    return (
        <header className="page-header standardized">
            <div className="header-left">
                {showBack && (
                    <button onClick={onBack ? onBack : () => navigate(backPath)} className="back-btn">
                        <ChevronLeft size={20} /> Back
                    </button>
                )}
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
