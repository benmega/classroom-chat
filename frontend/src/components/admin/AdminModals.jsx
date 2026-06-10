import React, { useEffect, useState } from 'react';
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

export const ConnectionCardModal = ({ isOpen, onClose, student, connectionCode }) => {
    if (!student || !connectionCode) return null;

    const qrData = encodeURIComponent(`${window.location.origin}/parent/connect?code=${connectionCode}`);
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${qrData}`;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Connection Card: ${student.username}`}>
            <div className="connection-card-container" style={{ textAlign: 'center', padding: '1rem' }}>
                <p style={{ marginBottom: '1.5rem', color: 'var(--text-muted)' }}>
                    Print or show this card to the parent. They can scan the QR code or enter the code manually to connect.
                </p>
                <div style={{ background: 'white', padding: '1.5rem', borderRadius: '12px', display: 'inline-block', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
                    <h3 style={{ margin: '0 0 0.25rem 0', color: '#1e293b' }}>{student.nickname || student.username}</h3>
                    <div style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '1rem' }}>@{student.username}</div>
                    <img src={qrUrl} alt="QR Code" style={{ width: '200px', height: '200px' }} />
                    <div style={{ marginTop: '1rem', padding: '0.75rem', background: '#f1f5f9', borderRadius: '8px', border: '1px dashed #cbd5e1' }}>
                        <span style={{ fontSize: '0.9rem', color: '#64748b', display: 'block', marginBottom: '4px' }}>Connection Code</span>
                        <span style={{ fontSize: '1.5rem', fontWeight: 'bold', letterSpacing: '4px', color: '#0f172a' }}>{connectionCode}</span>
                    </div>
                </div>
                <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                    <button className="btn-secondary" onClick={() => window.print()} style={{ padding: '0.5rem 1rem', borderRadius: '6px', cursor: 'pointer', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-color)' }}>
                        Print Card
                    </button>
                    <button className="btn-primary" onClick={onClose}>
                        Done
                    </button>
                </div>
            </div>
            <style>{`
                @media print {
                    body * { visibility: hidden; }
                    .connection-card-container, .connection-card-container * { visibility: visible; }
                    .connection-card-container { position: absolute; left: 0; top: 0; width: 100%; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; }
                    .connection-card-container button, .modal-header { display: none !important; }
                }
            `}</style>
        </Modal>
    );
};

export const BulkConnectionCardsModal = ({ isOpen, onClose, classrooms, fetchClassrooms, classroomCards, setClassroomCards, isFetchingCards, fetchClassroomCards }) => {
    const [selectedClassroomId, setSelectedClassroomId] = useState('');

    useEffect(() => {
        if (isOpen) {
            fetchClassrooms();
            setTimeout(() => {
                setClassroomCards([]);
                setSelectedClassroomId('');
            }, 0);
        }
    }, [isOpen, fetchClassrooms, setClassroomCards]);

    const handleClassroomChange = async (e) => {
        const id = e.target.value;
        setSelectedClassroomId(id);
        if (id) {
            await fetchClassroomCards(id);
        } else {
            setClassroomCards([]);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Bulk Print Cohort Connection Cards" width="80%">
            <div className="bulk-cards-modal-content" style={{ padding: '1rem' }}>
                <div className="form-group no-print" style={{ marginBottom: '1.5rem' }}>
                    <label style={{ fontWeight: '600', marginBottom: '0.5rem', display: 'block' }}>Select Cohort (Classroom)</label>
                    <select 
                        value={selectedClassroomId} 
                        onChange={handleClassroomChange} 
                        className="admin-select"
                        style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-color)' }}
                    >
                        <option value="">Select a classroom...</option>
                        <option value="all">All Students (Entire Directory)</option>
                        {classrooms.map(c => (
                            <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                </div>

                {isFetchingCards ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }} className="no-print">
                        <p>Generating cards and connection codes...</p>
                    </div>
                ) : selectedClassroomId && classroomCards.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }} className="no-print">
                        <p>No students found in this classroom.</p>
                    </div>
                ) : classroomCards.length > 0 ? (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }} className="no-print">
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                Found <strong>{classroomCards.length}</strong> connection cards. Ready for printing.
                            </span>
                            <button 
                                className="btn-primary" 
                                onClick={() => window.print()} 
                                style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.6rem 1.2rem', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
                            >
                                Print {classroomCards.length} Cards
                            </button>
                        </div>

                        {/* On-screen preview and print container */}
                        <div className="bulk-cards-print-container">
                            {classroomCards.map(card => {
                                const qrData = encodeURIComponent(`${window.location.origin}/parent/connect?code=${card.connection_code}`);
                                const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${qrData}`;

                                return (
                                    <div key={card.id} className="bulk-print-card">
                                        <h3 className="card-student-name" style={{ marginBottom: '2px' }}>{card.nickname || card.username}</h3>
                                        <div style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '0.75rem', textAlign: 'center', wordBreak: 'break-all' }}>@{card.username}</div>
                                        <div className="card-qr-wrapper">
                                            <img src={qrUrl} alt={`QR Code for ${card.username}`} className="card-qr-img" />
                                        </div>
                                        <div className="card-code-wrapper">
                                            <span className="card-code-label">Connection Code</span>
                                            <span className="card-code-value">{card.connection_code}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-muted)', border: '2px dashed var(--border-color)', borderRadius: '12px' }} className="no-print">
                        <p style={{ fontSize: '1.1rem', margin: 0 }}>Please select a classroom cohort above to generate and preview connection cards.</p>
                    </div>
                )}
            </div>

            <style>{`
                /* Screen Preview Styling */
                .bulk-cards-print-container {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
                    gap: 20px;
                    padding: 10px;
                    max-height: 60vh;
                    overflow-y: auto;
                    background: var(--bg-card);
                    border: 1px solid var(--border-color);
                    border-radius: 12px;
                }
                
                .bulk-print-card {
                    background: white;
                    border: 1.5px dashed #cbd5e1;
                    border-radius: 12px;
                    padding: 1.25rem;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: space-between;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.02);
                    transition: transform 0.2s, box-shadow 0.2s;
                    break-inside: avoid;
                    page-break-inside: avoid;
                }
                
                .bulk-print-card:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
                }
                
                .card-student-name {
                    margin: 0 0 0.75rem 0;
                    color: #0f172a;
                    font-size: 1.1rem;
                    font-weight: 700;
                    text-align: center;
                    word-break: break-all;
                }
                
                .card-qr-wrapper {
                    background: #f8fafc;
                    padding: 8px;
                    border-radius: 8px;
                    border: 1px solid #e2e8f0;
                    margin-bottom: 0.75rem;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                }
                
                .card-qr-img {
                    width: 140px;
                    height: 140px;
                    display: block;
                }
                
                .card-code-wrapper {
                    width: 100%;
                    padding: 0.5rem;
                    background: #f1f5f9;
                    border-radius: 8px;
                    border: 1px solid #e2e8f0;
                    text-align: center;
                }
                
                .card-code-label {
                    font-size: 0.7rem;
                    color: #64748b;
                    display: block;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    margin-bottom: 2px;
                }
                
                .card-code-value {
                    font-size: 1.25rem;
                    font-weight: 800;
                    letter-spacing: 2px;
                    color: #0f172a;
                }

                /* Printing Overrides */
                @media print {
                    /* Reset all fixed positions and restricted heights on ancestors to allow pagination */
                    html, body, #root, .admin-modal-overlay, .admin-modal-content, .modal-body {
                        height: auto !important;
                        min-height: auto !important;
                        max-height: none !important;
                        overflow: visible !important;
                        position: static !important;
                        transform: none !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }

                    .modal-header, .close-btn, .no-print {
                        display: none !important;
                    }

                    /* Hide everything in the body except our print container */
                    body * {
                        visibility: hidden !important;
                    }
                    
                    /* Make print container and all its descendants visible */
                    .bulk-cards-print-container, 
                    .bulk-cards-print-container *, 
                    .bulk-print-card, 
                    .bulk-print-card * {
                        visibility: visible !important;
                    }
                    
                    /* Position print container at top left of printable area */
                    .bulk-cards-print-container {
                        position: absolute !important;
                        left: 0 !important;
                        top: 0 !important;
                        width: 100% !important;
                        max-height: none !important;
                        overflow: visible !important;
                        border: none !important;
                        background: transparent !important;
                        padding: 0 !important;
                        
                        /* Setup 3-column grid layout for printing */
                        display: grid !important;
                        grid-template-columns: repeat(3, 1fr) !important;
                        gap: 15px !important;
                    }
                    
                    .bulk-print-card {
                        border: 1px dashed #94a3b8 !important;
                        border-radius: 8px !important;
                        padding: 10px !important;
                        box-shadow: none !important;
                        background: white !important;
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                        box-sizing: border-box !important;
                    }

                    .card-student-name {
                        color: black !important;
                        font-size: 1rem !important;
                    }

                    .card-qr-img {
                        width: 120px !important;
                        height: 120px !important;
                    }

                    .card-code-wrapper {
                        background: #f1f5f9 !important;
                        -webkit-print-color-adjust: exact !important; /* Keep background color in print */
                        print-color-adjust: exact !important;
                    }

                    .card-code-value {
                        color: black !important;
                        font-size: 1.1rem !important;
                    }
                }
            `}</style>
        </Modal>
    );
};
