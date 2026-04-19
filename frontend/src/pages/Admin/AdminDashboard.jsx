import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import DuckIcon from '../../components/common/DuckIcon';
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
import client from '../../api/client';
import toast from 'react-hot-toast';
import './AdminDashboard.css';

// Extracted Components
import AdminStats from '../../components/admin/AdminStats';
import UserTable from '../../components/admin/UserTable';
import { 
    CreateUserModal, 
    AdjustDucksModal, 
    ResetPasswordModal, 
    StartConversationModal 
} from '../../components/admin/AdminModals';

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
    const [dashboardData, setDashboardData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isRefreshing, setIsRefreshing] = useState(false);
    
    // Modal States
    const [modalUser, setModalUser] = useState(null);
    const [activeModal, setActiveModal] = useState(null); // 'create', 'adjust', 'reset', 'startConv'
    
    // Form States
    const [formLoading, setFormLoading] = useState(false);
    const [newWord, setNewWord] = useState('');
    const [banReason, setBanReason] = useState('');
    const [formErrors, setFormErrors] = useState({});

    const fetchDashboardData = async () => {
        setIsRefreshing(true);
        try {
            const response = await client.get('/api/admin/dashboard');
            if (response.data.status === 'success') {
                setDashboardData(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching admin data:', error);
            toast.error('Failed to load dashboard data.');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

    useEffect(() => {
        setFormErrors({});
    }, [activeModal]);

    const handleToggleAI = async () => {
        try {
            const response = await client.post('/api/admin/toggle-ai');
            if (response.data.success) {
                toast.success(response.data.message);
                fetchDashboardData();
            }
        } catch {
            toast.error('Failed to toggle AI.');
        }
    };

    const handleToggleMessages = async () => {
        try {
            const response = await client.post('/api/admin/toggle-message-sending');
            if (response.data.success) {
                toast.success(response.data.message);
                fetchDashboardData();
            }
        } catch {
            toast.error('Failed to toggle messaging.');
        }
    };

    const handleUpdateMultiplier = async (val) => {
        try {
            const response = await client.post('/api/admin/update_duck_multiplier', { multiplier: val });
            if (response.data.success) {
                toast.success('Multiplier updated!');
                fetchDashboardData();
            }
        } catch {
            toast.error('Failed to update multiplier.');
        }
    };

    const handleAddBannedWord = async (e) => {
        e.preventDefault();
        if (!newWord.trim()) return;
        
        try {
            const formData = new FormData();
            formData.append('word', newWord);
            formData.append('reason', banReason);
            
            const response = await client.post('/api/admin/add-banned-word', formData);
            if (response.data.success) {
                toast.success(response.data.message);
                setNewWord('');
                setBanReason('');
                fetchDashboardData();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to add word.');
        }
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const username = formData.get('username');
        const password = formData.get('password');
        
        const errors = {};
        if (!username) {
            errors.username = 'Username is required';
        } else if (!/^[a-z0-9_]{3,30}$/.test(username)) {
            errors.username = '3-30 chars, lowercase, numbers, or underscores.';
        }
        
        if (!password) {
            errors.password = 'Initial password is required';
        } else if (password.length < 6) {
            errors.password = 'Password must be at least 6 characters.';
        }
        
        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            return;
        }
        
        setFormErrors({});
        setFormLoading(true);
        try {
            const response = await client.post('/api/admin/create_user', formData);
            if (response.data.success) {
                toast.success(response.data.message);
                setActiveModal(null);
                fetchDashboardData();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to create user.');
        } finally {
            setFormLoading(false);
        }
    };

    const handleAdjustDucks = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        const errors = {};
        if (!formData.get('amount')) {
            errors.amount = 'Adjustment amount is required';
        }
        
        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            return;
        }

        setFormErrors({});
        setFormLoading(true);
        try {
            const response = await client.post('/api/admin/adjust_ducks', formData);
            if (response.data.success) {
                toast.success(response.data.message);
                setActiveModal(null);
                fetchDashboardData();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to adjust ducks.');
        } finally {
            setFormLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData);
        
        const errors = {};
        if (!data.new_password) errors.new_password = 'New password is required';
        if (!data.confirm_password) errors.confirm_password = 'Confirmation is required';
        
        if (data.new_password && data.confirm_password && data.new_password !== data.confirm_password) {
            errors.confirm_password = 'Passwords do not match';
        }
        
        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            return;
        }

        setFormErrors({});
        setFormLoading(true);
        try {
            const response = await client.post('/api/admin/reset_password', {
                username: data.username,
                new_password: data.new_password
            });
            if (response.data.success) {
                toast.success(response.data.message);
                setActiveModal(null);
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to reset password.');
        } finally {
            setFormLoading(false);
        }
    };

    const handleStartConversation = async (e) => {
        e.preventDefault();
        const data = new FormData(e.target);
        setFormLoading(true);
        try {
            const response = await client.post('/message/start_conversation', data);
            if (response.status === 201) {
                toast.success('New conversation started!');
                setActiveModal(null);
            }
        } catch {
            toast.error('Failed to start conversation.');
        } finally {
            setFormLoading(false);
        }
    };

    const handleRemoveUser = async (username) => {
        if (!window.confirm(`Are you sure you want to PERMANENTLY remove @${username}?`)) return;
        
        try {
            const formData = new FormData();
            formData.append('username', username);
            const response = await client.post('/api/admin/remove_user', formData);
            if (response.data.success) {
                toast.success(response.data.message);
                fetchDashboardData();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to remove user.');
        }
    };

    if (isLoading) return <div className="admin-loading">Loading Dashboard...</div>;
    if (!dashboardData) return <div className="admin-error">Error loading dashboard.</div>;

    const { 
        users, 
        config, 
        banned_words, 
        chart_data 
    } = dashboardData;

    const filteredUsers = users.filter(u => 
        u.username.toLowerCase().includes(searchTerm.toLowerCase()) || 
        u.nickname?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const chartConfig = {
        labels: chart_data?.labels || [],
        datasets: [
            {
                label: 'Ducks Earned',
                data: chart_data?.earned || [],
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointHoverRadius: 6,
            },
            {
                label: 'Ducks Spent',
                data: chart_data?.spent || [],
                borderColor: '#ef4444',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointHoverRadius: 6,
            }
        ]
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'top', labels: { usePointStyle: true, font: { weight: '600' } } },
            tooltip: { padding: 12, borderRadius: 8, titleFont: { size: 14 } }
        },
        scales: {
            y: { beginAtZero: true, grid: { color: '#f1f5f9' } },
            x: { grid: { display: false } }
        }
    };

    return (
        <div className="admin-dashboard">
            <div className="dashboard-header">
                <div>
                    <h1>Overview Dashboard</h1>
                    <p>System status and user activity at a glance.</p>
                </div>
                <button 
                    onClick={fetchDashboardData} 
                    className={`refresh-btn ${isRefreshing ? 'spinning' : ''}`}
                    disabled={isRefreshing}
                >
                    <RefreshCw size={20} />
                </button>
            </div>

            <AdminStats stats={dashboardData} onApprovalClick={() => navigate('/admin/pending-users')} />

            <div className="dashboard-layout">
                <div className="main-content">
                    <div className="chart-card card">
                        <div className="card-header">
                            <h3><TrendingUp size={20} /> Duck Transactions (Last 7 Days)</h3>
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
                                <span>User Approvals</span>
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
                        <form onSubmit={handleAddBannedWord} className="add-word-form">
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
                users={users} 
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
            />
        </div>
    );
};

export default AdminDashboard;


