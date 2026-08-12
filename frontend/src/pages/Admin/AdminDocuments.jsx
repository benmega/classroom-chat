import React, { useState, useEffect } from 'react';
import { 
    File, 
    FileText, 
    Download, 
    Eye, 
    Trash2, 
    Search, 
    AlertCircle,
    Filter
} from 'lucide-react';
import client from '../../api/client';
import toast from 'react-hot-toast';
import { getApiUrl } from '../../utils/apiUrl';
import './AdminDocuments.css';
import Skeleton from '../../components/common/Skeleton';

const AdminDocuments = () => {
    const [documents, setDocuments] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const docsRes = await client.get('/api/admin/documents');
            
            if (docsRes.data.status === 'success') {
                setDocuments(docsRes.data.data.documents);
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
                // eslint-disable-next-line
                const message = response.data.message || response.data.data?.message || 'File deleted successfully';
                
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

    if (isLoading) {
        return (
            <div className="admin-documents-page">
                <div className="controls-bar card controls-bar-skeleton">
                    <Skeleton height="40px" width="400px" />
                </div>
                <div className="documents-grid documents-grid-skeleton">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                        <div key={i} className="doc-card card doc-card-skeleton">
                            <Skeleton height="150px" borderRadius="12px 12px 0 0" />
                            <div className="doc-card-body-skeleton">
                                <Skeleton height="20px" width="80%" />
                                <Skeleton height="14px" width="60%" className="mt-sm" />
                                <div className="doc-actions-skeleton">
                                    <Skeleton height="32px" width="50%" borderRadius="6px" />
                                    <Skeleton height="32px" width="50%" borderRadius="6px" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="admin-documents-page">
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
                                        href={getApiUrl(`/api/admin/documents/${doc.category}/${doc.filename}/view`)} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="action-btn"
                                        title="View"
                                    >
                                        <Eye size={18} />
                                    </a>
                                    <a 
                                        href={getApiUrl(`/api/admin/documents/${doc.category}/${doc.filename}/download`)} 
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
