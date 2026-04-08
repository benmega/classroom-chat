import React, { useState, useEffect } from 'react';
import { 
    Users as UsersIcon, 
    Search, 
    Plus, 
    ArrowUpCircle, 
    Key, 
    Trash2, 
    RefreshCw,
    X,
    Shield,
    Smartphone,
    Monitor,
    ChevronLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import client from '../../api/client';
import toast from 'react-hot-toast';
import SmartImage from '../../components/common/SmartImage';
import './Users.css';

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

const Users = () => {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isRefreshing, setIsRefreshing] = useState(false);
    
    // Modal States
    const [modalUser, setModalUser] = useState(null);
    const [activeModal, setActiveModal] = useState(null); // 'create', 'adjust', 'reset'
    
    // Form States
    const [formLoading, setFormLoading] = useState(false);
    const [formErrors, setFormErrors] = useState({});

    const fetchUsers = async () => {
        setIsRefreshing(true);
        try {
            const response = await client.get('/api/admin/users');
            setUsers(response.data);
        } catch (error) {
            console.error('Error fetching users:', error);
            toast.error('Failed to load users list.');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleCreateUser = async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const username = formData.get('username');
        const password = formData.get('password');
        
        const errors = {};
        if (!username) errors.username = 'Username is required';
        if (!password) errors.password = 'Initial password is required';
        
        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            return;
        }
        
        setFormLoading(true);
        try {
            const response = await client.post('/api/admin/create_user', formData);
            if (response.data.success) {
                toast.success(response.data.message);
                setActiveModal(null);
                fetchUsers();
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
        
        setFormLoading(true);
        try {
            const response = await client.post('/api/admin/adjust_ducks', formData);
            if (response.data.success) {
                toast.success(response.data.message);
                setActiveModal(null);
                fetchUsers();
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
        
        if (data.new_password !== data.confirm_password) {
            toast.error('Passwords do not match.');
            return;
        }

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

    const handleRemoveUser = async (username) => {
        if (!window.confirm(`Are you sure you want to PERMANENTLY remove @${username}?`)) return;
        
        try {
            const formData = new FormData();
            formData.append('username', username);
            const response = await client.post('/api/admin/remove_user', formData);
            if (response.data.success) {
                toast.success(response.data.message);
                fetchUsers();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to remove user.');
        }
    };

    const filteredUsers = users.filter(u => 
        u.username.toLowerCase().includes(searchTerm.toLowerCase()) || 
        u.nickname?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (isLoading) return (
        <div className="admin-loading-container">
            <div className="admin-loader"></div>
            <p>Loading User Directory...</p>
        </div>
    );

    return (
        <div className="admin-users-page">
            <header className="page-header">
                <div className="header-left">
                    <button onClick={() => navigate('/admin')} className="back-btn">
                        <ChevronLeft size={20} /> Back
                    </button>
                    <div>
                        <h1>User Directory</h1>
                        <p>Manage all registered students and administrators.</p>
                    </div>
                </div>
                <div className="header-actions">
                    <div className="search-bar">
                        <Search size={18} />
                        <input 
                            type="text" 
                            placeholder="Search by name or @username..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button className="primary-btn" onClick={() => setActiveModal('create')}>
                        <Plus size={18} /> Add User
                    </button>
                    <button 
                        className={`refresh-btn ${isRefreshing ? 'spinning' : ''}`}
                        onClick={fetchUsers}
                        disabled={isRefreshing}
                    >
                        <RefreshCw size={18} />
                    </button>
                </div>
            </header>

            <div className="users-stats-row">
                <div className="stat-mini-card">
                    <span className="label">Total Users</span>
                    <span className="value">{users.length}</span>
                </div>
                <div className="stat-mini-card">
                    <span className="label">Online Now</span>
                    <span className="value">{users.filter(u => u.is_online).length}</span>
                </div>
                <div className="stat-mini-card">
                    <span className="label">Admins</span>
                    <span className="value">{users.filter(u => u.is_admin).length}</span>
                </div>
                <div className="stat-mini-card">
                    <span className="label">Pending Approval</span>
                    <span className="value">{users.filter(u => !u.is_approved && !u.is_admin).length}</span>
                </div>
            </div>

            <div className="users-table-container card">
                <table className="users-table">
                    <thead>
                        <tr>
                            <th>User Profile</th>
                            <th>Account Type</th>
                            <th>Economy</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredUsers.length > 0 ? (
                            filteredUsers.map(u => (
                                <tr key={u.id} className={u.is_admin ? 'admin-row' : ''}>
                                    <td>
                                        <div className="user-profile-cell">
                                            <SmartImage 
                                                src={u.profile_picture ? `/user/profile_pictures/${u.profile_picture}` : ''} 
                                                alt="" 
                                                className="avatar"
                                                fallbackType="avatar"
                                            />
                                            <div className="info">
                                                <div className="name">{u.nickname || u.username}</div>
                                                <div className="handle">@{u.username}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="type-badge">
                                            {u.is_admin ? (
                                                <span className="badge admin"><Shield size={12} /> Administrator</span>
                                            ) : (
                                                <span className="badge student">Student</span>
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        <div className="economy-info">
                                            <div className="duck-count">🦆 {u.duck_balance?.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                                            <div className="level-info">Lvl: {u.total_levels || 0}</div>
                                        </div>
                                    </td>
                                    <td>
                                        <div className={`status-indicator ${u.is_online ? 'online' : 'offline'}`}>
                                            <span className="dot"></span>
                                            {u.is_online ? 'Active' : 'Offline'}
                                        </div>
                                    </td>
                                    <td>
                                        <div className="action-group">
                                            <button 
                                                className="action-btn adjust" 
                                                onClick={() => { setModalUser(u); setActiveModal('adjust'); }}
                                                title="Adjust Balance"
                                            >
                                                <ArrowUpCircle size={16} />
                                            </button>
                                            <button 
                                                className="action-btn pass" 
                                                onClick={() => { setModalUser(u); setActiveModal('reset'); }}
                                                title="Reset Password"
                                            >
                                                <Key size={16} />
                                            </button>
                                            {!u.is_admin && (
                                                <button 
                                                    className="action-btn delete" 
                                                    onClick={() => handleRemoveUser(u.username)}
                                                    title="Permanently Remove"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="5" className="empty-row">
                                    No users found matching your search.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modals - Reused from Dashboard Logic */}
            <Modal isOpen={activeModal === 'create'} onClose={() => setActiveModal(null)} title="Create New Account">
                <form onSubmit={handleCreateUser} className="admin-form">
                    <div className="form-group">
                        <label>Username</label>
                        <input type="text" name="username" placeholder="lowercas_only" required />
                        {formErrors.username && <span className="error">{formErrors.username}</span>}
                    </div>
                    <div className="form-group">
                        <label>Initial Password</label>
                        <input type="password" name="password" required />
                        {formErrors.password && <span className="error">{formErrors.password}</span>}
                    </div>
                    <div className="form-group">
                        <label>Initial Duck Balance</label>
                        <input type="number" name="ducks" defaultValue="0" min="0" />
                    </div>
                    <button type="submit" className="submit-btn" disabled={formLoading}>
                        {formLoading ? 'Creating...' : 'Create User Account'}
                    </button>
                </form>
            </Modal>

            <Modal isOpen={activeModal === 'adjust'} onClose={() => { setActiveModal(null); setModalUser(null); }} title="Adjust Economy">
                <form onSubmit={handleAdjustDucks} className="admin-form">
                    <div className="form-group">
                        <label>Target User</label>
                        <input type="text" name="username" value={modalUser?.username || ''} readOnly className="readonly" />
                    </div>
                    <div className="form-group">
                        <label>Duck Adjustment</label>
                        <input type="number" name="amount" step="any" placeholder="e.g. 10 or -5" required />
                        <small>Positive to award, negative to penalize.</small>
                    </div>
                    <button type="submit" className="submit-btn" disabled={formLoading}>
                        {formLoading ? 'Processing...' : 'Apply Duck Adjustment'}
                    </button>
                </form>
            </Modal>

            <Modal isOpen={activeModal === 'reset'} onClose={() => { setActiveModal(null); setModalUser(null); }} title="Force Password Reset">
                <form onSubmit={handleResetPassword} className="admin-form">
                    <div className="form-group">
                        <label>User</label>
                        <input type="text" name="username" value={modalUser?.username || ''} readOnly className="readonly" />
                    </div>
                    <div className="form-group">
                        <label>New Password</label>
                        <input type="password" name="new_password" required />
                    </div>
                    <div className="form-group">
                        <label>Confirm New Password</label>
                        <input type="password" name="confirm_password" required />
                    </div>
                    <button type="submit" className="submit-btn danger" disabled={formLoading}>
                        {formLoading ? 'Resetting...' : 'Update Password'}
                    </button>
                </form>
            </Modal>
        </div>
    );
};

export default Users;
