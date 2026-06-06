import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Users, Shield } from 'lucide-react';
import client from '../../api/client';
import toast from 'react-hot-toast';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import './PendingUsers.css';

const AdminConnectionRequests = () => {
    const [requests, setRequests] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(null);

    const fetchRequests = async () => {
        setIsLoading(true);
        try {
            const response = await client.get('/api/admin/connection_requests');
            setRequests(response.data.data?.requests || []);
        } catch {
            toast.error('Failed to load connection requests.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    const handleApprove = async (reqId) => {
        setIsProcessing(reqId);
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

    const handleReject = async (reqId) => {
        setIsProcessing(reqId);
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

    if (isLoading) return (
        <div className="admin-loading-container">
            <div className="admin-loader"></div>
            <p>Loading Requests...</p>
        </div>
    );

    return (
        <div className="admin-pending-users-page">
            <AdminPageHeader 
                title="Parent Connection Requests" 
                description="Review and approve parents requesting to link to student accounts."
            />

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
                                    <div className="detail-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '4px' }}>
                                        <span className="label">Message</span>
                                        <span className="value" style={{ fontStyle: 'italic', opacity: 0.8 }}>"{req.message}"</span>
                                    </div>
                                )}
                            </div>

                            <div className="user-actions">
                                <button 
                                    className="btn-reject"
                                    onClick={() => handleReject(req.id)}
                                    disabled={isProcessing === req.id}
                                >
                                    <XCircle size={18} /> Reject
                                </button>
                                <button 
                                    className="btn-approve"
                                    onClick={() => handleApprove(req.id)}
                                    disabled={isProcessing === req.id}
                                >
                                    <CheckCircle size={18} /> Approve
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="empty-state-card">
                        <div className="empty-icon-wrapper">
                            <Shield size={48} />
                        </div>
                        <h3>No Pending Requests</h3>
                        <p>There are no pending parent-student connection requests.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminConnectionRequests;
