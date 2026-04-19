import React from 'react';
import { ArrowUpCircle, Key, Trash2 } from 'lucide-react';
import SmartImage from '../common/SmartImage';

const UserTable = ({ users, onAdjustDucks, onResetPassword, onRemoveUser }) => {
    return (
        <div className="table-responsive">
            <table className="admin-table">
                <thead>
                    <tr>
                        <th>User</th>
                        <th>Balance</th>
                        <th>Levels</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {users.map(u => (
                        <tr key={u.id}>
                            <td>
                                <div className="user-cell">
                                    <SmartImage 
                                        src={u.profile_picture ? `/user/profile_pictures/${u.profile_picture}` : ''} 
                                        alt="" 
                                        fallbackType="avatar"
                                    />
                                    <div>
                                        <div className="u-name">{u.nickname || u.username}</div>
                                        <div className="u-handle">@{u.username}</div>
                                    </div>
                                </div>
                            </td>
                            <td><span className="duck-pill">{u.duck_balance?.toLocaleString(undefined, { maximumFractionDigits: 3 })} Ducks</span></td>
                            <td>{u.cc_levels + u.oz_levels}</td>
                            <td>
                                <span className={`status-pill ${u.is_online ? 'online' : 'offline'}`}>
                                    {u.is_online ? 'Online' : 'Offline'}
                                </span>
                            </td>
                            <td>
                                <div className="action-btns">
                                    <button 
                                        className="icon-btn adjust" 
                                        title="Adjust Ducks"
                                        onClick={() => onAdjustDucks(u)}
                                    >
                                        <ArrowUpCircle size={16} />
                                    </button>
                                    <button 
                                        className="icon-btn pass" 
                                        title="Reset Password"
                                        onClick={() => onResetPassword(u)}
                                    >
                                        <Key size={16} />
                                    </button>
                                    <button 
                                        className="icon-btn delete" 
                                        title="Delete User"
                                        onClick={() => onRemoveUser(u.username)}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default UserTable;
