import React, { useState, useEffect } from 'react';
import { 
    Users, 
    Coins, 
    TrendingUp, 
    Clock, 
    Settings, 
    AlertTriangle, 
    Trash2, 
    Search,
    RefreshCw,
    Shield,
    Plus,
    UserPlus,
    Key,
    MessageSquare,
    ArrowUpCircle,
    X
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
import SmartImage from '../../components/common/SmartImage';

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

const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="admin-modal-overlay" onClick={onClose}>
            <div className="admin-modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>{title}</h3>
                    <button onClick={onClose} className="close-btn"><X size={20} /></button>
                </div>
                <div className="modal-body">
                    {children}
                </div>
            </div>
        </div>
    );
};

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
            const response = await client.get('/admin/dashboard');
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
            const response = await client.post('/admin/toggle-ai');
            if (response.data.success) {
                toast.success(response.data.message);
                fetchDashboardData();
            }
        } catch (error) {
            toast.error('Failed to toggle AI.');
        }
    };

    const handleToggleMessages = async () => {
        try {
            const response = await client.post('/admin/toggle-message-sending');
            if (response.data.success) {
                toast.success(response.data.message);
                fetchDashboardData();
            }
        } catch (error) {
            toast.error('Failed to toggle messaging.');
        }
    };

    const handleUpdateMultiplier = async (val) => {
        try {
            const response = await client.post('/admin/update_duck_multiplier', { multiplier: val });
            if (response.data.success) {
                toast.success('Multiplier updated!');
                fetchDashboardData();
            }
        } catch (error) {
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
            
            const response = await client.post('/admin/add-banned-word', formData);
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
        
        // Custom Validation
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
            const response = await client.post('/admin/create_user', formData);
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
        
        // Custom Validation
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
            const response = await client.post('/admin/adjust_ducks', formData);
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
        
        // Custom Validation
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
            const response = await client.post('/admin/reset_password', {
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
        } catch (error) {
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
            const response = await client.post('/admin/remove_user', formData);
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
        total_ducks, 
        ducks_earned_this_week, 
        pending_trades_count, 
        active_users_count, 
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
        labels: chart_data.labels,
        datasets: [
            {
                label: 'Ducks Earned',
                data: chart_data.earned,
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointHoverRadius: 6,
            },
            {
                label: 'Ducks Spent',
                data: chart_data.spent,
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

            <div className="stats-grid">
                <div className="stat-card">
                    <div className="stat-icon ducks"><DuckIcon size={32} color="white" /></div>
                    <div className="stat-info">
                        <span className="stat-label">Total Ducks In Circulation</span>
                        <span className="stat-value">{total_ducks.toLocaleString()}</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon week"><TrendingUp size={24} /></div>
                    <div className="stat-info">
                        <span className="stat-label">Earned This Week</span>
                        <span className="stat-value">{ducks_earned_this_week.toLocaleString()}</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon pending"><Clock size={24} /></div>
                    <div className="stat-info">
                        <span className="stat-label">Pending Trades</span>
                        <span className="stat-value">{pending_trades_count}</span>
                    </div>
                </div>
                <div className="stat-card clickable" onClick={() => navigate('/admin/pending-users')}>
                    <div className="stat-icon approval"><Users size={24} /></div>
                    <div className="stat-info">
                        <span className="stat-label">System Approvals</span>
                        <span className="stat-value">{dashboardData.pending_users_count || 0}</span>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-icon active"><Users size={24} /></div>
                    <div className="stat-info">
                        <span className="stat-label">Online Users</span>
                        <span className="stat-value">{active_users_count}</span>
                    </div>
                </div>
            </div>

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
                            <h3><Users size={20} /> User Management</h3>
                            <div className="header-actions">
                                <div className="search-box">
                                    <Search size={18} />
                                    <input 
                                        type="text" 
                                        placeholder="Search users..." 
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                <button className="add-user-btn" onClick={() => setActiveModal('create')}>
                                    <Plus size={18} /> Create User
                                </button>
                            </div>
                        </div>
                        <div className="table-responsive">
                            <table className="admin-table">
                                <thead>
                                    <tr>
                                        <th>User</th>
                                        <th>Balance</th>
                                        <th>Levels</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredUsers.slice(0, 10).map(u => (
                                        <tr key={u.id}>
                                            <td>
                                                <div className="user-cell">
                                                    <SmartImage 
                                                        src={u.profile_picture ? `/user/profile_pictures/${u.profile_picture}` : ''} 
                                                        alt="" 
                                                        fallbackType="avatar"
                                                    />
                                                    <div>
                                                        <div className="u-name">{u.nickname || u.username}</div>
                                                        <div className="u-handle">@{u.username}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td><span className="duck-pill">{u.duck_balance?.toLocaleString(undefined, { maximumFractionDigits: 3 })} Ducks</span></td>
                                            <td>{u.cc_levels + u.oz_levels}</td>
                                            <td>
                                                <span className={`status-pill ${u.is_online ? 'online' : 'offline'}`}>
                                                    {u.is_online ? 'Online' : 'Offline'}
                                                </span>
                                            </td>
                                            <td>
                                                <div className="action-btns">
                                                    <button 
                                                        className="icon-btn adjust" 
                                                        title="Adjust Ducks"
                                                        onClick={() => { setModalUser(u); setActiveModal('adjust'); }}
                                                    >
                                                        <ArrowUpCircle size={16} />
                                                    </button>
                                                    <button 
                                                        className="icon-btn pass" 
                                                        title="Reset Password"
                                                        onClick={() => { setModalUser(u); setActiveModal('reset'); }}
                                                    >
                                                        <Key size={16} />
                                                    </button>
                                                    <button 
                                                        className="icon-btn delete" 
                                                        title="Delete User"
                                                        onClick={() => handleRemoveUser(u.username)}
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
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
                                <small>{config.ai_teacher_enabled ? 'Enabled' : 'Disabled'}</small>
                            </div>
                            <label className="switch">
                                <input type="checkbox" checked={config.ai_teacher_enabled} onChange={handleToggleAI} />
                                <span className="slider"></span>
                            </label>
                        </div>
                        <div className="setting-item">
                            <div className="setting-info">
                                <span>Public Messaging</span>
                                <small>{config.message_sending_enabled ? 'Enabled' : 'Disabled'}</small>
                            </div>
                            <label className="switch">
                                <input type="checkbox" checked={config.message_sending_enabled} onChange={handleToggleMessages} />
                                <span className="slider"></span>
                            </label>
                        </div>
                        <div className="setting-item multiplier">
                            <label>Duck Multiplier</label>
                            <div className="multiplier-input">
                                <input 
                                    type="number" 
                                    step="0.1" 
                                    defaultValue={config.duck_multiplier} 
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
                                <div key={word.id} className="word-chip">
                                    {word.word}
                                    <button className="remove-word"><Trash2 size={12} /></button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Modals */}
            <Modal isOpen={activeModal === 'create'} onClose={() => setActiveModal(null)} title="Create New User">
                <form onSubmit={handleCreateUser} className="admin-form" noValidate>
                    <div className={`form-group ${formErrors.username ? 'has-error' : ''}`}>
                        <label>Username</label>
                        <input 
                            type="text" 
                            name="username" 
                            placeholder="lowercas_only" 
                        />
                        {formErrors.username ? (
                            <span className="error-message">{formErrors.username}</span>
                        ) : (
                            <small>3-30 chars, lowercase, numbers, or underscores.</small>
                        )}
                    </div>
                    <div className={`form-group ${formErrors.password ? 'has-error' : ''}`}>
                        <label>Initial Password</label>
                        <input type="password" name="password" />
                        {formErrors.password && <span className="error-message">{formErrors.password}</span>}
                    </div>
                    <div className="form-group">
                        <label>Starting Duck Balance</label>
                        <input type="number" name="ducks" defaultValue="0" min="0" />
                    </div>
                    <button type="submit" className="btn-primary" disabled={formLoading}>
                        {formLoading ? 'Creating...' : 'Create User'}
                    </button>
                </form>
            </Modal>

            <Modal isOpen={activeModal === 'adjust'} onClose={() => { setActiveModal(null); setModalUser(null); }} title="Adjust Duck Balance">
                <form onSubmit={handleAdjustDucks} className="admin-form" noValidate>
                    <div className="form-group">
                        <label>User</label>
                        {modalUser ? (
                            <input type="text" name="username" value={modalUser.username} readOnly className="readonly" />
                        ) : (
                            <select name="username">
                                {users.map(u => <option key={u.id} value={u.username}>{u.username} (🦆 {u.duck_balance?.toLocaleString(undefined, { maximumFractionDigits: 3 })})</option>)}
                            </select>
                        )}
                    </div>
                    <div className={`form-group ${formErrors.amount ? 'has-error' : ''}`}>
                        <label>Adjustment Amount</label>
                        <input type="number" name="amount" step="any" placeholder="e.g. 10 or -5" />
                        {formErrors.amount ? (
                            <span className="error-message">{formErrors.amount}</span>
                        ) : (
                            <small>Positive to add, negative to subtract.</small>
                        )}
                    </div>
                    <button type="submit" className="btn-primary" disabled={formLoading}>
                        {formLoading ? 'Applying...' : 'Apply Adjustment'}
                    </button>
                </form>
            </Modal>

            <Modal isOpen={activeModal === 'reset'} onClose={() => { setActiveModal(null); setModalUser(null); }} title="Reset User Password">
                <form onSubmit={handleResetPassword} className="admin-form" noValidate>
                    <div className="form-group">
                        <label>User</label>
                        <input type="text" name="username" value={modalUser?.username || ''} readOnly className="readonly" />
                    </div>
                    <div className={`form-group ${formErrors.new_password ? 'has-error' : ''}`}>
                        <label>New Password</label>
                        <input type="password" name="new_password" />
                        {formErrors.new_password && <span className="error-message">{formErrors.new_password}</span>}
                    </div>
                    <div className={`form-group ${formErrors.confirm_password ? 'has-error' : ''}`}>
                        <label>Confirm Password</label>
                        <input type="password" name="confirm_password" />
                        {formErrors.confirm_password && <span className="error-message">{formErrors.confirm_password}</span>}
                    </div>
                    <button type="submit" className="btn-warning" disabled={formLoading}>
                        {formLoading ? 'Resetting...' : 'Reset Password'}
                    </button>
                </form>
            </Modal>

            <Modal isOpen={activeModal === 'startConv'} onClose={() => setActiveModal(null)} title="Start New Conversation">
                <form onSubmit={handleStartConversation} className="admin-form">
                    <div className="form-group">
                        <label>Conversation Topic (Optional)</label>
                        <input type="text" name="title" placeholder="Leave empty for default..." />
                    </div>
                    <button type="submit" className="btn-primary" disabled={formLoading}>
                        {formLoading ? 'Starting...' : 'Start Conversation'}
                    </button>
                </form>
            </Modal>
        </div>
    );
};

export default AdminDashboard;

