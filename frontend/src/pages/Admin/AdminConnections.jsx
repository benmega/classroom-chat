import React, { useState, useEffect, useCallback } from 'react';
import client from '../../api/client';
import toast from 'react-hot-toast';
import { 
    Search, Plus, RefreshCw, Users as UsersIcon, Trash2, ChevronDown, ChevronUp
} from 'lucide-react';
import SmartImage from '../../components/common/SmartImage';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import Modal from '../../components/common/Modal';
import Skeleton from '../../components/common/Skeleton';
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
    
    // Expand State
    const [expandedParents, setExpandedParents] = useState(new Set());
    
    // Modal State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    
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
                setIsCreateModalOpen(false);
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

    const toggleExpand = (parentId) => {
        const next = new Set(expandedParents);
        if (next.has(parentId)) next.delete(parentId);
        else next.add(parentId);
        setExpandedParents(next);
    };

    // Filter parents and students for linking dropdowns
    const parentsList = allUsers.filter(u => u.role === 'parent').sort((a, b) => 
        (a.nickname || a.username).localeCompare(b.nickname || b.username)
    );
    const studentsList = allUsers.filter(u => u.role === 'student').sort((a, b) => 
        (a.nickname || a.username).localeCompare(b.nickname || b.username)
    );

    // Calculate stats
    const uniqueParentsCount = new Set(connections.map(c => c.parent?.id)).size;
    const uniqueStudentsCount = new Set(connections.map(c => c.student?.id)).size;
    const connectedStudentIds = new Set(connections.map(c => c.student?.id));
    const unlinkedStudentsCount = studentsList.filter(s => !connectedStudentIds.has(s.id)).length;

    // Group connections by parent
    const groupedConnections = React.useMemo(() => {
        const groups = {};
        for (const conn of connections) {
            const parentId = conn.parent.id;
            if (!groups[parentId]) {
                groups[parentId] = {
                    parent: conn.parent,
                    students: []
                };
            }
            groups[parentId].students.push(conn.student);
        }
        return Object.values(groups);
    }, [connections]);

    // Filter grouped connections by search term
    const filteredGroupedConnections = React.useMemo(() => {
        const query = searchTerm.toLowerCase();
        if (!query) return groupedConnections;
        
        return groupedConnections.filter(group => {
            const parentName = (group.parent.nickname || group.parent.username).toLowerCase();
            const parentHandle = group.parent.username.toLowerCase();
            
            if (parentName.includes(query) || parentHandle.includes(query)) return true;
            
            return group.students.some(student => {
                const studentName = (student.nickname || student.username).toLowerCase();
                const studentHandle = student.username.toLowerCase();
                return studentName.includes(query) || studentHandle.includes(query);
            });
        });
    }, [groupedConnections, searchTerm]);

    if (isLoading) {
        return (
            <div className="admin-connections-page animate-page-entry">
                <AdminPageHeader title="Parent-Child Links">
                    <div className="search-bar">
                        <Search size={18} />
                        <input 
                            type="text" 
                            placeholder="Search connections..." 
                            value={searchTerm}
                            disabled
                        />
                    </div>
                    <button className="primary-btn" disabled>
                        <Plus size={18} /> Add Link
                    </button>
                    <button className="refresh-btn" disabled>
                        <RefreshCw size={18} />
                    </button>
                </AdminPageHeader>

                <div className="users-stats-row">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="stat-mini-card">
                            <Skeleton height="15px" width="100px" style={{ marginBottom: '8px' }} />
                            <Skeleton height="28px" width="50px" />
                        </div>
                    ))}
                </div>

                <div className="users-table-container card">
                    <div className="table-responsive">
                        <table className="users-table">
                            <thead>
                                <tr>
                                    <th>Parent Profile</th>
                                    <th>Linked Children</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {[1, 2, 3, 4, 5].map(i => (
                                    <tr key={i}>
                                        <td colSpan="3" style={{ padding: 0 }}>
                                            <div className="connections-skeleton-row" style={{ padding: '20px' }}>
                                                <Skeleton height="40px" />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="admin-connections-page animate-page-entry">
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
                    className="primary-btn" 
                    onClick={() => setIsCreateModalOpen(true)}
                >
                    <Plus size={18} /> Add Link
                </button>
                <button 
                    className={`refresh-btn ${isRefreshing ? 'spinning' : ''}`}
                    onClick={handleRefresh}
                    disabled={isRefreshing || formLoading}
                >
                    <RefreshCw size={18} />
                </button>
            </AdminPageHeader>

            <div className="users-stats-row">
                <div className="stat-mini-card">
                    <span className="label">Total Links</span>
                    <span className="value">{connections.length}</span>
                </div>
                <div className="stat-mini-card">
                    <span className="label">Connected Parents</span>
                    <span className="value">{uniqueParentsCount}</span>
                </div>
                <div className="stat-mini-card">
                    <span className="label">Connected Students</span>
                    <span className="value">{uniqueStudentsCount}</span>
                </div>
                <div className="stat-mini-card">
                    <span className="label">Unlinked Students</span>
                    <span className="value">{unlinkedStudentsCount}</span>
                </div>
            </div>

            <div className="users-table-container card">
                <div className="table-responsive">
                    <table className="users-table">
                        <thead>
                            <tr>
                                <th>Parent Profile</th>
                                <th>Linked Children</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredGroupedConnections.length > 0 ? (
                                filteredGroupedConnections.map(group => (
                                    <React.Fragment key={`parent-${group.parent.id}`}>
                                        <tr>
                                            <td>
                                                <div className="user-profile-cell">
                                                    <SmartImage 
                                                        src={group.parent.profile_picture ? getApiUrl(`/user/profile_pictures/${group.parent.profile_picture}`) : ''} 
                                                        alt="" 
                                                        className="avatar"
                                                        fallbackType="avatar"
                                                    />
                                                    <div className="info">
                                                        <div className="name">{group.parent.nickname || group.parent.username}</div>
                                                        <div className="handle">@{group.parent.username}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <div className="connections-count-badge">
                                                    <UsersIcon size={14} /> {group.students.length} {group.students.length === 1 ? 'Child' : 'Children'}
                                                </div>
                                            </td>
                                            <td>
                                                <div className="action-group">
                                                    <button 
                                                        className="action-btn expand-btn"
                                                        onClick={() => toggleExpand(group.parent.id)}
                                                        title={expandedParents.has(group.parent.id) ? "Collapse" : "Expand"}
                                                    >
                                                        {expandedParents.has(group.parent.id) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                        {expandedParents.has(group.parent.id) && (
                                            <tr className="expanded-children-row">
                                                <td colSpan="3">
                                                    <div className="children-list-container">
                                                        <div className="children-list">
                                                            {group.students.map(student => (
                                                                <div className="child-item" key={`child-${student.id}`}>
                                                                    <div className="user-profile-cell">
                                                                        <SmartImage 
                                                                            src={student.profile_picture ? getApiUrl(`/user/profile_pictures/${student.profile_picture}`) : ''} 
                                                                            alt="" 
                                                                            className="avatar"
                                                                            fallbackType="avatar"
                                                                        />
                                                                        <div className="info">
                                                                            <div className="name">{student.nickname || student.username}</div>
                                                                            <div className="handle">@{student.username}</div>
                                                                        </div>
                                                                    </div>
                                                                    <button 
                                                                        className="action-btn delete child-unlink-btn" 
                                                                        onClick={() => handleUnlink(
                                                                            group.parent.id, 
                                                                            student.id, 
                                                                            group.parent.nickname || group.parent.username, 
                                                                            student.nickname || student.username
                                                                        )}
                                                                        disabled={formLoading}
                                                                        title="Unlink Account"
                                                                    >
                                                                        <Trash2 size={16} /> Unlink
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="3" className="empty-row">
                                        No parent-child links found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal 
                isOpen={isCreateModalOpen} 
                onClose={() => {
                    setIsCreateModalOpen(false);
                    setSelectedParentId('');
                    setSelectedStudentId('');
                }}
                title="Create New Connection Link"
            >
                <form onSubmit={handleLink} className="admin-form">
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
                        className="submit-btn btn-primary" 
                        disabled={formLoading || !selectedParentId || !selectedStudentId}
                    >
                        {formLoading ? 'Establishing Link...' : 'Establish Connection Link'}
                    </button>
                </form>
            </Modal>
        </div>
    );
};

export default AdminConnections;
