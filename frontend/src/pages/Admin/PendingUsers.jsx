import React, { useState, useEffect } from 'react';
import { 
    CheckCircle, 
    Shield,
    Trash2
} from 'lucide-react';
import client from '../../api/client';
import toast from 'react-hot-toast';
import './PendingUsers.css';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import Skeleton from '../../components/common/Skeleton';
import SmartImage from '../../components/common/SmartImage';
import { getApiUrl } from '../../utils/apiUrl';

const PendingUsers = () => {
    const [users, setUsers] = useState([]);
    const [isLoadingUsers, setIsLoadingUsers] = useState(true);
    const [isProcessing, setIsProcessing] = useState(null);

    const fetchPendingUsers = async () => {
        setIsLoadingUsers(true);
        try {
            const response = await client.get('/api/admin/pending_users');
            if (response.data.status === 'success') {
                setUsers(response.data.data.users);
            }
        } catch {
            toast.error('Failed to load pending users.');
        } finally {
            setIsLoadingUsers(false);
        }
    };

    useEffect(() => {
        fetchPendingUsers();
    }, []);

    // --- User Approvals ---
    const handleApproveUser = async (userId) => {
        setIsProcessing(`user-${userId}`);
        try {
            const response = await client.post(`/api/admin/approve_user/${userId}`);
            if (response.data.status === 'success') {
                toast.success(response.data.data.message);
                setUsers(prev => prev.filter(u => u.id !== userId));
            }
        } catch {
            toast.error('Failed to approve user.');
        } finally {
            setIsProcessing(null);
        }
    };

    const handleRejectUser = async (userId) => {
        if (!window.confirm('Are you sure you want to reject and delete this user?')) return;
        setIsProcessing(`user-${userId}`);
        try {
            const response = await client.post(`/api/admin/reject_user/${userId}`);
            if (response.data.status === 'success') {
                toast.success(response.data.data.message);
                setUsers(prev => prev.filter(u => u.id !== userId));
            }
        } catch {
            toast.error('Failed to reject user.');
        } finally {
            setIsProcessing(null);
        }
    };

    if (isLoadingUsers) return (
        <div className="admin-pending-users-page animate-page-entry">
            <span style={{ display: 'none' }}>Loading Account Approvals...</span>
            <header className="page-header">
                <Skeleton height="40px" width="300px" className="skeleton-title" />
            </header>
            <h2 className="section-title pending-section-title">
                <Skeleton height="24px" width="200px" />
            </h2>
            <div className="users-table-container card">
                {[1, 2, 3].map(i => (
                    <div key={i} className="users-skeleton-row" style={{ padding: '15px' }}>
                        <Skeleton height="50px" />
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div className="admin-pending-users-page">
            <AdminPageHeader 
                title="Account Approvals" 
            />

            {/* Pending Signups Section */}
            <h2 className="section-title pending-section-title">Pending Signups</h2>
            <div className="users-table-container card">
                {users.length > 0 ? (
                    <div className="table-responsive">
                        <table className="users-table">
                            <thead>
                                <tr>
                                    <th>User Profile</th>
                                    <th>Status</th>
                                    <th style={{ textAlign: 'right', paddingRight: '24px' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map(user => (
                                    <tr key={user.id}>
                                        <td>
                                            <div className="user-profile-cell">
                                                <SmartImage 
                                                    src={user.profile_picture ? getApiUrl(`/user/profile_pictures/${user.profile_picture}`) : ''} 
                                                    alt="" 
                                                    className="avatar"
                                                    fallbackType="avatar"
                                                />
                                                <div className="info">
                                                    <div className="name">{user.nickname || user.username}</div>
                                                    <div className="handle-row">
                                                        <span className="handle">@<span>{user.username}</span></span>
                                                        <span className={`inline-role-label ${user.role || 'student'}`}>
                                                            {user.role || 'student'}
                                                        </span>
                                                        <span className="inline-role-label pending">
                                                            Pending
                                                        </span>
                                                    </div>
                                                    {user.role === 'student' && user.drawer && (
                                                        <div className="drawer-info drawer-info-text">
                                                            Drawer: <span className="drawer-code">{user.drawer}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="status-cell">
                                                <span className="status-awaiting">Awaiting Review</span>
                                            </div>
                                        </td>
                                        <td>
                                            <div className="user-actions-cell" style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', paddingRight: '12px' }}>
                                                <button 
                                                    type="button"
                                                    className="btn-reject"
                                                    onClick={() => handleRejectUser(user.id)}
                                                    disabled={isProcessing === `user-${user.id}`}
                                                    title="Reject and Delete"
                                                >
                                                    <Trash2 size={16} /> Reject
                                                </button>
                                                <button 
                                                    type="button"
                                                    className="btn-approve"
                                                    onClick={() => handleApproveUser(user.id)}
                                                    disabled={isProcessing === `user-${user.id}`}
                                                >
                                                    {isProcessing === `user-${user.id}` ? (
                                                        'Approving...'
                                                    ) : (
                                                        <>
                                                            <CheckCircle size={16} /> Approve Account
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="empty-state-card pending-empty-state">
                        <Shield size={32} className="pending-empty-icon" />
                        <h3>No Pending Signups</h3>
                        <p>All signups have been processed.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PendingUsers;
