import React, { useState, useEffect, useCallback } from 'react';
import client from '../../api/client';
import toast from 'react-hot-toast';
import { 
    Link2, Search, Plus, RefreshCw, Users, Trash2
} from 'lucide-react';
import SmartImage from '../../components/common/SmartImage';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import { getApiUrl } from '../../utils/apiUrl';
import './AdminConnections.css';

const AdminConnections = () => {
    const [connections, setConnections] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [formLoading, setFormLoading] = useState(false);
    
    // Search & Filter State
    const [searchTerm, setSearchTerm] = useState('');
    
    // Linking Form State
    const [selectedParentId, setSelectedParentId] = useState('');
    const [selectedStudentId, setSelectedStudentId] = useState('');

    const fetchConnections = useCallback(async () => {
        try {
            const res = await client.get('/api/admin/parents/connections');
            if (res.data.success) {
                setConnections(res.data.connections || []);
            }
        } catch (err) {
            console.error("Failed to fetch connections", err);
            toast.error('Failed to load parent-child connections.');
        }
    }, []);

    const fetchAllUsers = useCallback(async () => {
        try {
            const res = await client.get('/api/admin/users?per_page=1000');
            setAllUsers(res.data.users || []);
        } catch (err) {
            console.error("Failed to fetch all users", err);
        }
    }, []);

    const initData = useCallback(async () => {
        setIsLoading(true);
        await Promise.all([fetchConnections(), fetchAllUsers()]);
        setIsLoading(false);
    }, [fetchConnections, fetchAllUsers]);

    useEffect(() => {
        initData();
    }, [initData]);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await Promise.all([fetchConnections(), fetchAllUsers()]);
        setIsRefreshing(false);
        toast.success('Refreshed connections and users list.');
    };

    const handleLink = async (e) => {
        e.preventDefault();
        if (!selectedParentId || !selectedStudentId) {
            toast.error('Please select both a parent and a student.');
            return;
        }

        setFormLoading(true);
        try {
            const response = await client.post(`/api/admin/parents/${selectedParentId}/link/${selectedStudentId}`);
            if (response.data.success) {
                toast.success(response.data.message || 'Linked successfully!');
                setSelectedStudentId('');
                fetchConnections();
            } else {
                toast.error(response.data.message || 'Failed to link accounts.');
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'An error occurred during linking.');
        } finally {
            setFormLoading(false);
        }
    };

    const handleUnlink = async (parentId, studentId, parentName, studentName) => {
        if (!window.confirm(`Are you sure you want to remove the link between Parent "${parentName}" and Student "${studentName}"?`)) {
            return;
        }

        setFormLoading(true);
        try {
            const response = await client.post(`/api/admin/parents/${parentId}/unlink/${studentId}`);
            if (response.data.success) {
                toast.success(response.data.message || 'Unlinked successfully!');
                fetchConnections();
            } else {
                toast.error(response.data.message || 'Failed to unlink accounts.');
            }
        } catch (err) {
            toast.error(err.response?.data?.message || 'An error occurred during unlinking.');
        } finally {
            setFormLoading(false);
        }
    };

    // Filter parents and students for linking dropdowns
    const parentsList = allUsers.filter(u => u.role === 'parent').sort((a, b) => 
        (a.nickname || a.username).localeCompare(b.nickname || b.username)
    );
    const studentsList = allUsers.filter(u => u.role === 'student').sort((a, b) => 
        (a.nickname || a.username).localeCompare(b.nickname || b.username)
    );

    // Filter existing connections by search term
    const filteredConnections = connections.filter(conn => {
        const query = searchTerm.toLowerCase();
        const parentName = (conn.parent.nickname || conn.parent.username).toLowerCase();
        const parentHandle = conn.parent.username.toLowerCase();
        const studentName = (conn.student.nickname || conn.student.username).toLowerCase();
        const studentHandle = conn.student.username.toLowerCase();
        
        return parentName.includes(query) || 
               parentHandle.includes(query) || 
               studentName.includes(query) || 
               studentHandle.includes(query);
    });

    if (isLoading) {
        return (
            <div className="admin-connections-page">
                <AdminPageHeader title="Parent-Child Links" />
                <div className="loading-container">
                    <RefreshCw className="spinning" size={40} />
                    <p>Loading connection lists...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-connections-page">
            <AdminPageHeader title="Parent-Child Links">
                <div className="search-bar">
                    <Search size={18} />
                    <input 
                        type="text" 
                        placeholder="Search connections..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <button 
                    className={`refresh-btn ${isRefreshing ? 'spinning' : ''}`}
                    onClick={handleRefresh}
                    disabled={isRefreshing || formLoading}
                >
                    <RefreshCw size={18} />
                </button>
            </AdminPageHeader>

            <div className="connections-grid">
                {/* Global Connection Creator Card */}
                <div className="connection-creator-card card">
                    <div className="card-header">
                        <h3><Link2 size={20} /> Create New Connection Link</h3>
                    </div>
                    <form onSubmit={handleLink} className="creator-form">
                        <div className="form-group">
                            <label htmlFor="parent-select">Parent User</label>
                            <select 
                                id="parent-select"
                                value={selectedParentId}
                                onChange={(e) => setSelectedParentId(e.target.value)}
                                required
                            >
                                <option value="">-- Choose Parent --</option>
                                {parentsList.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.nickname ? `${p.nickname} (@${p.username})` : `@${p.username}`}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label htmlFor="student-select">Student User</label>
                            <select 
                                id="student-select"
                                value={selectedStudentId}
                                onChange={(e) => setSelectedStudentId(e.target.value)}
                                required
                            >
                                <option value="">-- Choose Student --</option>
                                {studentsList.map(s => (
                                    <option key={s.id} value={s.id}>
                                        {s.nickname ? `${s.nickname} (@${s.username})` : `@${s.username}`}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <button 
                            type="submit" 
                            className="primary-btn link-action-btn" 
                            disabled={formLoading || !selectedParentId || !selectedStudentId}
                        >
                            <Plus size={18} /> Establish Connection Link
                        </button>
                    </form>
                </div>

                {/* Connections Table Card */}
                <div className="connections-table-container card">
                    <div className="card-header">
                        <div className="title-group">
                            <h3><Users size={20} /> Active Connection Links</h3>
                            <span className="count-badge">Total Links: {connections.length}</span>
                        </div>
                    </div>
                    <div className="table-wrapper">
                        <table className="connections-table">
                            <thead>
                                <tr>
                                    <th>Parent Profile</th>
                                    <th>Link Status</th>
                                    <th>Child Profile</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredConnections.length > 0 ? (
                                    filteredConnections.map(conn => (
                                        <tr key={`${conn.parent.id}-${conn.student.id}`}>
                                            <td>
                                                <div className="user-profile-cell">
                                                    <SmartImage 
                                                        src={conn.parent.profile_picture ? getApiUrl(`/user/profile_pictures/${conn.parent.profile_picture}`) : ''} 
                                                        alt="" 
                                                        className="avatar"
                                                        fallbackType="avatar"
                                                    />
                                                    <div className="info">
                                                        <div className="name">{conn.parent.nickname || conn.parent.username}</div>
                                                        <div className="handle">@{conn.parent.username}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="link-status-badge">
                                                    <span className="connector-line"></span>
                                                    <Link2 size={14} className="link-icon-badge" />
                                                </div>
                                            </td>
                                            <td>
                                                <div className="user-profile-cell">
                                                    <SmartImage 
                                                        src={conn.student.profile_picture ? getApiUrl(`/user/profile_pictures/${conn.student.profile_picture}`) : ''} 
                                                        alt="" 
                                                        className="avatar"
                                                        fallbackType="avatar"
                                                    />
                                                    <div className="info">
                                                        <div className="name">{conn.student.nickname || conn.student.username}</div>
                                                        <div className="handle">@{conn.student.username}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <button 
                                                    className="btn-action-sm danger" 
                                                    onClick={() => handleUnlink(
                                                        conn.parent.id, 
                                                        conn.student.id, 
                                                        conn.parent.nickname || conn.parent.username, 
                                                        conn.student.nickname || conn.student.username
                                                    )}
                                                    disabled={formLoading}
                                                    title="Unlink Accounts"
                                                >
                                                    <Trash2 size={16} /> Unlink
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="4" className="empty-row">
                                            No parent-child links found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminConnections;
