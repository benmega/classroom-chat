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
    const [requests, setRequests] = useState([]);
    const [isLoadingUsers, setIsLoadingUsers] = useState(true);
    const [isLoadingRequests, setIsLoadingRequests] = useState(true);
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

    const fetchRequests = async () => {
        setIsLoadingRequests(true);
        try {
            const response = await client.get('/api/admin/connection_requests');
            setRequests(response.data.data?.requests || []);
        } catch {
            toast.error('Failed to load connection requests.');
        } finally {
            setIsLoadingRequests(false);
        }
    };

    useEffect(() => {
        fetchPendingUsers();
        fetchRequests();
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

    // --- Connection Requests ---
    const handleApproveRequest = async (reqId) => {
        setIsProcessing(`req-${reqId}`);
        try {
            await client.post(`/api/admin/connection_requests/${reqId}/approve`);
            toast.success('Connection approved!');
            setRequests(prev => prev.filter(r => r.id !== reqId));
        } catch {
            toast.error('Failed to approve request.');
        } finally {
            setIsProcessing(null);
        }
    };

    const handleRejectRequest = async (reqId) => {
        setIsProcessing(`req-${reqId}`);
        try {
            await client.post(`/api/admin/connection_requests/${reqId}/reject`);
            toast.success('Connection rejected.');
            setRequests(prev => prev.filter(r => r.id !== reqId));
        } catch {
            toast.error('Failed to reject request.');
        } finally {
            setIsProcessing(null);
        }
    };

    if (isLoadingUsers && isLoadingRequests) return (
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
            <h2 className="section-title pending-section-title">Pending Signups</h2>
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
                    <div className="empty-state-card pending-empty-state">
                        <Shield size={32} className="pending-empty-icon" />
                        <h3>No Pending Signups</h3>
                        <p>All signups have been processed.</p>
                    </div>
                )}
            </div>

            {/* Parent Connection Requests Section */}
            <h2 className="section-title pending-section-title-mt3">Parent Connection Requests</h2>
            <div className="users-list">
                {requests.length > 0 ? (
                    requests.map(req => (
                        <div key={req.id} className="user-card card">
                            <div className="user-card-header">
                                <div className="user-info">
                                    <div className="avatar-placeholder">
                                        <Users size={24} />
                                    </div>
                                    <div>
                                        <h3>{req.parent?.username}</h3>
                                        <p className="nickname text-muted">{req.relationship}</p>
                                    </div>
                                </div>
                                <div className="user-badge pending">
                                    Pending
                                </div>
                            </div>

                            <div className="user-details">
                                <div className="detail-row">
                                    <span className="label">Student</span>
                                    <span className="value">@{req.student?.username}</span>
                                </div>
                                {req.message && (
                                    <div className="detail-row detail-row-column">
                                        <span className="label">Message</span>
                                        <span className="value pending-message-value">"{req.message}"</span>
                                    </div>
                                )}
                            </div>

                            <div className="user-actions">
                                <button 
                                    className="btn-reject"
                                    onClick={() => handleRejectRequest(req.id)}
                                    disabled={isProcessing === `req-${req.id}`}
                                >
                                    <XCircle size={18} /> Reject
                                </button>
                                <button 
                                    className="btn-approve"
                                    onClick={() => handleApproveRequest(req.id)}
                                    disabled={isProcessing === `req-${req.id}`}
                                >
                                    <CheckCircle size={18} /> Approve
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="empty-state-card pending-empty-state">
                        <Shield size={32} className="pending-empty-icon" />
                        <h3>No Pending Connection Requests</h3>
                        <p>There are no pending parent-student connection requests.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PendingUsers;
