import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { 
    Search, 
    Plus, 
    ArrowUpCircle,
    Package,
    Key, 
    Trash2, 
    RefreshCw,
    Shield,
    ChevronLeft,
    ChevronDown,
    ChevronUp,
    Users as UsersIcon,
    MessageSquare,
    MessageSquareOff
} from 'lucide-react';
import SmartImage from '../../components/common/SmartImage';
import { 
    CreateUserModal, 
    AdjustDucksModal, 
    AdjustPacketsModal,
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
import client from '../../api/client';
import toast from 'react-hot-toast';

// Hooks
import { useUsersManagement } from '../../hooks/useUsersManagement';

const TABS = [
    { label: 'All', value: '' },
    { label: 'Students', value: 'student' },
    { label: 'Parents', value: 'parent' },
];

const Users = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();

    // Tab state – synced with ?role= URL param
    const [activeRole, setActiveRole] = useState(() => {
        const roleParam = searchParams.get('role') ?? '';
        // Validate it's one of our known roles
        return ['', 'student', 'parent'].includes(roleParam) ? roleParam : '';
    });

    const handleTabChange = (role) => {
        setActiveRole(role);
        setSearchParams(role ? { role } : {});
    };

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
        handleAdjustPackets,
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
        setSearchTerm,
        handleToggleChat
    } = useUsersManagement(activeRole);

    // Expandable parents state
    const [expandedParents, setExpandedParents] = useState(new Set());
    const [childrenCache, setChildrenCache] = useState({});

    const toggleParentExpand = async (parentId) => {
        const next = new Set(expandedParents);
        if (next.has(parentId)) {
            next.delete(parentId);
        } else {
            next.add(parentId);
            // Fetch children on first expand
            if (!childrenCache[parentId]) {
                try {
                    const res = await client.get(`/api/admin/parents/${parentId}/children`);
                    setChildrenCache(prev => ({
                        ...prev,
                        [parentId]: res.data.children || []
                    }));
                } catch {
                    toast.error('Failed to load children for this parent.');
                    setChildrenCache(prev => ({ ...prev, [parentId]: [] }));
                }
            }
        }
        setExpandedParents(next);
    };

    const handleUnlinkChild = async (parentId, childId) => {
        await handleToggleChildLink(parentId, childId, true);
        // Remove locally from cache
        setChildrenCache(prev => ({
            ...prev,
            [parentId]: (prev[parentId] || []).filter(c => c.id !== childId)
        }));
    };

    const filteredUsers = users;

    // Compute column count based on active tab
    const colCount = activeRole === '' ? 5 : 4;

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
                {/* Conditional header buttons by tab */}
                {activeRole !== 'parent' && (
                    <button className="primary-btn" onClick={() => setActiveModal('create')}>
                        <Plus size={18} /> {activeRole === 'student' ? 'Add Student' : 'Add User'}
                    </button>
                )}
                {activeRole !== 'parent' && (
                    <button className="primary-btn bulk-conn-btn" onClick={() => setActiveModal('bulk_connection_cards')}>
                        <Key size={18} /> Print Cohort Cards
                    </button>
                )}
                <button 
                    className={`refresh-btn ${isRefreshing ? 'spinning' : ''}`}
                    onClick={() => fetchUsers(page)}
                    disabled={isRefreshing}
                >
                    <RefreshCw size={18} />
                </button>
            </AdminPageHeader>

            {/* Tab Bar */}
            <div className="admin-role-tabs">
                {TABS.map(tab => (
                    <button
                        key={tab.value}
                        className={`role-tab ${activeRole === tab.value ? 'active' : ''}`}
                        onClick={() => handleTabChange(tab.value)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>



            <div className="users-table-container card">
                <table className="users-table">
                    <thead>
                        <tr>
                            {activeRole === '' && (
                                <>
                                    <th>User Profile</th>
                                    <th>Account Type</th>
                                    <th>Economy</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </>
                            )}
                            {activeRole === 'student' && (
                                <>
                                    <th>Student Profile</th>
                                    <th>Economy</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </>
                            )}
                            {activeRole === 'parent' && (
                                <>
                                    <th>Parent Profile</th>
                                    <th>Linked Children</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </>
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {filteredUsers.length > 0 ? (
                            filteredUsers.map(u => (
                                <React.Fragment key={u.id}>
                                    {/* ── All tab row ─────────────────────────────────── */}
                                    {activeRole === '' && (
                                        <tr className={u.is_admin ? 'admin-row' : ''}>
                                            <td onClick={() => navigate(`/admin/users/${u.id}`)} className="cursor-pointer">
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
                                            <td onClick={() => navigate(`/admin/users/${u.id}`)} className="cursor-pointer">
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
                                            <td onClick={() => navigate(`/admin/users/${u.id}`)} className="cursor-pointer">
                                                {u.role === 'student' ? (
                                                    <div className="economy-info">
                                                        <div className="duck-count">🦆 {(u.duck_balance ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                                                        <div className="packet-count" style={{ fontSize: '0.8rem', color: (u.packets < 0 ? 'var(--error-color, #ff4444)' : 'var(--text-muted)') }}>📦 {(u.packets ?? 0).toLocaleString(undefined, { maximumFractionDigits: 3 })}</div>
                                                        <div className="level-info">Lvl: {u.total_levels || 0}</div>
                                                    </div>
                                                ) : (
                                                    <div style={{ color: 'var(--text-muted)', textAlign: 'center' }}>—</div>
                                                )}
                                            </td>
                                            <td onClick={() => navigate(`/admin/users/${u.id}`)} className="cursor-pointer">
                                                <div className={`status-indicator ${u.is_online ? 'online' : 'offline'}`}>
                                                    <span className="dot"></span>
                                                    {u.is_online ? 'Active' : 'Offline'}
                                                </div>
                                            </td>
                                            <td>
                                                <div className="action-group">
                                                    {u.role === 'student' && (
                                                        <>
                                                            <button 
                                                                className="action-btn adjust" 
                                                                onClick={() => { setModalUser(u); setActiveModal('adjust'); }}
                                                                title="Adjust Ducks"
                                                            >
                                                                <ArrowUpCircle size={16} />
                                                            </button>
                                                            <button 
                                                                className="action-btn adjust-packets" 
                                                                onClick={() => { setModalUser(u); setActiveModal('adjust_packets'); }}
                                                                title="Adjust Packets"
                                                                style={{ color: 'var(--accent-color)' }}
                                                            >
                                                                <Package size={16} />
                                                            </button>
                                                            <button 
                                                                className="action-btn action-btn-blue" 
                                                                onClick={() => { setModalUser(u); setActiveModal('drawer'); }}
                                                                title="Set Drawer"
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"></path><path d="m3.3 7 8.7 5 8.7-5"></path><path d="M12 22V12"></path></svg>
                                                            </button>
                                                        </>
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
                                                    {u.role === 'student' && (
                                                        <button
                                                            className={`action-btn ${u.can_chat ? 'message' : 'message-off'}`}
                                                            onClick={() => handleToggleChat(u.id)}
                                                            title={u.can_chat ? 'Mute Chat' : 'Unmute Chat'}
                                                            style={{ color: u.can_chat ? 'var(--primary-color)' : 'var(--error-color)' }}
                                                        >
                                                            {u.can_chat ? <MessageSquare size={16} /> : <MessageSquareOff size={16} />}
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
                                    )}

                                    {/* ── Students tab row ────────────────────────────── */}
                                    {activeRole === 'student' && (
                                        <tr>
                                            <td onClick={() => navigate(`/admin/users/${u.id}`)} className="cursor-pointer">
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
                                                        {u.drawer && <div className="drawer-info drawer-info-text">Drawer: <span className="drawer-code">{u.drawer}</span></div>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td onClick={() => navigate(`/admin/users/${u.id}`)} className="cursor-pointer">
                                                <div className="economy-info">
                                                    <div className="duck-count">🦆 {(u.duck_balance ?? 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
                                                    <div className="packet-count" style={{ fontSize: '0.8rem', color: (u.packets < 0 ? 'var(--error-color, #ff4444)' : 'var(--text-muted)') }}>📦 {(u.packets ?? 0).toLocaleString(undefined, { maximumFractionDigits: 3 })}</div>
                                                    <div className="level-info">Lvl: {u.total_levels || 0}</div>
                                                </div>
                                            </td>
                                            <td onClick={() => navigate(`/admin/users/${u.id}`)} className="cursor-pointer">
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
                                                        title="Adjust Ducks"
                                                    >
                                                        <ArrowUpCircle size={16} />
                                                    </button>
                                                    <button 
                                                        className="action-btn adjust-packets" 
                                                        onClick={() => { setModalUser(u); setActiveModal('adjust_packets'); }}
                                                        title="Adjust Packets"
                                                        style={{ color: 'var(--accent-color)' }}
                                                    >
                                                        <Package size={16} />
                                                    </button>
                                                    <button 
                                                        className="action-btn action-btn-blue" 
                                                        onClick={() => { setModalUser(u); setActiveModal('drawer'); }}
                                                        title="Set Drawer"
                                                    >
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"></path><path d="m3.3 7 8.7 5 8.7-5"></path><path d="M12 22V12"></path></svg>
                                                    </button>
                                                    <button 
                                                        className="action-btn pass"  
                                                        onClick={() => { setModalUser(u); setActiveModal('reset'); }}
                                                        title="Reset Password"
                                                    >
                                                        <Key size={16} />
                                                    </button>
                                                    {!u.is_admin && (
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
                                                    <button
                                                        className={`action-btn ${u.can_chat ? 'message' : 'message-off'}`}
                                                        onClick={() => handleToggleChat(u.id)}
                                                        title={u.can_chat ? 'Mute Chat' : 'Unmute Chat'}
                                                        style={{ color: u.can_chat ? 'var(--primary-color)' : 'var(--error-color)' }}
                                                    >
                                                        {u.can_chat ? <MessageSquare size={16} /> : <MessageSquareOff size={16} />}
                                                    </button>
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
                                    )}

                                    {/* ── Parents tab row (with expandable children) ── */}
                                    {activeRole === 'parent' && (
                                        <>
                                            <tr>
                                                <td onClick={() => navigate(`/admin/users/${u.id}`)} className="cursor-pointer">
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
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="children-count-badge">
                                                        <UsersIcon size={14} />
                                                        {childrenCache[u.id] !== undefined
                                                            ? `${childrenCache[u.id].length} ${childrenCache[u.id].length === 1 ? 'Child' : 'Children'}`
                                                            : 'Children'
                                                        }
                                                        <button
                                                            className="action-btn expand-btn"
                                                            onClick={() => toggleParentExpand(u.id)}
                                                            title={expandedParents.has(u.id) ? 'Collapse' : 'Expand'}
                                                            style={{ marginLeft: '8px', width: '28px', height: '28px' }}
                                                        >
                                                            {expandedParents.has(u.id) ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                                                        </button>
                                                    </div>
                                                </td>
                                                <td onClick={() => navigate(`/admin/users/${u.id}`)} className="cursor-pointer">
                                                    <div className={`status-indicator ${u.is_online ? 'online' : 'offline'}`}>
                                                        <span className="dot"></span>
                                                        {u.is_online ? 'Active' : 'Offline'}
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="action-group">
                                                        <button 
                                                            className="action-btn pass"  
                                                            onClick={() => { setModalUser(u); setActiveModal('reset'); }}
                                                            title="Reset Password"
                                                        >
                                                            <Key size={16} />
                                                        </button>
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
                                                        <button 
                                                            className="action-btn delete" 
                                                            onClick={() => handleRemoveUser(u.username)}
                                                            title="Permanently Remove"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                            {expandedParents.has(u.id) && (
                                                <tr className="expanded-children-row">
                                                    <td colSpan="4">
                                                        <div className="children-list-container">
                                                            {childrenCache[u.id] === undefined ? (
                                                                <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Loading…</div>
                                                            ) : childrenCache[u.id].length === 0 ? (
                                                                <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No linked children</div>
                                                            ) : (
                                                                childrenCache[u.id].map(child => (
                                                                    <div className="child-item" key={child.id}>
                                                                        <div className="user-profile-cell">
                                                                            <SmartImage 
                                                                                src={child.profile_picture ? getApiUrl(`/user/profile_pictures/${child.profile_picture}`) : ''} 
                                                                                alt="" 
                                                                                className="avatar"
                                                                                fallbackType="avatar"
                                                                            />
                                                                            <div className="info">
                                                                                <div className="name">{child.nickname || child.username}</div>
                                                                                <div className="handle">@{child.username}</div>
                                                                            </div>
                                                                        </div>
                                                                        <button
                                                                            className="action-btn delete child-unlink-btn"
                                                                            onClick={() => handleUnlinkChild(u.id, child.id)}
                                                                            disabled={formLoading}
                                                                            title="Unlink this child"
                                                                        >
                                                                            <Trash2 size={14} /> <span style={{ fontSize: '0.75rem', marginLeft: '4px' }}>Unlink</span>
                                                                        </button>
                                                                    </div>
                                                                ))
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </>
                                    )}
                                </React.Fragment>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={colCount} className="empty-row">
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

            <AdjustPacketsModal 
                isOpen={activeModal === 'adjust_packets'} 
                onClose={() => { setActiveModal(null); setModalUser(null); }} 
                onSubmit={handleAdjustPackets} 
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
