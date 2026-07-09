import React, { useState } from 'react';
import { 
    Users, 
    TrendingUp, 
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
import useSidebar from '../../hooks/useSidebar';
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
    const { toggleSidebar } = useSidebar();

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
                        <div className="card-header chart-header">
                            <h3><TrendingUp size={20} /> Duck Transactions</h3>
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
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem' }}>
                            <button className="action-item" onClick={() => navigate('/admin/users')} style={{ display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'left', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', cursor: 'pointer' }}>
                                <div className="icon" style={{ width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '10px', background: 'var(--primary-color)', color: 'white' }}><Users size={20} /></div>
                                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>User Directory</span>
                            </button>
                            <button className="action-item" onClick={() => navigate('/admin/pending-users')} style={{ display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'left', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', cursor: 'pointer' }}>
                                <div className="icon approval" style={{ width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '10px', background: 'var(--primary-color)', color: 'white' }}><Shield size={20} /></div>
                                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Account Approvals</span>
                            </button>
                            
                            <button 
                                onClick={handleToggleAI}
                                style={{ 
                                    display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'left', 
                                    padding: '12px 16px', borderRadius: '12px', 
                                    border: config?.ai_teacher_enabled ? '1px solid var(--success-color)' : '1px solid var(--error-color)', 
                                    background: config?.ai_teacher_enabled ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
                                    cursor: 'pointer' 
                                }}
                            >
                                <div className="icon" style={{ width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '10px', background: config?.ai_teacher_enabled ? 'var(--success-color)' : 'var(--error-color)', color: 'white' }}><Bot size={20} /></div>
                                <div>
                                    <span style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'block' }}>AI Teacher</span>
                                    <small style={{ color: 'var(--text-secondary)' }}>{config?.ai_teacher_enabled ? 'Enabled' : 'Disabled'}</small>
                                </div>
                            </button>
                            
                            <button 
                                onClick={handleToggleMessages}
                                style={{ 
                                    display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'left', 
                                    padding: '12px 16px', borderRadius: '12px', 
                                    border: config?.message_sending_enabled ? '1px solid var(--success-color)' : '1px solid var(--error-color)', 
                                    background: config?.message_sending_enabled ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)', 
                                    cursor: 'pointer' 
                                }}
                            >
                                <div className="icon" style={{ width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '10px', background: config?.message_sending_enabled ? 'var(--success-color)' : 'var(--error-color)', color: 'white' }}><MessageSquare size={20} /></div>
                                <div>
                                    <span style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'block' }}>Public Messaging</span>
                                    <small style={{ color: 'var(--text-secondary)' }}>{config?.message_sending_enabled ? 'Enabled' : 'Disabled'}</small>
                                </div>
                            </button>

                            <button className="action-item" onClick={() => setActiveModal('bannedWord')} style={{ display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'left', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border-subtle)', background: 'var(--bg-secondary)', cursor: 'pointer' }}>
                                <div className="icon" style={{ width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '10px', background: 'var(--error-color)', color: 'white' }}><AlertTriangle size={20} /></div>
                                <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Content Moderation</span>
                            </button>
                            
                            <div className="setting-item multiplier" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-secondary)', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                                <label style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Duck Multiplier</label>
                                <div className="multiplier-input" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <input 
                                        type="number" 
                                        step="0.1" 
                                        defaultValue={config?.duck_multiplier || 1.0} 
                                        onBlur={(e) => handleUpdateMultiplier(e.target.value)}
                                        style={{ width: '60px', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
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


