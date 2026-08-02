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
    ExternalLink,
    Upload
} from 'lucide-react';
import client from '../../api/client';
import toast from 'react-hot-toast';
import { getApiUrl } from '../../utils/apiUrl';
import './AdminCertificates.css';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import Skeleton from '../../components/common/Skeleton';
import Modal from '../../components/common/Modal';

const COURSES = [
    { id: 'cs-1', name: 'CS1' },
    { id: 'cs-2', name: 'CS2' },
    { id: 'cs-3', name: 'CS3' },
    { id: 'cs-4', name: 'CS4' },
    { id: 'cs-5', name: 'CS5' },
    { id: 'cs-6', name: 'CS6' },
    { id: 'gd-1', name: 'GD1' },
    { id: 'gd-2', name: 'GD2' },
    { id: 'gd-3', name: 'GD3' },
    { id: 'wd-1', name: 'WD1' },
    { id: 'wd-2', name: 'WD2' },
    { id: 'oz-1', name: 'Ozaria 1' },
    { id: 'oz-2', name: 'Ozaria 2' },
    { id: 'oz-3', name: 'Ozaria 3' },
    { id: 'oz-4', name: 'Ozaria 4' },
];

const AdminCertificates = () => {
    const [activeTab, setActiveTab] = useState('pending'); // 'pending' or 'templates'
    
    // Pending Approvals State
    const [certificates, setCertificates] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Templates State
    const [templates, setTemplates] = useState({});
    const [isTemplatesLoading, setIsTemplatesLoading] = useState(false);
    
    // Upload Modal State
    const [uploadModalOpen, setUploadModalOpen] = useState(false);
    const [selectedCourseId, setSelectedCourseId] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    
    // Test Generate State
    const [testModalOpen, setTestModalOpen] = useState(false);
    const [testStudentName, setTestStudentName] = useState('');

    const fetchCertificates = async () => {
        setIsLoading(true);
        try {
            const response = await client.get('/api/achievements/admin/certificates');
            if (response.data.status === 'success' || response.data.certificates || response.data.data?.certificates) {
                setCertificates(response.data.certificates || response.data.data?.certificates || []);
            }
        } catch {
            toast.error('Failed to load certificates.');
        } finally {
            setIsLoading(false);
        }
    };

    const fetchTemplates = async () => {
        setIsTemplatesLoading(true);
        try {
            const response = await client.get('/api/achievements/admin/certificate_templates');
            const dataObj = response.data.data || response.data;
            if (response.data.status === 'success' || dataObj.templates) {
                const templatesMap = {};
                const list = dataObj.templates || response.data.templates || [];
                list.forEach(t => {
                    templatesMap[t.course_id] = t;
                });
                setTemplates(templatesMap);
            }
        } catch {
            toast.error('Failed to load templates.');
        } finally {
            setIsTemplatesLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'pending') {
            fetchCertificates();
        } else if (activeTab === 'templates') {
            fetchTemplates();
        }
    }, [activeTab]);

    const handleMarkReviewed = async (certId) => {
        try {
            const response = await client.post(`/api/achievements/admin/certificates/reviewed/${certId}`);
            if (response.data.status === 'success' || response.data.success) {
                toast.success(response.data.message || 'Marked as reviewed.');
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
            if (response.data.status === 'success' || response.data.success) {
                toast.success(response.data.message || 'All certificates approved.');
                setCertificates([]); 
            }
        } catch {
            toast.error('Failed to mark all as reviewed.');
        }
    };

    const handleUploadSubmit = async (e) => {
        e.preventDefault();
        if (!selectedFile || !selectedCourseId) return;

        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('template_file', selectedFile);

        try {
            const response = await client.post(`/api/achievements/admin/certificate_templates/${selectedCourseId}/upload`, formData);
            if (response.data.status === 'success' || response.data.success) {
                toast.success('Template uploaded successfully');
                setUploadModalOpen(false);
                setSelectedFile(null);
                fetchTemplates();
            } else {
                toast.error(response.data.error || 'Failed to upload template');
            }
        } catch (error) {
            toast.error(error.response?.data?.error || error.response?.data?.message || 'Failed to upload template');
        }
    };


    const handleTestGenerateSubmit = async (e) => {
        e.preventDefault();
        if (!testStudentName || !selectedCourseId) return;

        try {
            const response = await client.post(`/api/achievements/admin/certificate_templates/${selectedCourseId}/test_generate`, {
                student_name: testStudentName
            }, {
                responseType: 'blob'
            });
            
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${selectedCourseId}_test_cert.pdf`);
            document.body.appendChild(link);
            link.click();
            link.parentNode.removeChild(link);
            
            setTestModalOpen(false);
            setTestStudentName('');
            toast.success('Test certificate generated');
        } catch {
            toast.error('Failed to generate test certificate');
        }
    };

    const filteredCerts = certificates.filter(c => 
        c.user?.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.user?.nickname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.achievement?.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="admin-certificates-page">
            <AdminPageHeader title="Certificate Approvals" />
            
            <div className="tabs-container" style={{ display: 'flex', gap: '20px', marginBottom: '24px', borderBottom: '1px solid #e5e7eb' }}>
                <button 
                    onClick={() => setActiveTab('pending')}
                    style={{ 
                        padding: '12px 16px', 
                        background: 'none', 
                        border: 'none', 
                        borderBottom: activeTab === 'pending' ? '3px solid #4f46e5' : '3px solid transparent',
                        color: activeTab === 'pending' ? '#4f46e5' : '#6b7280',
                        cursor: 'pointer',
                        fontWeight: activeTab === 'pending' ? '600' : '500',
                        fontSize: '1rem'
                    }}
                >
                    Pending Approvals
                </button>
                <button 
                    onClick={() => setActiveTab('templates')}
                    style={{ 
                        padding: '12px 16px', 
                        background: 'none', 
                        border: 'none', 
                        borderBottom: activeTab === 'templates' ? '3px solid #4f46e5' : '3px solid transparent',
                        color: activeTab === 'templates' ? '#4f46e5' : '#6b7280',
                        cursor: 'pointer',
                        fontWeight: activeTab === 'templates' ? '600' : '500',
                        fontSize: '1rem'
                    }}
                >
                    Course Templates
                </button>
            </div>

            {activeTab === 'pending' ? (
                <>
                    {isLoading ? (
                        <div>
                            <div className="controls-bar">
                                <Skeleton width="300px" height="40px" borderRadius="8px" />
                            </div>
                            <div className="certs-grid">
                                {[1, 2, 3, 4].map(i => (
                                    <div key={i} className="cert-review-card skeleton-card-layout">
                                        <Skeleton width="200px" height="140px" borderRadius="8px" />
                                        <div className="skeleton-content-layout">
                                            <Skeleton width="60%" height="24px" />
                                            <Skeleton width="40%" height="16px" />
                                            <Skeleton width="30%" height="16px" />
                                            <div className="skeleton-actions-layout">
                                                <Skeleton width="100px" height="36px" borderRadius="6px" />
                                                <Skeleton width="40px" height="36px" borderRadius="6px" />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <>
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
                                                href={getApiUrl(`/api/achievements/view_certificate/${cert.id}`)} 
                                                target="_blank" 
                                                rel="noopener noreferrer" 
                                                className="cert-thumbnail" 
                                                title="Click to view full certificate"
                                            >
                                                <iframe 
                                                    src={getApiUrl(`/api/achievements/view_certificate/${cert.id}#toolbar=0&navpanes=0&scrollbar=0`)} 
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
                                                    <div className="recommendation-badge-container" style={{ margin: '8px 0' }}>
                                                        {cert.is_auto_recommended ? (
                                                            <div className="badge-recommended" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', backgroundColor: '#e6f4ea', color: '#137333', borderRadius: '16px', fontSize: '0.85rem', fontWeight: '500' }}>
                                                                <CheckCircle size={14} /> System Recommends Approval
                                                            </div>
                                                        ) : (
                                                            <div className="badge-manual" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 10px', backgroundColor: '#f3f4f6', color: '#4b5563', border: '1px solid #d1d5db', borderRadius: '16px', fontSize: '0.85rem', fontWeight: '500' }}>
                                                                <AlertCircle size={14} /> Manual Review Needed
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="achievement-title">
                                                        <Award size={16} /> 
                                                        {cert.achievement?.name}
                                                    </div>
                                                    <div className="submission-date">
                                                        <Clock size={14} /> 
                                                        {new Date(cert.submitted_at).toLocaleDateString()}
                                                    </div>
                                                    {cert.recommendation_reason && (
                                                        <div className="recommendation-reason" style={{ fontSize: '0.85rem', color: '#5f6368', marginTop: '6px', fontStyle: 'italic', padding: '4px 8px', backgroundColor: '#f8f9fa', borderRadius: '4px', borderLeft: '3px solid #e5e7eb' }}>
                                                            {cert.recommendation_reason}
                                                        </div>
                                                    )}
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
                                                        href={getApiUrl(`/api/achievements/download_certificate/${cert.id}`)} 
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
                        </>
                    )}
                </>
            ) : (
                <div className="templates-section">
                    {isTemplatesLoading ? (
                        <div className="certs-grid">
                            {[1, 2, 3, 4, 5, 6].map(i => (
                                <div key={i} className="cert-review-card skeleton-card-layout">
                                    <Skeleton width="100%" height="200px" borderRadius="8px" />
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="certs-grid">
                            {COURSES.map(course => {
                                const template = templates[course.id];
                                const hasCustomTemplate = template && template.is_custom;
                                
                                return (
                                    <div key={course.id} className="cert-review-card template-card" style={{ flexDirection: 'column' }}>
                                        <div className="cert-thumbnail" style={{ width: '100%', height: '220px', position: 'relative', backgroundColor: '#f3f4f6' }}>
                                            <iframe 
                                                src={getApiUrl(`/api/achievements/admin/certificate_templates/${course.id}/view#toolbar=0&navpanes=0&scrollbar=0`)} 
                                                title={`${course.name} Template Preview`} 
                                                frameBorder="0" 
                                                scrolling="no"
                                                tabIndex="-1"
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            ></iframe>
                                            <div className="thumbnail-overlay" style={{ pointerEvents: 'none' }}></div>
                                        </div>

                                        <div className="cert-content-wrapper" style={{ padding: '16px', width: '100%' }}>
                                            <div className="cert-header-info">
                                                <h3 style={{ margin: '0 0 8px 0' }}>{course.name}</h3>
                                                <div style={{ display: 'inline-block', padding: '4px 8px', borderRadius: '12px', fontSize: '0.8rem', fontWeight: '500', backgroundColor: hasCustomTemplate ? '#e6f4ea' : '#f3f4f6', color: hasCustomTemplate ? '#137333' : '#4b5563' }}>
                                                    {hasCustomTemplate ? 'Custom Template Uploaded' : 'Default Canvas'}
                                                </div>
                                            </div>

                                            <div className="cert-actions" style={{ display: 'flex', gap: '8px', marginTop: '16px', width: '100%' }}>
                                                <button 
                                                    onClick={() => { setSelectedCourseId(course.id); setUploadModalOpen(true); }}
                                                    className="btn-secondary"
                                                    style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}
                                                >
                                                    <Upload size={16} /> Upload Template
                                                </button>
                                                <button 
                                                    onClick={() => { setSelectedCourseId(course.id); setTestModalOpen(true); }}
                                                    className="btn-primary"
                                                    style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}
                                                >
                                                    <FileText size={16} /> Test Generate
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* Upload Modal */}
            <Modal isOpen={uploadModalOpen} onClose={() => setUploadModalOpen(false)} title={`Upload Template for ${COURSES.find(c => c.id === selectedCourseId)?.name}`}>
                <form onSubmit={handleUploadSubmit}>
                    <div style={{ marginBottom: '16px' }}>
                        <label htmlFor="upload-pdf-file" style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Select PDF File</label>
                        <input 
                            id="upload-pdf-file"
                            type="file" 
                            accept="application/pdf"
                            onChange={(e) => setSelectedFile(e.target.files[0])}
                            required
                            style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                        />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                        <button type="button" onClick={() => setUploadModalOpen(false)} className="btn-secondary">Cancel</button>
                        <button type="submit" className="btn-primary" disabled={!selectedFile}>Upload</button>
                    </div>
                </form>
            </Modal>

            {/* Test Generate Modal */}
            <Modal isOpen={testModalOpen} onClose={() => setTestModalOpen(false)} title={`Test Generate for ${COURSES.find(c => c.id === selectedCourseId)?.name}`}>
                <form onSubmit={handleTestGenerateSubmit}>
                    <div style={{ marginBottom: '16px' }}>
                        <label htmlFor="test-student-name" style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Student Name</label>
                        <input 
                            id="test-student-name"
                            type="text" 
                            value={testStudentName}
                            onChange={(e) => setTestStudentName(e.target.value)}
                            placeholder="Enter student name to appear on certificate"
                            required
                            style={{ width: '100%', padding: '8px', border: '1px solid #d1d5db', borderRadius: '6px' }}
                        />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                        <button type="button" onClick={() => setTestModalOpen(false)} className="btn-secondary">Cancel</button>
                        <button type="submit" className="btn-primary" disabled={!testStudentName}>Generate</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default AdminCertificates;
