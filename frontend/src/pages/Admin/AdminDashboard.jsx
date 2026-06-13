import React, { useState } from 'react';
import { 
    Users, 
    TrendingUp, 
    Settings, 
    AlertTriangle, 
    Search,
    RefreshCw,
    Shield,
    Plus,
    UserPlus,
    MessageSquare,
    ShoppingBag,
    Menu
} from 'lucide-react';
import DuckIcon from '../../components/Icons/DuckIcon';
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
import UserTable from '../../components/admin/UserTable';
import { 
    CreateUserModal, 
    AdjustDucksModal, 
    ResetPasswordModal, 
    StartConversationModal 
} from '../../components/admin/AdminModals';

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
    const [searchTerm, setSearchTerm] = useState('');
    const [newWord, setNewWord] = useState('');
    const [banReason, setBanReason] = useState('');
    const { toggleSidebar } = useSidebar();

    const {
        dashboardData,
        isLoading,
        isRefreshing,
        activeModal,
        setActiveModal,
        modalUser,
        setModalUser,
        formLoading,
        formErrors,
        timeframe,
        setTimeframe,
        fetchDashboardData,
        handleToggleAI,
        handleToggleMessages,
        handleUpdateMultiplier,
        handleAddBannedWord,
        handleCreateUser,
        handleAdjustDucks,
        handleResetPassword,
        handleStartConversation,
        handleRemoveUser
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
                    <Skeleton height="500px" className="skeleton-card" style={{ marginTop: '20px' }} />
                </div>
                <div className="side-content">
                    <Skeleton height="200px" className="skeleton-card" />
                    <Skeleton height="250px" className="skeleton-card" style={{ marginTop: '20px' }} />
                </div>
            </div>
        </div>
    );
    
    if (!dashboardData) return <div className="admin-error">Error loading dashboard.</div>;

    const { users, config, banned_words, chart_data } = dashboardData;

    const filteredUsers = users.filter(u => 
        u.username.toLowerCase().includes(searchTerm.toLowerCase()) || 
        u.nickname?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const chartConfig = getChartConfig(chart_data);

    const maxDays = dashboardData?.chart_data?.max_history_days || 0;

    return (
        <div className="admin-dashboard">
            <div className="dashboard-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button className="hamburger-toggle mobile-only" onClick={toggleSidebar}>
                        <Menu size={24} />
                    </button>
                    <div>
                        <h1>Overview Dashboard</h1>
                    </div>
                </div>
                <button 
                    onClick={() => fetchDashboardData(timeframe)} 
                    className={`refresh-btn ${isRefreshing ? 'spinning' : ''}`}
                    disabled={isRefreshing}
                >
                    <RefreshCw size={20} />
                </button>
            </div>

            <AdminStats 
                stats={dashboardData} 
                onApprovalClick={() => navigate('/admin/pending-users')} 
                onTradeClick={() => navigate('/admin/pending-trades')}
                onEarnedWeekClick={() => navigate('/admin/transactions?type=earned')}
            />

            <div className="dashboard-layout">
                <div className="main-content">
                    <div className="chart-card card">
                        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <h3><TrendingUp size={20} /> Duck Transactions</h3>
                            <select 
                                value={timeframe} 
                                onChange={(e) => setTimeframe(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                                style={{
                                    padding: '0.25rem 0.5rem',
                                    borderRadius: '0.375rem',
                                    border: '1px solid var(--border-color)',
                                    backgroundColor: 'var(--bg-secondary)',
                                    color: 'var(--text-primary)',
                                    fontFamily: 'Outfit, sans-serif',
                                    fontSize: '0.875rem',
                                    cursor: 'pointer'
                                }}
                            >
                                <option value={7}>Last 7 Days</option>
                                <option value={30} disabled={maxDays > 0 && maxDays < 30}>Last 1 Month</option>
                                <option value={90} disabled={maxDays > 0 && maxDays < 90}>Last 3 Months</option>
                                <option value={365} disabled={maxDays > 0 && maxDays < 365}>Last 1 Year</option>
                                <option value="all">All Time</option>
                            </select>
                        </div>
                        <div className="chart-container" style={{ height: '300px' }}>
                            <Line data={chartConfig} options={chartOptions} />
                        </div>
                    </div>

                    <div className="user-management card">
                        <div className="card-header">
                            <div className="title-group">
                                <h3><Users size={20} /> User Management</h3>
                                <span className="user-count-badge">Total: {dashboardData.total_users_count || users.length}</span>
                            </div>
                            <div className="header-actions">
                                <div className="search-box">
                                    <Search size={18} />
                                    <input 
                                        type="text" 
                                        placeholder="Search top results..." 
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                <button className="add-user-btn" onClick={() => setActiveModal('create')}>
                                    <Plus size={18} /> Create User
                                </button>
                                <button className="view-all-btn" onClick={() => navigate('/admin/users')}>
                                    Directory
                                </button>
                            </div>
                        </div>
                        <UserTable 
                            users={filteredUsers} 
                            onAdjustDucks={(u) => { setModalUser(u); setActiveModal('adjust'); }}
                            onResetPassword={(u) => { setModalUser(u); setActiveModal('reset'); }}
                            onRemoveUser={handleRemoveUser}
                        />
                        {dashboardData.total_users_count > 10 && (
                            <div className="table-footer">
                                <p>Showing 10 of {dashboardData.total_users_count} total users.</p>
                                <button onClick={() => navigate('/admin/users')} className="text-btn">View full directory →</button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="side-content">
                    <div className="quick-actions card">
                        <h3>⚡ Quick Actions</h3>
                        <div className="action-buttons">
                            <button className="action-item" onClick={() => navigate('/admin/pending-users')}>
                                <div className="icon approval"><Shield size={20} /></div>
                                <span>Account Approvals</span>
                            </button>
                            <button className="action-item" onClick={() => navigate('/admin/pending-trades')}>
                                <div className="icon pending"><ShoppingBag size={20} /></div>
                                <span>Trade Approvals</span>
                            </button>
                            <button className="action-item" onClick={() => setActiveModal('create')}>
                                <div className="icon"><UserPlus size={20} /></div>
                                <span>Create User</span>
                            </button>
                            <button className="action-item" onClick={() => setActiveModal('startConv')}>
                                <div className="icon primary"><MessageSquare size={20} /></div>
                                <span>New Conversation</span>
                            </button>
                            <button className="action-item" onClick={() => setActiveModal('adjust')}>
                                <div className="icon warning"><DuckIcon size={24} color="#92400e" /></div>
                                <span>Adjust Wealth</span>
                            </button>
                        </div>
                    </div>

                    <div className="settings-card card">
                        <h3><Settings size={20} /> Global Config</h3>
                        <div className="setting-item">
                            <div className="setting-info">
                                <span>AI Teacher</span>
                                <small>{config?.ai_teacher_enabled ? 'Enabled' : 'Disabled'}</small>
                            </div>
                            <label className="switch">
                                <input type="checkbox" checked={config?.ai_teacher_enabled || false} onChange={handleToggleAI} />
                                <span className="slider"></span>
                            </label>
                        </div>
                        <div className="setting-item">
                            <div className="setting-info">
                                <span>Public Messaging</span>
                                <small>{config?.message_sending_enabled ? 'Enabled' : 'Disabled'}</small>
                            </div>
                            <label className="switch">
                                <input type="checkbox" checked={config?.message_sending_enabled || false} onChange={handleToggleMessages} />
                                <span className="slider"></span>
                            </label>
                        </div>
                        <div className="setting-item multiplier">
                            <label>Duck Multiplier</label>
                            <div className="multiplier-input">
                                <input 
                                    type="number" 
                                    step="0.1" 
                                    defaultValue={config?.duck_multiplier || 1.0} 
                                    onBlur={(e) => handleUpdateMultiplier(e.target.value)}
                                />
                                <RefreshCw size={14} />
                            </div>
                        </div>
                    </div>

                    <div className="banned-words card">
                        <h3><AlertTriangle size={20} /> Content Moderation</h3>
                        <form onSubmit={onSubmitBannedWord} className="add-word-form">
                            <input 
                                type="text" 
                                placeholder="Add banned word..." 
                                value={newWord}
                                onChange={(e) => setNewWord(e.target.value)}
                            />
                            <button type="submit" className="add-btn"><Plus size={18} /></button>
                        </form>
                        <div className="words-list">
                            {banned_words.slice(0, 12).map(word => (
                                <div key={word.id} className="word-chip">{word.word}</div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <CreateUserModal 
                isOpen={activeModal === 'create'} 
                onClose={() => setActiveModal(null)} 
                onSubmit={handleCreateUser} 
                formErrors={formErrors} 
                loading={formLoading} 
            />

            <AdjustDucksModal 
                isOpen={activeModal === 'adjust'} 
                onClose={() => { setActiveModal(null); setModalUser(null); }} 
                onSubmit={handleAdjustDucks} 
                user={modalUser} 
                users={dashboardData.all_users || []} 
                formErrors={formErrors} 
                loading={formLoading} 
            />

            <ResetPasswordModal 
                isOpen={activeModal === 'reset'} 
                onClose={() => { setActiveModal(null); setModalUser(null); }} 
                onSubmit={handleResetPassword} 
                user={modalUser} 
                formErrors={formErrors} 
                loading={formLoading} 
            />

            <StartConversationModal 
                isOpen={activeModal === 'startConv'} 
                onClose={() => setActiveModal(null)} 
                onSubmit={handleStartConversation} 
                loading={formLoading} 
                classrooms={dashboardData.classrooms || []}
            />
        </div>
    );
};

export default AdminDashboard;


