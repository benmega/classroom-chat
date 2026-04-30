import React, { useState, useEffect } from 'react';
import { 
    Users, 
    CheckCircle, 
    XCircle, 
    User, 
    Clock, 
    ArrowLeft,
    Shield,
    Trash2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import client from '../../api/client';
import toast from 'react-hot-toast';
import './PendingUsers.css';
import AdminPageHeader from '../../components/admin/AdminPageHeader';

const PendingUsers = () => {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(null);

    const fetchPendingUsers = async () => {
        setIsLoading(true);
        try {
            const response = await client.get('/api/admin/pending_users');
            if (response.data.status === 'success') {
                setUsers(response.data.data.users);
            }
        } catch (error) {
            toast.error('Failed to load pending users.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchPendingUsers();
    }, []);

    const handleApprove = async (userId) => {
        setIsProcessing(userId);
        try {
            const response = await client.post(`/api/admin/approve_user/${userId}`);
            if (response.data.status === 'success') {
                toast.success(response.data.data.message);
                setUsers(prev => prev.filter(u => u.id !== userId));
            }
        } catch (error) {
            toast.error('Failed to approve user.');
        } finally {
            setIsProcessing(null);
        }
    };

    const handleReject = async (userId) => {
        if (!window.confirm('Are you sure you want to reject and delete this user?')) return;
        
        setIsProcessing(userId);
        try {
            const response = await client.post(`/api/admin/reject_user/${userId}`);
            if (response.data.status === 'success') {
                toast.success(response.data.data.message);
                setUsers(prev => prev.filter(u => u.id !== userId));
            }
        } catch (error) {
            toast.error('Failed to reject user.');
        } finally {
            setIsProcessing(null);
        }
    };

    if (isLoading) return (
        <div className="admin-loading-container">
            <div className="admin-loader"></div>
            <p>Loading Pending Users...</p>
        </div>
    );

    return (
        <div className="admin-pending-users-page">
            <AdminPageHeader 
                title="User Approvals" 
                description="Manage new account registrations that require your approval."
            />

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
                                    onClick={() => handleReject(user.id)}
                                    disabled={isProcessing === user.id}
                                    title="Reject and Delete"
                                >
                                    <Trash2 size={18} /> Reject
                                </button>
                                <button 
                                    type="button"
                                    className="btn-approve"
                                    onClick={() => handleApprove(user.id)}
                                    disabled={isProcessing === user.id}
                                >
                                    {isProcessing === user.id ? (
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
                    <div className="empty-state-card">
                        <div className="empty-icon-wrapper">
                            <Shield size={48} />
                        </div>
                        <h3>No Pending Approvals</h3>
                        <p>All signups have been processed. Great job!</p>
                        <button onClick={() => navigate('/admin')} className="return-btn">
                            Return to Dashboard
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PendingUsers;
