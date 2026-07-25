import React, { useState } from 'react';
import { 
    Users, 
    Search,
    RefreshCw,
    Shield,
    Menu,
    Bot,
    MessageSquare,
    AlertTriangle
} from 'lucide-react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { useNavigate } from 'react-router-dom';
import './AdminDashboard.css';
import Skeleton from '../../components/common/Skeleton';

// Extracted Components
import AdminStats from '../../components/admin/AdminStats';
import { 
    AddBannedWordModal
} from '../../components/admin/AdminModals';
import AdminPageHeader from '../../components/admin/AdminPageHeader';

// Hooks & Utils
import { useAdminDashboard } from '../../hooks/useAdminDashboard';
import { getChartConfig, chartOptions } from './chartConfig';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [newWord, setNewWord] = useState('');
    const [banReason, setBanReason] = useState('');

    const {
        dashboardData,
        isLoading,
        isRefreshing,
        activeModal,
        setActiveModal,
        formLoading,
        timeframe,
        setTimeframe,
        fetchDashboardData,
        handleToggleAI,
        handleToggleMessages,
        handleUpdateMultiplier,
        handleAddBannedWord
    } = useAdminDashboard();

    const onSubmitBannedWord = async (e) => {
        e.preventDefault();
        const success = await handleAddBannedWord(newWord, banReason);
        if (success) {
            setNewWord('');
            setBanReason('');
        }
    };

    if (isLoading) return (
        <div className="admin-dashboard">
            <div className="dashboard-header">
                <Skeleton height="40px" width="300px" className="skeleton-title" />
            </div>
            <div className="dashboard-layout">
                <div className="main-content">
                    <Skeleton height="350px" className="skeleton-card" />
                    <Skeleton height="500px" className="skeleton-card skeleton-card-mt" />
                </div>
                <div className="side-content">
                    <Skeleton height="200px" className="skeleton-card" />
                    <Skeleton height="250px" className="skeleton-card skeleton-card-mt" />
                </div>
            </div>
        </div>
    );
    
    if (!dashboardData) return <div className="admin-error">Error loading dashboard.</div>;

    const { config, chart_data } = dashboardData;

    const chartConfig = getChartConfig(chart_data);

    const maxDays = dashboardData?.chart_data?.max_history_days || 0;

    return (
        <div className="admin-dashboard">
            <AdminPageHeader title="Overview Dashboard">
                <button 
                    onClick={() => fetchDashboardData(timeframe)} 
                    className={`refresh-btn ${isRefreshing ? 'spinning' : ''}`}
                    disabled={isRefreshing}
                >
                    <RefreshCw size={20} />
                </button>
            </AdminPageHeader>

            <AdminStats 
                stats={dashboardData} 
                onApprovalClick={() => navigate('/admin/pending-users')} 
                onTradeClick={() => navigate('/admin/pending-trades')}
                onEarnedWeekClick={() => navigate('/admin/transactions?type=earned')}
                onTotalDucksClick={() => navigate('/admin/users')}
                onOnlineUsersClick={() => navigate('/admin/users?filter=online')}
            />

            <div className="dashboard-layout">
                <div className="main-content">
                    <div className="chart-card card">
                        <div className="chart-header justify-end mb-sm">
                            <select 
                                value={timeframe} 
                                onChange={(e) => setTimeframe(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                                className="chart-timeframe-select"
                            >
                                <option value={7}>Last 7 Days</option>
                                <option value={30} disabled={maxDays > 0 && maxDays < 30}>Last 1 Month</option>
                                <option value={90} disabled={maxDays > 0 && maxDays < 90}>Last 3 Months</option>
                                <option value={365} disabled={maxDays > 0 && maxDays < 365}>Last 1 Year</option>
                                <option value="all">All Time</option>
                            </select>
                        </div>
                        <div className="chart-container chart-container-fixed">
                            <Line data={chartConfig} options={chartOptions} />
                        </div>
                    </div>

                    <div className="admin-controls-card card">
                        {/* Unified Controls Grid */}
                        <div className="admin-controls-grid">
                            <button className="action-item" onClick={() => navigate('/admin/users')}>
                                <div className="icon icon-primary"><Users size={20} /></div>
                                <span className="action-text-main">User Directory</span>
                            </button>
                            <button className="action-item" onClick={() => navigate('/admin/pending-users')}>
                                <div className="icon icon-primary approval"><Shield size={20} /></div>
                                <span className="action-text-main">Account Approvals</span>
                            </button>
                            
                            <button 
                                onClick={handleToggleAI}
                                className={`action-item ${config?.ai_teacher_enabled ? 'action-item-success' : 'action-item-error'}`}
                            >
                                <div className={`icon ${config?.ai_teacher_enabled ? 'icon-success' : 'icon-error'}`}><Bot size={20} /></div>
                                <div>
                                    <span className="action-text-main d-block">AI Teacher</span>
                                    <small className="action-text-sub">{config?.ai_teacher_enabled ? 'Enabled' : 'Disabled'}</small>
                                </div>
                            </button>
                            
                            <button 
                                onClick={handleToggleMessages}
                                className={`action-item ${config?.message_sending_enabled ? 'action-item-success' : 'action-item-error'}`}
                            >
                                <div className={`icon ${config?.message_sending_enabled ? 'icon-success' : 'icon-error'}`}><MessageSquare size={20} /></div>
                                <div>
                                    <span className="action-text-main d-block">Public Messaging</span>
                                    <small className="action-text-sub">{config?.message_sending_enabled ? 'Enabled' : 'Disabled'}</small>
                                </div>
                            </button>

                            <button className="action-item" onClick={() => setActiveModal('bannedWord')}>
                                <div className="icon icon-error"><AlertTriangle size={20} /></div>
                                <span className="action-text-main">Content Moderation</span>
                            </button>
                            
                            <div className="setting-item multiplier">
                                <label htmlFor="input-299" className="setting-label">Duck Multiplier</label>
                                <div className="multiplier-input-wrapper">
                                    <input id="input-299" 
                                        type="number" 
                                        step="0.1" 
                                        defaultValue={config?.duck_multiplier || 1.0} 
                                        onBlur={(e) => handleUpdateMultiplier(e.target.value)}
                                        className="multiplier-input-field"
                                    />
                                    <RefreshCw size={14} color="var(--text-secondary)" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <AddBannedWordModal 
                isOpen={activeModal === 'bannedWord'} 
                onClose={() => setActiveModal(null)} 
                onSubmit={(e) => { e.preventDefault(); onSubmitBannedWord(e); setActiveModal(null); }} 
                newWord={newWord}
                setNewWord={setNewWord}
                loading={formLoading} 
            />
        </div>
    );
};

export default AdminDashboard;


