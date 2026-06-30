import React, { useState, useEffect } from 'react';
import { 
    FileText, 
    Download, 
    Eye, 
    CheckCircle, 
    User, 
    Award,
    Clock,
    Search,
    AlertCircle,
    ExternalLink
} from 'lucide-react';
import client from '../../api/client';
import toast from 'react-hot-toast';
import './AdminCertificates.css';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import Skeleton from '../../components/common/Skeleton';

const AdminCertificates = () => {
    const [certificates, setCertificates] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchCertificates = async () => {
        setIsLoading(true);
        try {
            const response = await client.get('/api/achievements/admin/certificates');
            if (response.data.status === 'success' || response.data.certificates) {
                setCertificates(response.data.certificates || response.data.data.certificates);
            }
        } catch {
            toast.error('Failed to load certificates.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchCertificates();
    }, []);

    const handleMarkReviewed = async (certId) => {
        try {
            const response = await client.post(`/api/achievements/admin/certificates/reviewed/${certId}`);
            if (response.data.status === 'success') {
                toast.success(response.data.message);
                setCertificates(prev => prev.filter(c => c.id !== certId));
            }
        } catch {
            toast.error('Failed to mark as reviewed.');
        }
    };

    const handleApproveAll = async () => {
        if (!window.confirm("Are you sure you want to mark all pending certificates as reviewed?")) return;
        try {
            const response = await client.post('/api/achievements/admin/certificates/reviewed/all');
            if (response.data.status === 'success') {
                toast.success(response.data.message);
                setCertificates([]); // all unreviewed certificates are now reviewed
            }
        } catch {
            toast.error('Failed to mark all as reviewed.');
        }
    };

    const filteredCerts = certificates.filter(c => 
        c.user?.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.user?.nickname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.achievement?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (isLoading) {
        return (
            <div className="admin-certificates-page">
                <AdminPageHeader title="Certificate Approvals" />
                <div className="controls-bar">
                    <Skeleton width="300px" height="40px" borderRadius="8px" />
                </div>
                <div className="certs-grid">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="cert-review-card" style={{ display: 'flex', gap: '16px', padding: '16px' }}>
                            <Skeleton width="200px" height="140px" borderRadius="8px" />
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <Skeleton width="60%" height="24px" />
                                <Skeleton width="40%" height="16px" />
                                <Skeleton width="30%" height="16px" />
                                <div style={{ marginTop: 'auto', display: 'flex', gap: '8px' }}>
                                    <Skeleton width="100px" height="36px" borderRadius="6px" />
                                    <Skeleton width="40px" height="36px" borderRadius="6px" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="admin-certificates-page">
            <AdminPageHeader 
                title="Certificate Approvals" 
            />

            <div className="controls-bar">
                <div className="search-box">
                    <Search size={18} />
                    <input 
                        type="text" 
                        placeholder="Search by student or achievement..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                {certificates.length > 0 && (
                    <div className="bulk-actions">
                        <a 
                            href="/api/achievements/admin/certificates/download_all"
                            className="btn-secondary admin-cert-action-btn"
                        >
                            <Download size={16} /> Download All
                        </a>
                        <button 
                            className="btn-primary admin-cert-action-btn-primary"
                            onClick={handleApproveAll}
                        >
                            <CheckCircle size={16} /> Approve All
                        </button>
                    </div>
                )}
            </div>

            <div className="certs-grid">
                {filteredCerts.length > 0 ? (
                    filteredCerts.map(cert => (
                        <div key={cert.id} className="cert-review-card">
                            <a 
                                href={`/api/achievements/view_certificate/${cert.id}`} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="cert-thumbnail" 
                                title="Click to view full certificate"
                            >
                                <iframe 
                                    src={`/api/achievements/view_certificate/${cert.id}#toolbar=0&navpanes=0&scrollbar=0`} 
                                    title="Certificate Preview" 
                                    frameBorder="0" 
                                    scrolling="no"
                                    tabIndex="-1"
                                ></iframe>
                                <div className="thumbnail-overlay">
                                    <Eye size={24} />
                                </div>
                            </a>

                            <div className="cert-content-wrapper">
                                <div className="cert-header-info">
                                    <h3>
                                        {cert.user?.nickname || cert.user?.username} 
                                        <span className="text-muted">@{cert.user?.username}</span>
                                    </h3>
                                    <div className="achievement-title">
                                        <Award size={16} /> 
                                        {cert.achievement?.name}
                                    </div>
                                    <div className="submission-date">
                                        <Clock size={14} /> 
                                        {new Date(cert.submitted_at).toLocaleDateString()}
                                    </div>
                                    {cert.url && (
                                        <a href={cert.url} target="_blank" rel="noopener noreferrer" className="original-link">
                                            <ExternalLink size={14} /> Original Link
                                        </a>
                                    )}
                                </div>

                                <div className="cert-actions">
                                    <button 
                                        onClick={() => handleMarkReviewed(cert.id)}
                                        className="btn-approve"
                                    >
                                        <CheckCircle size={16} /> Approve
                                    </button>
                                    <a 
                                        href={`/api/achievements/download_certificate/${cert.id}`} 
                                        className="btn-icon"
                                        title="Download PDF"
                                    >
                                        <Download size={16} />
                                    </a>
                                </div>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="empty-state card">
                        <AlertCircle size={48} />
                        <h3>No Pending Certificates</h3>
                        <p>All student submissions have been reviewed.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminCertificates;
