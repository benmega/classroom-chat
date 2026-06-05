import React from 'react';
import Modal from '../common/Modal';
import SmartImage from '../common/SmartImage';
import DuckIcon from '../Icons/DuckIcon';
import { getApiUrl } from '../../utils/apiUrl';

export const CreateUserModal = ({ isOpen, onClose, onSubmit, formErrors, loading }) => (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New User">
        <form onSubmit={onSubmit} className="admin-form" noValidate>
            <div className={`form-group ${formErrors.username ? 'has-error' : ''}`}>
                <label>Username</label>
                <input type="text" name="username" placeholder="lowercase_only" />
                {formErrors.username ? (
                    <span className="error-message">{formErrors.username}</span>
                ) : (
                    <small>3-30 chars, lowercase, numbers, or underscores.</small>
                )}
            </div>
            <div className={`form-group ${formErrors.password ? 'has-error' : ''}`}>
                <label>Initial Password</label>
                <input type="password" name="password" />
                {formErrors.password && <span className="error-message">{formErrors.password}</span>}
            </div>
            <div className="form-group">
                <label>Starting Duck Balance</label>
                <input type="number" name="ducks" defaultValue="0" min="0" />
            </div>
            <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Creating...' : 'Create User'}
            </button>
        </form>
    </Modal>
);

export const AdjustDucksModal = ({ isOpen, onClose, onSubmit, user, users, formErrors, loading }) => (
    <Modal isOpen={isOpen} onClose={onClose} title="Adjust Duck Balance">
        <form onSubmit={onSubmit} className="admin-form" noValidate>
            <div className="form-group">
                <label>Target User</label>
                {user ? (
                    <div className="user-badge-display">
                        <SmartImage 
                            src={user.profile_picture ? getApiUrl(`/user/profile_pictures/${user.profile_picture}`) : ''} 
                            alt="" 
                            className="avatar-small"
                            fallbackType="avatar"
                        />
                        <div className="user-info-text">
                            <span className="user-nickname">{user.nickname || user.username}</span>
                            <span className="user-handle">@{user.username}</span>
                        </div>
                        <input type="hidden" name="username" value={user.username} />
                    </div>
                ) : (
                    <select name="username" className="admin-select">
                        <option value="">Select a user...</option>
                        {users.map(u => (
                            <option key={u.id} value={u.username}>
                                {u.username} (Balance: 🦆 {(u.duck_balance ?? 0).toFixed(1)})
                            </option>
                        ))}
                    </select>
                )}
            </div>
            <div className={`form-group ${formErrors.amount ? 'has-error' : ''}`}>
                <label>Adjustment Amount</label>
                <input type="number" name="amount" step="any" placeholder="e.g. 10 or -5" />
                {formErrors.amount ? (
                    <span className="error-message">{formErrors.amount}</span>
                ) : (
                    <small>Positive to add, negative to subtract.</small>
                )}
            </div>
            <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Applying...' : 'Apply Adjustment'}
            </button>
        </form>
    </Modal>
);

export const ResetPasswordModal = ({ isOpen, onClose, onSubmit, user, formErrors, loading }) => (
    <Modal isOpen={isOpen} onClose={onClose} title="Reset User Password">
        <form onSubmit={onSubmit} className="admin-form" noValidate>
            <div className="form-group">
                <label>User</label>
                <input type="text" name="username" value={user?.username || ''} readOnly className="readonly" />
            </div>
            <div className={`form-group ${formErrors.new_password ? 'has-error' : ''}`}>
                <label>New Password</label>
                <input type="password" name="new_password" />
                {formErrors.new_password && <span className="error-message">{formErrors.new_password}</span>}
            </div>
            <div className={`form-group ${formErrors.confirm_password ? 'has-error' : ''}`}>
                <label>Confirm Password</label>
                <input type="password" name="confirm_password" />
                {formErrors.confirm_password && <span className="error-message">{formErrors.confirm_password}</span>}
            </div>
            <button type="submit" className="btn-warning" disabled={loading}>
                {loading ? 'Resetting...' : 'Reset Password'}
            </button>
        </form>
    </Modal>
);

export const StartConversationModal = ({ isOpen, onClose, onSubmit, loading, classrooms = [] }) => (
    <Modal isOpen={isOpen} onClose={onClose} title="Start New Conversation">
        <form onSubmit={onSubmit} className="admin-form">
            <div className="form-group">
                <label>Target Classroom <span style={{ color: 'var(--error-color)' }}>*</span></label>
                <select name="classroom_id" className="admin-select" required defaultValue="">
                    <option value="" disabled>Select a classroom...</option>
                    {classrooms.map(c => (
                        <option key={c.id} value={c.id}>
                            {c.name} {c.id === 'global' ? '(Announcements)' : ''}
                        </option>
                    ))}
                </select>
            </div>
            <div className="form-group">
                <label>Conversation Topic (Optional)</label>
                <input type="text" name="title" placeholder="Leave empty for default..." />
            </div>
            <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? 'Starting...' : 'Start Conversation'}
            </button>
        </form>
    </Modal>
);

export const ManageChildrenModal = ({ isOpen, onClose, parent, users, parentChildren, onToggleLink, loading }) => {
    const students = users.filter(u => u.role === 'student');
    const childIds = new Set(parentChildren.map(c => c.id));

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Manage Children: ${parent?.username || ''}`}>
            <div className="admin-form">
                <div className="form-group">
                    <label>Select Students to Link</label>
                    <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px', background: '#f8fafc' }}>
                        {students.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center' }}>No students found.</p>
                        ) : (
                            students.map(s => {
                                const isLinked = childIds.has(s.id);
                                return (
                                    <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px', borderBottom: '1px solid #e2e8f0' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <SmartImage 
                                                src={s.profile_picture ? getApiUrl(`/user/profile_pictures/${s.profile_picture}`) : ''} 
                                                alt="" 
                                                className="avatar-small"
                                                fallbackType="avatar"
                                                style={{ width: '32px', height: '32px', borderRadius: '8px', objectFit: 'cover' }}
                                            />
                                            <div>
                                                <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{s.nickname || s.username}</div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>@{s.username}</div>
                                            </div>
                                        </div>
                                        <button 
                                            type="button"
                                            className={`btn-primary ${isLinked ? 'danger' : ''}`}
                                            style={{ padding: '6px 12px', fontSize: '0.8rem', borderRadius: '6px' }}
                                            onClick={() => onToggleLink(parent.id, s.id, isLinked)}
                                            disabled={loading}
                                        >
                                            {isLinked ? 'Unlink' : 'Link'}
                                        </button>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px' }}>
                    <button type="button" className="btn-secondary" onClick={onClose} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid #e2e8f0', background: 'white', cursor: 'pointer' }}>
                        Close
                    </button>
                </div>
            </div>
        </Modal>
    );
};
