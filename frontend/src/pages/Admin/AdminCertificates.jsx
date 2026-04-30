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
    AlertCircle
} from 'lucide-react';
import client from '../../api/client';
import toast from 'react-hot-toast';
import './AdminCertificates.css';
import AdminPageHeader from '../../components/admin/AdminPageHeader';

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

    const filteredCerts = certificates.filter(c => 
        c.user?.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.user?.nickname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.achievement?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (isLoading) return <div className="admin-loading">Loading Certificates...</div>;

    return (
        <div className="admin-certificates-page">
            <AdminPageHeader 
                title="Certificate Review" 
                description="Verify and approve external achievement submissions."
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
            </div>

            <div className="certs-grid">
                {filteredCerts.length > 0 ? (
                    filteredCerts.map(cert => (
                        <div key={cert.id} className="cert-review-card card">
                            <div className="cert-status-badge pending">
                                <Clock size={14} /> Pending Review
                            </div>
                            
                            <div className="cert-header">
                                <div className="user-info">
                                    <div className="user-avatar">
                                        <User size={24} />
                                    </div>
                                    <div>
                                        <h3>{cert.user?.nickname || cert.user?.username}</h3>
                                        <span>@{cert.user?.username}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="cert-body">
                                <div className="achievement-info">
                                    <Award size={18} />
                                    <span>{cert.achievement?.name}</span>
                                </div>
                                <div className="submission-date">
                                    <Clock size={16} />
                                    <span>Submitted {new Date(cert.submitted_at).toLocaleDateString()}</span>
                                </div>
                                {cert.url && (
                                    <div className="cert-url">
                                        <Eye size={16} />
                                        <a href={cert.url} target="_blank" rel="noopener noreferrer">View Original Link</a>
                                    </div>
                                )}
                            </div>

                            <div className="cert-footer">
                                <div className="file-actions">
                                    <a 
                                        href={`/api/achievements/view_certificate/${cert.id}`} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="btn-view"
                                    >
                                        <Eye size={16} /> View PDF
                                    </a>
                                    <a 
                                        href={`/api/achievements/download_certificate/${cert.id}`} 
                                        className="btn-download"
                                    >
                                        <Download size={16} />
                                    </a>
                                </div>
                                <button 
                                    onClick={() => handleMarkReviewed(cert.id)}
                                    className="btn-approve"
                                >
                                    <CheckCircle size={18} /> Mark Reviewed
                                </button>
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
