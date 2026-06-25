import React, { useState, useEffect } from 'react';
import { 
    Users, 
    CheckCircle, 
    XCircle, 
    User, 
    Clock, 
    Shield,
    Trash2
} from 'lucide-react';
import client from '../../api/client';
import toast from 'react-hot-toast';
import './PendingUsers.css';
import AdminPageHeader from '../../components/admin/AdminPageHeader';

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
        <div className="admin-loading-container">
            <div className="admin-loader"></div>
            <p>Loading Account Approvals...</p>
        </div>
    );

    return (
        <div className="admin-pending-users-page">
            <AdminPageHeader 
                title="Account Approvals" 
            />

            {/* Pending Signups Section */}
            <h2 className="section-title" style={{ marginTop: '2rem', marginBottom: '1rem', paddingLeft: '0.5rem' }}>Pending Signups</h2>
            <div className="users-list">
                {users.length > 0 ? (
                    users.map(user => (
                        <div key={user.id} className="user-card card">
                            <div className="user-card-header">
                                <div className="user-info">
                                    <div className="avatar-placeholder">
                                        <User size={24} />
                                    </div>
                                    <div>
                                        <h3>{user.username}</h3>
                                        <p className="nickname text-muted">{user.nickname}</p>
                                    </div>
                                </div>
                                <div className="user-badge pending">
                                    <Clock size={14} /> Pending
                                </div>
                            </div>

                            <div className="user-details">
                                <div className="detail-row">
                                    <span className="label">Username</span>
                                    <span className="value">{user.username}</span>
                                </div>
                                <div className="detail-row">
                                    <span className="label">Registered</span>
                                    <span className="value">Awaiting Review</span>
                                </div>
                            </div>

                            <div className="user-actions">
                                <button 
                                    type="button"
                                    className="btn-reject"
                                    onClick={() => handleRejectUser(user.id)}
                                    disabled={isProcessing === `user-${user.id}`}
                                    title="Reject and Delete"
                                >
                                    <Trash2 size={18} /> Reject
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
                                            <CheckCircle size={18} /> Approve Account
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="empty-state-card" style={{ padding: '2rem', minHeight: 'auto' }}>
                        <Shield size={32} style={{ color: 'var(--primary-color)', marginBottom: '1rem' }} />
                        <h3>No Pending Signups</h3>
                        <p>All signups have been processed.</p>
                    </div>
                )}
            </div>

        </div>
    );
};

export default PendingUsers;
