import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import client from '../../api/client';
import toast from 'react-hot-toast';
import { 
    ChevronLeft, Users, RefreshCw, Trash2, 
    Check, Plus, Settings, Globe, Link2, BookOpen
} from 'lucide-react';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import Skeleton from '../../components/common/Skeleton';
import SmartImage from '../../components/common/SmartImage';
import { getApiUrl } from '../../utils/apiUrl';
import { BulkConnectionCardsModal } from '../../components/admin/AdminModals';
import './AdminClassDashboard.css';

const AdminClassDashboard = () => {
    const { classId } = useParams();
    const navigate = useNavigate();
    const [classroom, setClassroom] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [formLoading, setFormLoading] = useState(false);
    const [allStudents, setAllStudents] = useState([]);
    const [selectedStudentId, setSelectedStudentId] = useState('');
    const [studentSearchQuery, setStudentSearchQuery] = useState('');
    const [rosterSearchQuery, setRosterSearchQuery] = useState('');

    // Connection cards states
    const [activeModal, setActiveModal] = useState(null);
    const [classroomCards, setClassroomCards] = useState([]);
    const [isFetchingCards, setIsFetchingCards] = useState(false);

    const fetchClassroomDetails = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await client.get(`/api/admin/classrooms/${classId}`);
            setClassroom(res.data.classroom);
        } catch (err) {
            toast.error('Failed to load classroom details.');
            navigate('/admin/classes');
        } finally {
            setIsLoading(false);
        }
    }, [classId, navigate]);

    const fetchAllStudents = useCallback(async () => {
        try {
            const res = await client.get(`/api/admin/users?per_page=1000`);
            const students = (res.data.users || []).filter(u => u.role === 'student');
            setAllStudents(students);
        } catch (err) {
            console.error('Failed to fetch students list', err);
        }
    }, []);

    useEffect(() => {
        fetchClassroomDetails();
        fetchAllStudents();
    }, [fetchClassroomDetails, fetchAllStudents]);

    const fetchClassroomCards = async () => {
        setIsFetchingCards(true);
        try {
            const response = await client.get(`/api/admin/classrooms/${classId}/connection_cards`);
            setClassroomCards(response.data.data?.cards || response.data.cards || []);
            return true;
        } catch (error) {
            console.error('Error fetching cards:', error);
            toast.error('Failed to load connection cards.');
            setClassroomCards([]);
            return false;
        } finally {
            setIsFetchingCards(false);
        }
    };

    const handleUpdateSettings = async (e) => {
        e.preventDefault();
        setFormLoading(true);
        const formData = new FormData(e.target);
        const data = {
            name: formData.get('name'),
            language: formData.get('language'),
            url: formData.get('url'),
            course_id: formData.get('course_id') || null
        };

        try {
            const res = await client.put(`/api/admin/classrooms/${classId}`, data);
            if (res.data.success) {
                toast.success(res.data.message || 'Classroom updated successfully');
                fetchClassroomDetails();
            }
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to update classroom.');
        } finally {
            setFormLoading(false);
        }
    };

    const handleEnrollStudent = async (e) => {
        e.preventDefault();
        if (!selectedStudentId) return;
        setFormLoading(true);
        try {
            const res = await client.post(`/api/admin/classrooms/${classId}/enroll`, {
                student_id: Number(selectedStudentId)
            });
            if (res.data.success) {
                toast.success(res.data.message || 'Student enrolled successfully');
                setSelectedStudentId('');
                fetchClassroomDetails();
            }
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to enroll student.');
        } finally {
            setFormLoading(false);
        }
    };

    const handleUnenrollStudent = async (studentId) => {
        if (!window.confirm('Are you sure you want to remove this student from the classroom?')) return;
        setFormLoading(true);
        try {
            const res = await client.post(`/api/admin/classrooms/${classId}/unenroll`, {
                student_id: studentId
            });
            if (res.data.success) {
                toast.success(res.data.message || 'Student removed successfully');
                fetchClassroomDetails();
            }
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to unenroll student.');
        } finally {
            setFormLoading(false);
        }
    };

    const handleDeleteClassroom = async () => {
        if (!window.confirm(`WARNING: Are you sure you want to delete classroom "${classroom.name}"? This cannot be undone.`)) {
            return;
        }
        try {
            const res = await client.delete(`/api/admin/classrooms/${classId}`);
            if (res.data.success) {
                toast.success(res.data.message || 'Classroom deleted successfully');
                navigate('/admin/classes');
            }
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to delete classroom.');
        }
    };

    if (isLoading) {
        return (
            <div className="admin-class-dashboard">
                <div className="dashboard-header">
                    <Skeleton height="40px" width="300px" className="skeleton-title" />
                </div>
                <div className="dashboard-layout">
                    <div className="main-content">
                        <Skeleton height="300px" className="skeleton-card" />
                    </div>
                </div>
            </div>
        );
    }

    // Filter roster students
    const filteredRoster = (classroom.students || []).filter(student => {
        const query = rosterSearchQuery.toLowerCase();
        return (
            student.username?.toLowerCase().includes(query) ||
            (student.nickname && student.nickname.toLowerCase().includes(query))
        );
    });

    // Determine students available for enrollment (excluding already enrolled)
    const enrolledIds = new Set((classroom.students || []).map(s => s.id));
    const availableStudents = allStudents.filter(s => !enrolledIds.has(s.id));

    return (
        <div className="admin-class-dashboard">
            <div className="back-navigation">
                <button onClick={() => navigate('/admin/classes')} className="back-btn-text">
                    <ChevronLeft size={16} /> Back to Directory
                </button>
            </div>

            <AdminPageHeader title={classroom.name}>
                <div className="header-actions">
                    <button 
                        className="secondary-btn" 
                        onClick={async () => {
                            await fetchClassroomCards();
                            setActiveModal('bulk_connection_cards');
                        }}
                    >
                        Print Connection Cards
                    </button>
                    <button onClick={fetchClassroomDetails} className="refresh-btn">
                        <RefreshCw size={18} />
                    </button>
                </div>
            </AdminPageHeader>

            {/* Premium HUD Row */}
            <div className="class-hud-row">
                <div className="hud-stat-box">
                    <span className="lbl">Classroom ID</span>
                    <span className="val class-id-text">{classroom.id}</span>
                </div>
                <div className="hud-stat-box">
                    <span className="lbl">Language</span>
                    <span className="val lang-badge">{classroom.language}</span>
                </div>
                <div className="hud-stat-box">
                    <span className="lbl">Enrolled</span>
                    <span className="val">{classroom.students?.length || 0} Students</span>
                </div>
                <div className="hud-stat-box">
                    <span className="lbl">Course ID</span>
                    <span className="val">{classroom.course_id || 'None'}</span>
                </div>
            </div>

            <div className="admin-class-grid">
                
                {/* Roster Panel (Left column / Major column) */}
                <div className="control-panel-card roster-card">
                    <div className="card-custom-header">
                        <div className="title-section">
                            <Users size={20} />
                            <h3>Student Roster</h3>
                        </div>
                        <input 
                            type="text" 
                            placeholder="Filter roster..." 
                            value={rosterSearchQuery}
                            onChange={(e) => setRosterSearchQuery(e.target.value)}
                            className="roster-search-input"
                        />
                    </div>

                    <div className="roster-list-container">
                        {filteredRoster.length > 0 ? (
                            <div className="roster-list">
                                {filteredRoster.map(student => (
                                    <div key={student.id} className="roster-item">
                                        <div className="student-info cursor-pointer" onClick={() => navigate(`/admin/users/${student.id}`)}>
                                            <SmartImage 
                                                src={student.profile_picture ? getApiUrl(`/user/profile_pictures/${student.profile_picture}`) : ''} 
                                                alt="" 
                                                className="avatar-tiny"
                                                fallbackType="avatar"
                                            />
                                            <div className="student-names">
                                                <span className="name">{student.nickname || student.username}</span>
                                                <span className="handle">@{student.username}</span>
                                            </div>
                                            <span className={`status-dot ${student.is_online ? 'online' : 'offline'}`} />
                                        </div>
                                        <button 
                                            type="button" 
                                            className="btn-action-sm danger unenroll-btn"
                                            onClick={() => handleUnenrollStudent(student.id)}
                                            disabled={formLoading}
                                        >
                                            Remove
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="empty-roster-msg">No students found.</div>
                        )}
                    </div>

                    {/* Enrollment form */}
                    <div className="enrollment-section">
                        <h4>Enroll New Student</h4>
                        <form onSubmit={handleEnrollStudent} className="enroll-form">
                            <div className="enroll-controls">
                                <select 
                                    value={selectedStudentId} 
                                    onChange={(e) => setSelectedStudentId(e.target.value)}
                                    className="student-enroll-select"
                                    required
                                >
                                    <option value="">-- Select Student --</option>
                                    {availableStudents.map(student => (
                                        <option key={student.id} value={student.id}>
                                            {student.nickname || student.username} (@{student.username})
                                        </option>
                                    ))}
                                </select>
                                <button 
                                    type="submit" 
                                    className="btn-action-sm primary enroll-btn"
                                    disabled={formLoading || !selectedStudentId}
                                >
                                    <Plus size={16} /> Enroll
                                </button>
                            </div>
                        </form>
                    </div>
                </div>

                {/* Right Column / Settings and Course Assignment */}
                <div className="sidebar-panels">
                    
                    {/* Settings Panel */}
                    <div className="control-panel-card settings-card">
                        <div className="card-custom-header">
                            <Settings size={20} />
                            <h3>Classroom Settings</h3>
                        </div>

                        <form onSubmit={handleUpdateSettings} className="settings-form">
                            <div className="form-group">
                                <label>Classroom Name</label>
                                <input 
                                    type="text" 
                                    name="name" 
                                    defaultValue={classroom.name} 
                                    placeholder="e.g. Saturday coding"
                                    required 
                                />
                            </div>

                            <div className="form-group">
                                <label>Language</label>
                                <input 
                                    type="text" 
                                    name="language" 
                                    defaultValue={classroom.language} 
                                    placeholder="e.g. Python, Scratch"
                                    required 
                                />
                            </div>

                            <div className="form-group">
                                <label>Course ID</label>
                                <input 
                                    type="text" 
                                    name="course_id" 
                                    defaultValue={classroom.course_id || ''} 
                                    placeholder="e.g. Python_Level_1"
                                />
                            </div>

                            <div className="form-group">
                                <label>Web App / Project URL</label>
                                <input 
                                    type="url" 
                                    name="url" 
                                    defaultValue={classroom.url || ''} 
                                    placeholder="https://..."
                                    required
                                />
                            </div>

                            <button type="submit" className="btn-save" disabled={formLoading}>
                                {formLoading ? 'Saving...' : 'Save Settings'}
                            </button>
                        </form>
                    </div>

                    {/* Course Assignments Card */}
                    <div className="control-panel-card assignments-card">
                        <div className="card-custom-header">
                            <BookOpen size={20} />
                            <h3>Course Instances</h3>
                        </div>
                        <div className="assignments-list">
                            {classroom.course_assignments && classroom.course_assignments.length > 0 ? (
                                classroom.course_assignments.map(assign => (
                                    <div key={assign.id} className="assignment-item">
                                        <div className="assign-details">
                                            <span className="assign-id-lbl">Instance ID</span>
                                            <span className="assign-id-val">{assign.id}</span>
                                        </div>
                                        <div className="assign-details">
                                            <span className="assign-id-lbl">Course ID</span>
                                            <span className="assign-id-val badge-course">{assign.course_id || 'None'}</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="empty-roster-msg">No course instances assigned.</div>
                            )}
                        </div>
                    </div>

                    {/* Danger Zone */}
                    <div className="control-panel-card danger-zone-card">
                        <div className="card-custom-header">
                            <Trash2 size={20} />
                            <h3>Danger Zone</h3>
                        </div>
                        <p className="danger-zone-desc">Deleting a classroom removes the classroom instance. Students remain active users in the system but will be unlinked from this group.</p>
                        <button 
                            type="button" 
                            className="btn-danger"
                            onClick={handleDeleteClassroom}
                        >
                            Delete Classroom
                        </button>
                    </div>
                </div>

            </div>

            <BulkConnectionCardsModal
                isOpen={activeModal === 'bulk_connection_cards'}
                onClose={() => setActiveModal(null)}
                classrooms={[classroom]}
                fetchClassrooms={fetchClassroomDetails}
                classroomCards={classroomCards}
                setClassroomCards={setClassroomCards}
                isFetchingCards={isFetchingCards}
                fetchClassroomCards={fetchClassroomCards}
            />
        </div>
    );
};

export default AdminClassDashboard;
