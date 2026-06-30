import React from 'react';
import { 
    Search, 
    Plus, 
    ArrowUpCircle, 
    Key, 
    Trash2, 
    RefreshCw,
    Shield,
    ChevronLeft,
    Users as UsersIcon
} from 'lucide-react';
import SmartImage from '../../components/common/SmartImage';
import { 
    CreateUserModal, 
    AdjustDucksModal, 
    SetDrawerModal,
    ResetPasswordModal,
    ManageChildrenModal,
    ConnectionCardModal,
    BulkConnectionCardsModal
} from '../../components/admin/AdminModals';
import './Users.css';
import Skeleton from '../../components/common/Skeleton';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import { getApiUrl } from '../../utils/apiUrl';

// Hooks
import { useUsersManagement } from '../../hooks/useUsersManagement';

const Users = () => {
    const {
        users,
        isLoading,
        isRefreshing,
        page,
        totalPages,
        totalUsers,
        activeModal,
        setActiveModal,
        modalUser,
        setModalUser,
        formLoading,
        formErrors,
        fetchUsers,
        handleCreateUser,
        handleAdjustDucks,
        handleSetDrawer,
        handleResetPassword,
        handleRemoveUser,
        parentChildren,
        fetchParentChildren,
        handleToggleChildLink,
        connectionCode,
        setConnectionCode,
        fetchConnectionCard,
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
            <AdminPageHeader 
                title="User Directory" 
            >
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

            <div className="users-stats-row">
                <div className="stat-mini-card">
                    <span className="label">Total Users</span>
                    <span className="value">{totalUsers || users.length}</span>
                </div>
                <div className="stat-mini-card">
                    <span className="label">Online Now</span>
                    <span className="value">{users.filter(u => u.is_online).length}</span>
                </div>
                <div className="stat-mini-card">
                    <span className="label">Admins</span>
                    <span className="value">{users.filter(u => u.is_admin).length}</span>
                </div>
                <div className="stat-mini-card">
                    <span className="label">Pending Approval</span>
                    <span className="value">{users.filter(u => !u.is_approved && !u.is_admin).length}</span>
                </div>
            </div>

            <div className="users-table-container card">
                <table className="users-table">
                    <thead>
                        <tr>
                            <th>User Profile</th>
                            <th>Account Type</th>
                            <th>Economy</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredUsers.length > 0 ? (
                            filteredUsers.map(u => (
                                <tr key={u.id} className={u.is_admin ? 'admin-row' : ''}>
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
                                                <div className="handle">@{u.username}</div>
                                                {u.role === 'student' && u.drawer && <div className="drawer-info drawer-info-text">Drawer: <span className="drawer-code">{u.drawer}</span></div>}
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <div className="type-badge">
                                            {u.is_admin ? (
                                                <span className="user-role-badge admin"><Shield size={12} /> Administrator</span>
                                            ) : u.role === 'parent' ? (
                                                <span className="user-role-badge parent">Parent</span>
                                            ) : (
                                                <span className="user-role-badge student">Student</span>
                                            )}
                                        </div>
                                    </td>
                                    <td>
                                        <div className="economy-info">
                                            <div className="duck-count">🦆 {(u.duck_balance ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                                            <div className="level-info">Lvl: {u.total_levels || 0}</div>
                                        </div>
                                    </td>
                                    <td>
                                        <div className={`status-indicator ${u.is_online ? 'online' : 'offline'}`}>
                                            <span className="dot"></span>
                                            {u.is_online ? 'Active' : 'Offline'}
                                        </div>
                                    </td>
                                    <td>
                                        <div className="action-group">
                                            <button 
                                                className="action-btn adjust" 
                                                onClick={() => { setModalUser(u); setActiveModal('adjust'); }}
                                                title="Adjust Balance"
                                            >
                                                <ArrowUpCircle size={16} />
                                            </button>
                                            {u.role === 'student' && (
                                                <button 
                                                    className="action-btn action-btn-blue" 
                                                    onClick={() => { setModalUser(u); setActiveModal('drawer'); }}
                                                    title="Set Drawer"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"></path><path d="m3.3 7 8.7 5 8.7-5"></path><path d="M12 22V12"></path></svg>
                                                </button>
                                            )}
                                            <button 
                                                className="action-btn pass"  
                                                onClick={() => { setModalUser(u); setActiveModal('reset'); }}
                                                title="Reset Password"
                                            >
                                                <Key size={16} />
                                            </button>
                                            {u.role === 'parent' && (
                                                <button 
                                                    className="action-btn action-btn-indigo" 
                                                    onClick={() => { 
                                                        setModalUser(u); 
                                                        fetchParentChildren(u.id);
                                                        setActiveModal('manage_children'); 
                                                    }}
                                                    title="Manage Children"
                                                >
                                                    <UsersIcon size={16} />
                                                </button>
                                            )}
                                            {!u.is_admin && u.role === 'student' && (
                                                <button 
                                                    className="action-btn action-btn-green" 
                                                    onClick={async () => { 
                                                        const success = await fetchConnectionCard(u.id);
                                                        if (success) {
                                                            setModalUser(u); 
                                                            setActiveModal('connection_card'); 
                                                        }
                                                    }}
                                                    title="Get Connection Card"
                                                >
                                                    <Key size={14} /> <span className="card-btn-text">Card</span>
                                                </button>
                                            )}
                                            {!u.is_admin && (
                                                <button 
                                                    className="action-btn delete" 
                                                    onClick={() => handleRemoveUser(u.username)}
                                                    title="Permanently Remove"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="5" className="empty-row">
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

            <AdjustDucksModal 
                isOpen={activeModal === 'adjust'} 
                onClose={() => { setActiveModal(null); setModalUser(null); }} 
                onSubmit={handleAdjustDucks} 
                user={modalUser} 
                users={users} 
                formErrors={formErrors} 
                loading={formLoading} 
            />

            <SetDrawerModal 
                isOpen={activeModal === 'drawer'} 
                onClose={() => { setActiveModal(null); setModalUser(null); }} 
                onSubmit={handleSetDrawer} 
                user={modalUser} 
                loading={formLoading} 
            />

            <ResetPasswordModal 
                isOpen={activeModal === 'reset'} 
                onClose={() => { setActiveModal(null); setModalUser(null); }} 
                onSubmit={handleResetPassword} 
                user={modalUser} 
                formErrors={formErrors} 
                loading={formLoading} 
            />

            <ManageChildrenModal 
                isOpen={activeModal === 'manage_children'} 
                onClose={() => { setActiveModal(null); setModalUser(null); }} 
                parent={modalUser}
                users={users}
                parentChildren={parentChildren}
                onToggleLink={handleToggleChildLink}
                loading={formLoading}
            />

            <ConnectionCardModal 
                isOpen={activeModal === 'connection_card'} 
                onClose={() => { setActiveModal(null); setModalUser(null); setConnectionCode(null); }} 
                student={modalUser}
                connectionCode={connectionCode}
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
