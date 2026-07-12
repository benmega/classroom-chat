import React, { useState, useEffect } from 'react';
import { Loader2, Activity, User } from 'lucide-react';
import client from '../../api/client';
import './AdminStudentActivity.css';
import Skeleton from '../../components/common/Skeleton';

const AdminStudentActivity = () => {
    const [students, setStudents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showOnlineOnly, setShowOnlineOnly] = useState(false);

    const fetchActivity = React.useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await client.get(`/api/admin/student_activity?is_online=${showOnlineOnly}`);
            setStudents(response.data.data?.students || []);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to fetch student activity');
        } finally {
            setIsLoading(false);
        }
    }, [showOnlineOnly]);

    useEffect(() => {
        fetchActivity();
    }, [fetchActivity]);

    return (
        <div className="admin-page admin-student-activity">
            <header className="admin-header">
                <div className="header-title">
                    <Activity size={24} />
                    <h1>Student Activity</h1>
                </div>
                <div className="header-actions">
                    <label className="toggle-label">
                        <input
                            type="checkbox"
                            checked={showOnlineOnly}
                            onChange={(e) => setShowOnlineOnly(e.target.checked)}
                        />
                        <span className="toggle-text">Show Online Only</span>
                    </label>
                </div>
            </header>

            {error && <div className="admin-error">{error}</div>}

            <main className="admin-content">
                {isLoading ? (
                    <div className="activity-list skeleton-list">
                        {[1, 2, 3, 4].map(i => (
                            <div key={i} className="student-activity-card card skeleton-card">
                                <div className="skeleton-card-left">
                                    <Skeleton height="40px" width="40px" borderRadius="50%" />
                                    <div>
                                        <Skeleton height="18px" width="120px" className="mb-4px" />
                                        <Skeleton height="14px" width="80px" />
                                    </div>
                                </div>
                                <div className="skeleton-card-right">
                                    <Skeleton height="10px" width="10px" borderRadius="50%" />
                                    <Skeleton height="16px" width="60px" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : students.length === 0 ? (
                    <div className="admin-empty">
                        <User size={48} />
                        <p>No students found.</p>
                    </div>
                ) : (
                    <div className="activity-grid">
                        {students.map((student) => (
                            <div key={student.id} className="activity-card">
                                <div className="activity-card-header">
                                    <div className="avatar-container">
                                        <img 
                                            src={student.profile_picture_url} 
                                            alt={student.username} 
                                            className="avatar-img"
                                        />
                                        <div className={`status-dot ${student.is_online ? 'online' : 'offline'}`} />
                                    </div>
                                    <div className="student-info">
                                        <h3>{student.nickname || student.username}</h3>
                                        <p className="username">@{student.username}</p>
                                    </div>
                                </div>
                                <div className="activity-card-body">
                                    {student.current_activity ? (
                                        <div className="current-activity">
                                            <Activity size={14} className="activity-icon" />
                                            <span>{student.current_activity}</span>
                                        </div>
                                    ) : (
                                        <div className="no-activity">No recent activity</div>
                                    )}
                                    {student.last_activity_time && (
                                        <div className="activity-time">
                                            {new Date(student.last_activity_time).toLocaleString()}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
};

export default AdminStudentActivity;
