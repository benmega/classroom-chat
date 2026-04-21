import React, { useState, useEffect } from 'react';
import { 
    Users as UsersIcon, 
    Search, 
    Plus, 
    ArrowUpCircle, 
    Key, 
    Trash2, 
    RefreshCw,
    Shield,
    ChevronLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import client from '../../api/client';
import toast from 'react-hot-toast';
import SmartImage from '../../components/common/SmartImage';
import { 
    CreateUserModal, 
    AdjustDucksModal, 
    ResetPasswordModal 
} from '../../components/admin/AdminModals';
import './Users.css';
import Skeleton from '../../components/common/Skeleton';

const Users = () => {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isRefreshing, setIsRefreshing] = useState(false);
    
    // Pagination state
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalUsers, setTotalUsers] = useState(0);
    
    // Modal States
    const [modalUser, setModalUser] = useState(null);
    const [activeModal, setActiveModal] = useState(null); // 'create', 'adjust', 'reset'
    
    // Form States
    const [formLoading, setFormLoading] = useState(false);
    const [formErrors, setFormErrors] = useState({});

    const fetchUsers = async (targetPage = page) => {
        setIsRefreshing(true);
        try {
            const response = await client.get(`/api/admin/users?page=${targetPage}&per_page=50`);
            const data = response.data;
            
            if (Array.isArray(data)) {
                setUsers(data);
                setTotalUsers(data.length);
                setTotalPages(1);
            } else {
                setUsers(data.users || []);
                setTotalUsers(data.total || 0);
                setTotalPages(data.pages || 1);
                setPage(data.current_page || 1);
            }
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
        
        setFormErrors({});
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
        
        if (!formData.get('amount')) {
            setFormErrors({ amount: 'Adjustment amount is required' });
            return;
        }

        setFormErrors({});
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
                fetchUsers(page);
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
        <div className="admin-users-page">
            <header className="page-header">
                <Skeleton height="40px" width="300px" className="skeleton-title" />
                <Skeleton height="20px" width="500px" />
            </header>
            <div className="users-table-container card">
                {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} style={{ padding: '20px', borderBottom: '1px solid #eee' }}>
                        <Skeleton height="60px" />
                    </div>
                ))}
            </div>
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
                    <span className="value">{totalUsers || users.length}</span>
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
                
                <div className="pagination-container">
                    <div className="pagination-info">
                        Showing <strong>{(page - 1) * 50 + 1}-{Math.min(page * 50, totalUsers)}</strong> of <strong>{totalUsers}</strong> users
                    </div>
                    <div className="pagination-controls">
                        <button 
                            className="pagination-btn" 
                            onClick={() => fetchUsers(page - 1)}
                            disabled={page <= 1 || isRefreshing}
                        >
                            <ChevronLeft size={16} /> Previous
                        </button>
                        <div className="pagination-pages">
                            <span className="page-indicator">Page <strong>{page}</strong> of {totalPages}</span>
                        </div>
                        <button 
                            className="pagination-btn" 
                            onClick={() => fetchUsers(page + 1)}
                            disabled={page >= totalPages || isRefreshing}
                        >
                            Next <ChevronLeft size={16} style={{ transform: 'rotate(180deg)' }} />
                        </button>
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
        </div>
    );
};

export default Users;
