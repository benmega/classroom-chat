import React, { useState } from 'react';
import {
    Search,
    Menu,
    Bot,
    MessageSquare,
    AlertTriangle,
    Calendar,
    PieChart as PieChartIcon,
    Download
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
    Filler,
    ArcElement
} from 'chart.js';
import { Line, Pie } from 'react-chartjs-2';
import { useNavigate } from 'react-router-dom';
import client from '../../api/client';
import toast from 'react-hot-toast';
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
    Filler,
    ArcElement
);

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [newWord, setNewWord] = useState('');
    const [banReason, setBanReason] = useState('');

    const {
        dashboardData,
        isLoading,
        activeModal,
        setActiveModal,
        formLoading,
        timeframe,
        setTimeframe,
        handleToggleAI,
        handleToggleMessages,
        handleUpdateMultiplier,
        handleAddBannedWord
    } = useAdminDashboard();

    const handleExportTransactions = async () => {
        try {
            const response = await client.get('/api/admin/export/transactions', {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            const filename = `duck_transactions_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '_')}.csv`;
            link.setAttribute('download', filename);
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success('Transaction history exported.');
        } catch (error) {
            console.error('Export failed:', error);
            toast.error('Failed to export transaction data.');
        }
    };

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
                <Skeleton height="40px" width="300px" data-testid="skeleton-title" className="skeleton-title" />
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

    const { config, chart_data, all_users } = dashboardData;

    const chartConfig = getChartConfig(chart_data);

    const maxDays = dashboardData?.chart_data?.max_history_days || 0;

    const handleChartPointClick = (event, elements) => {
        if (!elements || !elements.length) return;
        const { datasetIndex, index } = elements[0];
        const date = chart_data?.dates?.[index];
        if (!date) return;
        const type = datasetIndex === 1 ? 'spent' : 'earned';
        navigate(`/admin/transactions?type=${type}&date=${date}`);
    };

    const clickableChartOptions = {
        ...chartOptions,
        onClick: handleChartPointClick,
        onHover: (event, elements) => {
            if (event.native?.target) {
                event.native.target.style.cursor = elements.length ? 'pointer' : 'default';
            }
        },
    };

    const engagementPct = all_users.length ? (all_users.filter(u => u.is_online).length / all_users.length * 100) : 0;

    const userDistributionData = {
        labels: ['Active Students', 'Inactive Students', 'Parents', 'Administrators'],
        datasets: [{
            data: [
                all_users.filter(u => u.is_online && u.role === 'student').length,
                all_users.filter(u => !u.is_online && u.role === 'student').length,
                all_users.filter(u => u.role === 'parent').length,
                all_users.filter(u => u.role === 'admin').length
            ],
            backgroundColor: ['#10B981', '#94A3B8', '#4F52C9', '#0EB2BB'], // success, border-rich, secondary, primary
            borderWidth: 0,
        }]
    };

    return (
        <div className="admin-dashboard">
            <AdminPageHeader title="Dashboard">

            </AdminPageHeader>

            <AdminStats
                stats={dashboardData}
                onEarnedWeekClick={() => navigate('/admin/transactions?type=earned')}
                onTotalDucksClick={() => navigate('/admin/users')}
                onOnlineUsersClick={() => navigate('/admin/users?filter=online')}
                onTotalResidentsClick={() => navigate('/admin/users')}
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
                            <Line data={chartConfig} options={clickableChartOptions} />
                        </div>
                    </div>

                    <div className="admin-controls-card card">
                        {/* Unified Controls Grid */}
                        <div className="admin-controls-grid">
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

                            <button className="action-item" onClick={handleExportTransactions}>
                                <div className="icon icon-primary"><Download size={20} /></div>
                                <span className="action-text-main">Export Transactions CSV</span>
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
                                    
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="insights-grid">
                <div className="chart-card card">
                    <div className="chart-header mb-sm">
                        <h3><PieChartIcon size={20} /> User Breakdown</h3>
                    </div>
                    <div className="chart-container chart-container-fixed">
                        <Pie
                            data={userDistributionData}
                            options={{
                                responsive: true,
                                maintainAspectRatio: false,
                                plugins: {
                                    legend: { position: 'bottom' }
                                }
                            }}
                        />
                    </div>
                    <p className="insight-footnote">{engagementPct.toFixed(0)}% of users are currently online</p>
                </div>

                <div className="card">
                    <div className="card-header">
                        <h3><Calendar size={20} /> High Value Earners</h3>
                    </div>
                    <div className="top-earners">
                        {[...all_users].sort((a, b) => b.duck_balance - a.duck_balance).slice(0, 5).map(u => (
                            <div key={u.id} className="earner-item">
                                <div className="user-info">
                                    <div className="name">{u.nickname || u.username}</div>
                                    <div className="handle">@{u.username}</div>
                                </div>
                                <div className="amount">🦆 {(u.duck_balance ?? 0).toFixed(1)}</div>
                            </div>
                        ))}
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


