import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FileCheck, Zap } from 'lucide-react';
import SubmitChallenge from './SubmitChallenge';
import SubmitCertificate from './SubmitCertificate';
import './SubmitWork.css';

const SubmitWork = () => {
    const location = useLocation();
    const navigate = useNavigate();
    
    // Check if the URL has a hash for the default tab
    const [activeTab, setActiveTab] = useState('challenge');

    useEffect(() => {
        if (location.hash === '#certificate') {
            setTimeout(() => setActiveTab('certificate'), 0);
        } else if (location.hash === '#challenge') {
            setTimeout(() => setActiveTab('challenge'), 0);
        }
    }, [location.hash]);

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        navigate(`/submit-work#${tab}`, { replace: true });
    };

    return (
        <div className="submit-work-page animate-page-entry">
            <div className="submit-work-header">
                <h1>Submit Work</h1>
            </div>
            
            <div className="submit-work-tabs">
                <button 
                    className={`tab-btn ${activeTab === 'challenge' ? 'active' : ''}`}
                    onClick={() => handleTabChange('challenge')}
                >
                    <Zap size={18} />
                    Challenge
                </button>
                <button 
                    className={`tab-btn ${activeTab === 'certificate' ? 'active' : ''}`}
                    onClick={() => handleTabChange('certificate')}
                >
                    <FileCheck size={18} />
                    Certificate
                </button>
            </div>

            <div className="submit-work-content">
                {activeTab === 'challenge' ? <SubmitChallenge /> : <SubmitCertificate />}
            </div>
        </div>
    );
};

export default SubmitWork;
