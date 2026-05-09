import React, { useState, useEffect } from 'react';
import { 
    File, 
    FileText, 
    Image as ImageIcon, 
    Download, 
    Eye, 
    Trash2, 
    Search, 
    Database, 
    HardDrive,
    AlertCircle,
    ChevronDown,
    Filter
} from 'lucide-react';
import client from '../../api/client';
import toast from 'react-hot-toast';
import './AdminDocuments.css';
import AdminPageHeader from '../../components/admin/AdminPageHeader';

const AdminDocuments = () => {
    const [documents, setDocuments] = useState([]);
    const [stats, setStats] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [docsRes, statsRes] = await Promise.all([
                client.get('/api/admin/documents'),
                client.get('/api/admin/documents/stats')
            ]);
            
            if (docsRes.data.status === 'success') {
                setDocuments(docsRes.data.data.documents);
            }
            if (statsRes.data.status === 'success') {
                setStats(statsRes.data.data.stats);
            }
            
        } catch {
            toast.error('Failed to load document data.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleDelete = async (category, filename) => {
        if (!window.confirm(`Are you sure you want to delete ${filename}?`)) return;

        try {
            const formData = new FormData();
            formData.append('category', category);
            formData.append('filename', filename);
            
            const response = await client.post('/api/admin/delete-document', formData);
            const isSuccess = response.data.status === 'success' || response.data.success === true;
            if (isSuccess) {
                const message = response.data.message || response.data.data?.message || 'File deleted successfully';
                toast.success(message);
                fetchData();
            }
        } catch {
            toast.error('Failed to delete document.');
        }
    };

    const filteredDocs = documents.filter(doc => {
        const matchesSearch = doc.filename.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = categoryFilter === 'all' || doc.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    if (isLoading) return <div className="admin-loading">Loading Document Manager...</div>;

    return (
        <div className="admin-documents-page">
            <AdminPageHeader 
                title="Document Manager" 
                description="Manage all uploaded files and system media."
            />

            {stats && (
                <div className="storage-overview">
                    <div className="storage-card card">
                        <div className="storage-icon"><Database size={24} /></div>
                        <div className="storage-info">
                            <span className="label">Total Storage Used</span>
                            <span className="value">{stats.total_size_formatted}</span>
                            <div className="storage-bar">
                                <div className="fill" style={{ width: '45%' }}></div>
                            </div>
                        </div>
                    </div>
                    <div className="storage-stats-grid">
                        {Object.entries(stats.by_category).map(([cat, data]) => (
                            <div key={cat} className="mini-stat card">
                                <span className="cat-name">{cat.toUpperCase()}</span>
                                <span className="cat-val">{data.count} Files ({data.size_formatted})</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="controls-bar card">
                <div className="search-box">
                    <Search size={18} />
                    <input 
                        type="text" 
                        placeholder="Search by filename..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="filter-group">
                    <Filter size={18} />
                    <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                        <option value="all">All Categories</option>
                        <option value="image">Images</option>
                        <option value="pdf">PDF Documents</option>
                        <option value="other">Other Files</option>
                    </select>
                </div>
            </div>

            <div className="documents-grid">
                {filteredDocs.length > 0 ? (
                    filteredDocs.map(doc => (
                        <div key={doc.filename} className="doc-card card">
                            <div className="doc-preview">
                                {doc.category === 'image' ? (
                                    <img src={`/static/images/${doc.filename}`} alt="" />
                                ) : (
                                    <div className="file-icon-wrapper">
                                        {doc.category === 'pdf' ? <FileText size={48} /> : <File size={48} />}
                                    </div>
                                )}
                                <span className="category-tag">{doc.category}</span>
                            </div>
                            <div className="doc-info">
                                <h3 title={doc.filename}>{doc.filename}</h3>
                                <div className="doc-meta">
                                    <span>{doc.size_formatted}</span>
                                    <span>•</span>
                                    <span>{new Date(doc.created).toLocaleDateString()}</span>
                                </div>
                            </div>
                            <div className="doc-actions">
                                <div className="primary-actions">
                                    <a 
                                        href={`/api/admin/documents/${doc.category}/${doc.filename}/view`} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="action-btn"
                                        title="View"
                                    >
                                        <Eye size={18} />
                                    </a>
                                    <a 
                                        href={`/api/admin/documents/${doc.category}/${doc.filename}/download`} 
                                        className="action-btn"
                                        title="Download"
                                    >
                                        <Download size={18} />
                                    </a>
                                </div>
                                <button 
                                    onClick={() => handleDelete(doc.category, doc.filename)}
                                    className="action-btn delete"
                                    title="Delete"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="empty-state">
                        <AlertCircle size={48} />
                        <h3>No Files Found</h3>
                        <p>Try adjusting your search or filters.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminDocuments;
