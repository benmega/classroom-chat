import React, { useState } from 'react';
import { 
    Settings, 
    Save, 
    Bell, 
    Shield, 
    Palette, 
    Globe, 
    Database, 
    Lock,
    Eye,
    EyeOff
} from 'lucide-react';
import './AdminSettings.css';

const AdminSettings = () => {
    const [activeTab, setActiveTab] = useState('general');
    const [isSaving, setIsSaving] = useState(false);
    const [showApiKey, setShowApiKey] = useState(false);

    const handleSave = () => {
        setIsSaving(true);
        setTimeout(() => setIsSaving(false), 1500);
    };

    const tabs = [
        { id: 'general', label: 'General', icon: Settings },
        { id: 'security', label: 'Security', icon: Shield },
        { id: 'notifications', label: 'Notifications', icon: Bell },
        { id: 'appearance', label: 'Appearance', icon: Palette },
        { id: 'api', label: 'API & Integration', icon: Globe },
        { id: 'system', label: 'System', icon: Database },
    ];

    return (
        <div className="admin-settings-container">
            <header className="settings-header">
                <div className="header-info">
                    <h1>System Settings</h1>
                    <p>Configure global application parameters and security policies.</p>
                </div>
                <button 
                    className={`btn-save ${isSaving ? 'saving' : ''}`}
                    onClick={handleSave}
                    disabled={isSaving}
                >
                    {isSaving ? (
                        <>Saving Changes...</>
                    ) : (
                        <>
                            <Save size={18} />
                            Save Changes
                        </>
                    )}
                </button>
            </header>

            <div className="settings-layout">
                <aside className="settings-tabs">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            className={`tab-item ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            <tab.icon size={18} />
                            <span>{tab.label}</span>
                        </button>
                    ))}
                </aside>

                <main className="settings-content">
                    {activeTab === 'general' && (
                        <div className="settings-section animate-in">
                            <h2>General Configuration</h2>
                            <div className="settings-grid">
                                <div className="setting-card">
                                    <label>Application Name</label>
                                    <input type="text" defaultValue="Classroom Chat" />
                                    <span className="helper-text">The name displayed in browser tabs and emails.</span>
                                </div>
                                <div className="setting-card">
                                    <label>Support Email</label>
                                    <input type="email" defaultValue="support@classroomchat.io" />
                                    <span className="helper-text">Address for system-generated support tickets.</span>
                                </div>
                                <div className="setting-card">
                                    <label>Default Language</label>
                                    <select defaultValue="en">
                                        <option value="en">English (US)</option>
                                        <option value="es">Spanish</option>
                                        <option value="fr">French</option>
                                        <option value="de">German</option>
                                    </select>
                                </div>
                                <div className="setting-card">
                                    <label>Timezone</label>
                                    <select defaultValue="UTC">
                                        <option value="UTC">UTC (Coordinated Universal Time)</option>
                                        <option value="EST">EST (Eastern Standard Time)</option>
                                        <option value="PST">PST (Pacific Standard Time)</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'security' && (
                        <div className="settings-section animate-in">
                            <h2>Security & Authentication</h2>
                            <div className="setting-group">
                                <div className="setting-row">
                                    <div className="row-info">
                                        <h3>Two-Factor Authentication (2FA)</h3>
                                        <p>Require 2FA for all administrative accounts.</p>
                                    </div>
                                    <label className="switch">
                                        <input type="checkbox" defaultChecked />
                                        <span className="slider round"></span>
                                    </label>
                                </div>
                                <div className="setting-row">
                                    <div className="row-info">
                                        <h3>Password Complexity</h3>
                                        <p>Enforce strong password requirements for new users.</p>
                                    </div>
                                    <label className="switch">
                                        <input type="checkbox" defaultChecked />
                                        <span className="slider round"></span>
                                    </label>
                                </div>
                                <div className="setting-row">
                                    <div className="row-info">
                                        <h3>Session Timeout</h3>
                                        <p>Automatic logout after 30 minutes of inactivity.</p>
                                    </div>
                                    <select className="row-select" defaultValue="30">
                                        <option value="15">15 Minutes</option>
                                        <option value="30">30 Minutes</option>
                                        <option value="60">1 Hour</option>
                                        <option value="never">Never</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'api' && (
                        <div className="settings-section animate-in">
                            <h2>API Keys & Integrations</h2>
                            <div className="setting-card full-width">
                                <label>Master API Key</label>
                                <div className="input-with-action">
                                    <input 
                                        type={showApiKey ? "text" : "password"} 
                                        defaultValue="STRIPE_API_KEY_REDACTED"
                                        readOnly
                                    />
                                    <button onClick={() => setShowApiKey(!showApiKey)}>
                                        {showApiKey ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                <span className="helper-text warning">Warning: Do not share this key. It grants full administrative access.</span>
                            </div>
                        </div>
                    )}

                    {activeTab !== 'general' && activeTab !== 'security' && activeTab !== 'api' && (
                        <div className="settings-placeholder animate-in">
                            <Database size={48} className="placeholder-icon" />
                            <h3>Under Construction</h3>
                            <p>This settings module will be available in the next system update.</p>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};

export default AdminSettings;
