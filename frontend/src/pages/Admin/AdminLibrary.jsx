import React, { useState } from 'react';
import AdminStandardProjects from './AdminStandardProjects';
import AdminAchievements from './AdminAchievements';
import AdminChallenges from './AdminChallenges';
import AdminGameCatalog from './AdminGameCatalog';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import { BookMarked, Award, Swords, Library, Gamepad2 } from 'lucide-react';
import './AdminLibrary.css';

const AdminLibrary = () => {
    const [activeTab, setActiveTab] = useState('projects');

    const tabs = [
        { id: 'projects', label: 'Standard Projects', icon: BookMarked },
        { id: 'achievements', label: 'Achievements', icon: Award },
        { id: 'challenges', label: 'Courses', icon: Swords },
        { id: 'games', label: 'Game Catalog', icon: Gamepad2 },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'projects':
                return <AdminStandardProjects />;
            case 'achievements':
                return <AdminAchievements />;
            case 'challenges':
                return <AdminChallenges />;
            case 'games':
                return <AdminGameCatalog />;
            default:
                return <AdminStandardProjects />;
        }
    };

    return (
        <div className="admin-library-page">
            <AdminPageHeader title="Content Library" icon={Library} />
            
            <div className="library-tabs-container">
                <div className="library-tabs">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            className={`library-tab ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            <tab.icon size={18} />
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="library-content-container">
                {renderContent()}
            </div>
        </div>
    );
};

export default AdminLibrary;
