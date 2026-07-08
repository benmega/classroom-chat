import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Search, 
    Plus, 
    Key, 
    RefreshCw,
    Shield,
    ChevronLeft
} from 'lucide-react';
import SmartImage from '../../components/common/SmartImage';
import { 
    CreateUserModal, 
    BulkConnectionCardsModal
} from '../../components/admin/AdminModals';
import './Users.css';
import Skeleton from '../../components/common/Skeleton';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import { getApiUrl } from '../../utils/apiUrl';
import { formatRelativeTime } from '../../utils/formatters';

// Hooks
import { useUsersManagement } from '../../hooks/useUsersManagement';

const Users = () => {
    const navigate = useNavigate();
    const {
        users,
        isLoading,
        isRefreshing,
        page,
        totalPages,
        totalUsers,
        activeModal,
        setActiveModal,
        formLoading,
        formErrors,
        fetchUsers,
        handleCreateUser,
        classrooms,
        fetchClassrooms,
        classroomCards,
        setClassroomCards,
        isFetchingCards,
        fetchClassroomCards,
        searchTerm,
        setSearchTerm
    } = useUsersManagement();

    const filteredUsers = users;

    if (isLoading) return (
        <div className="admin-users-page">
            <header className="page-header">
                <Skeleton height="40px" width="300px" className="skeleton-title" />
                <Skeleton height="20px" width="500px" />
            </header>
            <div className="users-table-container card">
                {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="users-skeleton-row">
                        <Skeleton height="60px" />
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <div className="admin-users-page">
            <AdminPageHeader title="User Directory">
                <div className="search-bar">
                    <Search size={18} />
                    <input 
                        type="text" 
                        placeholder="Search by name or @username..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <button className="primary-btn" onClick={() => setActiveModal('create')}>
                    <Plus size={18} /> Add User
                </button>
                <button className="primary-btn bulk-conn-btn" onClick={() => setActiveModal('bulk_connection_cards')}>
                    <Key size={18} /> Print Cohort Cards
                </button>
                <button 
                    className={`refresh-btn ${isRefreshing ? 'spinning' : ''}`}
                    onClick={() => fetchUsers(page)}
                    disabled={isRefreshing}
                >
                    <RefreshCw size={18} />
                </button>
            </AdminPageHeader>
            <div className="users-table-container card">
                <table className="users-table">
                    <thead>
                        <tr>
                            <th>User Profile</th>
                            <th>Current Activity</th>
                            <th>Economy & Levels</th>
                            <th>Last Active</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredUsers.length > 0 ? (
                            filteredUsers.map(u => (
                                <tr 
                                    key={u.id} 
                                    className={`clickable-row ${u.is_admin ? 'admin-row' : ''}`}
                                    onClick={() => navigate(`/admin/users/${u.id}`)}
                                >
                                    <td>
                                        <div className="user-profile-cell">
                                            <SmartImage 
                                                src={u.profile_picture ? getApiUrl(`/user/profile_pictures/${u.profile_picture}`) : ''} 
                                                alt="" 
                                                className="avatar"
                                                fallbackType="avatar"
                                            />
                                            <div className="info">
                                                <div className="name">{u.nickname || u.username}</div>
                                                <div className="handle-row">
                                                    <span className="handle">@{u.username}</span>
                                                    <span className={`inline-role-label ${u.is_admin ? 'admin' : u.role || 'student'}`}>
                                                        {u.is_admin ? 'admin' : u.role || 'student'}
                                                    </span>
                                                    {!u.is_approved && !u.is_admin && (
                                                        <span className="inline-role-label pending">
                                                            Pending
                                                        </span>
                                                    )}
                                                </div>
                                                {u.role === 'student' && u.drawer && <div className="drawer-info drawer-info-text">Drawer: <span className="drawer-code">{u.drawer}</span></div>}
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="activity-cell">
                                            {u.current_activity ? (
                                                <span className="activity-text">{u.current_activity}</span>
                                            ) : (
                                                <span className="activity-idle">Idle</span>
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        <div className="economy-info">
                                            <div className="duck-count">🦆 {(u.duck_balance ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                                            <div className="packet-count" style={{ fontSize: '0.8rem', color: (u.packets < 0 ? 'var(--error-color, #ff4444)' : 'var(--text-muted)') }}>📦 {(u.packets ?? 0).toLocaleString(undefined, { maximumFractionDigits: 3 })}</div>
                                            <div className="level-info">
                                                Lvl: {u.total_levels || 0}
                                                {u.levels_today > 0 && (
                                                    <span className="levels-today-badge">+{u.levels_today} today</span>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div className={`status-indicator ${u.is_online ? 'online' : 'offline'}`}>
                                            <span className="dot"></span>
                                            {u.is_online ? 'Active' : formatRelativeTime(u.last_activity_time)}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="4" className="empty-row">
                                    No users found matching your search.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
                
                <div className="pagination-container">
                    <div className="pagination-info">
                        Showing <strong>{(page - 1) * 50 + 1}-{Math.min(page * 50, totalUsers)}</strong> of <strong>{totalUsers}</strong> users
                    </div>
                    <div className="pagination-controls">
                        <button 
                            className="pagination-btn" 
                            onClick={() => fetchUsers(page - 1)}
                            disabled={page <= 1 || isRefreshing}
                        >
                            <ChevronLeft size={16} /> Previous
                        </button>
                        <div className="pagination-pages">
                            <span className="page-indicator">Page <strong>{page}</strong> of {totalPages}</span>
                        </div>
                        <button 
                            className="pagination-btn" 
                            onClick={() => fetchUsers(page + 1)}
                            disabled={page >= totalPages || isRefreshing}
                        >
                            Next <ChevronLeft size={16} className="icon-rotate-180" />
                        </button>
                    </div>
                </div>
            </div>

            <CreateUserModal 
                isOpen={activeModal === 'create'} 
                onClose={() => setActiveModal(null)} 
                onSubmit={handleCreateUser} 
                formErrors={formErrors} 
                loading={formLoading} 
            />

            <BulkConnectionCardsModal
                isOpen={activeModal === 'bulk_connection_cards'}
                onClose={() => setActiveModal(null)}
                classrooms={classrooms}
                fetchClassrooms={fetchClassrooms}
                classroomCards={classroomCards}
                setClassroomCards={setClassroomCards}
                isFetchingCards={isFetchingCards}
                fetchClassroomCards={fetchClassroomCards}
            />
        </div>
    );
};

export default Users;
