import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import client from '../../api/client';
import toast from 'react-hot-toast';
import { 
    ChevronLeft, Users, Trash2, 
    Check, Plus, Settings, Globe, Link2, BookOpen, Key, Copy, Gamepad2, Code, X, UserPlus
} from 'lucide-react';

const getCourseIcon = (courseName, courseId) => {
    const text = `${courseName || ''} ${courseId || ''}`.toLowerCase();
    if (text.includes('gd') || text.includes('game')) return <Gamepad2 size={24} />;
    if (text.includes('wd') || text.includes('web')) return <Globe size={24} />;
    if (text.includes('cs') || text.includes('computer')) return <Code size={24} />;
    return <BookOpen size={24} />;
};

import AdminPageHeader from '../../components/admin/AdminPageHeader';
import Chat from '../Chat/Chat';
import Skeleton from '../../components/common/Skeleton';
import SmartImage from '../../components/common/SmartImage';
import { getApiUrl } from '../../utils/apiUrl';
import { BulkConnectionCardsModal, AddCourseModal, EnrollStudentModal } from '../../components/admin/AdminModals';
import './AdminClassDashboard.css';

const getLanguageIconUrl = (language) => {
    const lang = (language || '').toLowerCase();
    if (lang.includes('python')) return "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/python/python-original.svg";
    if (lang.includes('javascript') || lang.includes('js')) return "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/javascript/javascript-original.svg";
    if (lang.includes('html') || lang.includes('css')) return "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/html5/html5-original.svg";
    if (lang.includes('java') && !lang.includes('javascript')) return "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/java/java-original.svg";
    if (lang.includes('c++') || lang.includes('cpp')) return "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/cplusplus/cplusplus-original.svg";
    return null;
};

const AdminClassDashboard = () => {
    const { classId } = useParams();
    const navigate = useNavigate();
    const [classroom, setClassroom] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [formLoading, setFormLoading] = useState(false);
    const [allStudents, setAllStudents] = useState([]);
    const [selectedStudentId, setSelectedStudentId] = useState('');
    // eslint-disable-next-line
    const [rosterSearchQuery, setRosterSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('stream');
    const [joinCode, setJoinCode] = useState(null);

    // Connection cards & course states
    const [activeModal, setActiveModal] = useState(null);
    const [classroomCards, setClassroomCards] = useState([]);
    const [isFetchingCards, setIsFetchingCards] = useState(false);
    const [courses, setCourses] = useState([]);
    
    // Name editing state
    const [isEditingName, setIsEditingName] = useState(false);
    const [editNameValue, setEditNameValue] = useState('');

    const fetchClassroomDetails = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await client.get(`/api/admin/classrooms/${classId}`);
            setClassroom(res.data.classroom);

            // Fetch join code
            try {
                const codeRes = await client.get(`/api/admin/classrooms/${classId}/join-code`);
                if (codeRes.data.success) {
                    setJoinCode(codeRes.data.join_code);
                }
            } catch (err) {
                console.error("Failed to fetch join code:", err);
            }
        } catch (err) {
            console.error('Failed to fetch classroom:', err);
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

    const fetchCourses = useCallback(async () => {
        try {
            const res = await client.get('/api/admin/crud/courses');
            setCourses(res.data.data || []);
        } catch (err) {
            console.error('Failed to fetch courses list', err);
        }
    }, []);

    useEffect(() => {
        fetchClassroomDetails();
        fetchAllStudents();
        fetchCourses();
    }, [fetchClassroomDetails, fetchAllStudents, fetchCourses]);

    const handleAddCourse = async ({ course_id, instance_id }) => {
        setFormLoading(true);
        try {
            const finalInstanceId = instance_id || `ci_${classId}_${course_id}_${Date.now()}`;
            const res = await client.post('/api/admin/crud/courseinstances', {
                id: finalInstanceId,
                classroom_id: classId,
                course_id: course_id
            });
            if (res.data) {
                
                setActiveModal(null);
                fetchClassroomDetails();
            }
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to connect course.');
        } finally {
            setFormLoading(false);
        }
    };

    const handleDisconnectCourse = async (instanceId) => {
        if (!window.confirm('Are you sure you want to disconnect this course from the classroom?')) return;
        setFormLoading(true);
        try {
            const res = await client.delete(`/api/admin/crud/courseinstances/${instanceId}`);
            if (res.data) {
                
                fetchClassroomDetails();
            }
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to disconnect course.');
        } finally {
            setFormLoading(false);
        }
    };

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

    const handleToggleLanguage = async (langId) => {
        const currentLangs = (classroom.language || '').split(',').map(l => l.trim()).filter(Boolean);
        let newLangs = [...currentLangs];
        if (newLangs.includes(langId)) {
            newLangs = newLangs.filter(l => l !== langId);
        } else {
            newLangs.push(langId);
        }
        const newLanguageStr = newLangs.join(',');

        try {
            const res = await client.put(`/api/admin/classrooms/${classId}`, {
                name: classroom.name,
                language: newLanguageStr
            });
            if (res.data.success) {
                
                fetchClassroomDetails();
            }
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to update languages.');
        }
    };

    const handleUpdateName = async () => {
        if (!editNameValue.trim() || editNameValue === classroom.name) {
            setIsEditingName(false);
            return;
        }
        setFormLoading(true);
        try {
            const res = await client.put(`/api/admin/classrooms/${classId}`, { 
                name: editNameValue,
                language: classroom.language
            });
            if (res.data.success) {
                
                fetchClassroomDetails();
                setIsEditingName(false);
            }
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to update name.');
        } finally {
            setFormLoading(false);
        }
    };

    const handleRegenerateJoinCode = async () => {
        setFormLoading(true);
        try {
            const res = await client.post(`/api/admin/classrooms/${classId}/regenerate_code`);
            if (res.data.success) {
                
                fetchClassroomDetails();
            }
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to regenerate code.');
        } finally {
            setFormLoading(false);
        }
    };

    const handleEnrollStudent = async (studentIdToEnroll) => {
        const targetId = studentIdToEnroll || selectedStudentId;
        if (!targetId) return;
        setFormLoading(true);
        try {
            const res = await client.post(`/api/admin/classrooms/${classId}/enroll`, {
                student_id: Number(targetId)
            });
            if (res.data.success) {
                
                setSelectedStudentId('');
                setActiveModal(null);
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
                
                fetchClassroomDetails();
            }
        } catch (err) {
            toast.error(err.response?.data?.error || 'Failed to unenroll student.');
        } finally {
            setFormLoading(false);
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
                <button 
                    onClick={() => navigate('/admin/classes')} 
                    className="back-btn-text"
                    aria-label="Back to Classroom Directory"
                >
                    <ChevronLeft size={16} aria-hidden="true" /> Back to Directory
                </button>
            </div>

            <div className="classroom-banner">
                <div className="banner-content">
                    {isEditingName ? (
                        <div className="name-edit-container" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <input
                                type="text"
                                value={editNameValue}
                                onChange={(e) => setEditNameValue(e.target.value)}
                                className="name-edit-input"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleUpdateName();
                                    if (e.key === 'Escape') setIsEditingName(false);
                                }}
                                style={{
                                    fontSize: '24px',
                                    fontWeight: 'bold',
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    border: '1px solid #ccc',
                                    background: 'transparent',
                                    color: 'inherit'
                                }}
                            />
                            <button onClick={handleUpdateName} className="btn-action-sm primary" disabled={formLoading}>
                                <Check size={16} />
                            </button>
                        </div>
                    ) : (
                        <h1 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {classroom.name}
                            <button 
                                onClick={() => { setEditNameValue(classroom.name); setIsEditingName(true); }}
                                className="btn-icon-only"
                                aria-label="Edit classroom name"
                                style={{ opacity: 0.7, cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
                            >
                                <Settings size={18} />
                            </button>
                            <div className="banner-langs" style={{ display: 'flex', gap: '4px', marginLeft: '8px' }}>
                                {(classroom.language || '').split(',').map(l => l.trim()).filter(Boolean).map((lang, idx) => {
                                    const iconUrl = getLanguageIconUrl(lang);
                                    return iconUrl ? (
                                        <img key={idx} src={iconUrl} alt={lang} className="banner-lang-icon" title={lang} />
                                    ) : (
                                        <span key={idx} className="banner-lang-badge">{lang}</span>
                                    );
                                })}
                            </div>
                        </h1>
                    )}
                </div>
                <div className="banner-actions">
                    {joinCode && (
                        <div className="banner-join-code" title="Classroom Join Code">
                            <span className="join-code-label">Code:</span>
                            <span className="join-code-val">{joinCode}</span>
                        </div>
                    )}
                    <button className="secondary-btn" onClick={async () => { await fetchClassroomDetails(); setActiveModal('bulk_connection_cards'); }}>
                        Print Connection Cards
                    </button>
                    
                </div>
            </div>

            <div className="classroom-tabs" role="tablist" aria-label="Classroom navigation tabs">
                <button 
                    id="tab-stream" 
                    role="tab"
                    aria-selected={activeTab === 'stream'} 
                    aria-controls="pane-stream" 
                    className={`tab-btn ${activeTab === 'stream' ? 'active' : ''}`} 
                    onClick={() => setActiveTab('stream')}
                >
                    Stream
                </button>
                <button 
                    id="tab-classwork" 
                    role="tab"
                    aria-selected={activeTab === 'classwork'} 
                    aria-controls="pane-classwork" 
                    className={`tab-btn ${activeTab === 'classwork' ? 'active' : ''}`} 
                    onClick={() => setActiveTab('classwork')}
                >
                    Classwork
                </button>
                <button 
                    id="tab-people" 
                    role="tab"
                    aria-selected={activeTab === 'people'} 
                    aria-controls="pane-people" 
                    className={`tab-btn ${activeTab === 'people' ? 'active' : ''}`} 
                    onClick={() => setActiveTab('people')}
                >
                    People
                </button>
            </div>

            <div className="tab-content">
                {activeTab === 'stream' && (
                    <div className="tab-pane stream-pane">
                        <div className="stream-chat-wrapper">
                            <Chat filterClassroomId={classId} />
                        </div>
                    </div>
                )}

                {activeTab === 'classwork' && (
                    <div className="tab-pane classwork-pane">
                        <div className="admin-class-grid single-column">
                            <div className="control-panel-card assignments-card">
                                <div className="card-custom-header">
                                    <div className="title-section">
                                        <BookOpen size={20} />
                                        <h3>Classroom Languages</h3>
                                    </div>
                                </div>
                                <div className="language-toggles" style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', padding: '16px 24px' }}>
                                    {[
                                        { id: 'python', label: 'Python', icon: getLanguageIconUrl('python') },
                                        { id: 'javascript', label: 'JavaScript', icon: getLanguageIconUrl('javascript') },
                                        { id: 'html', label: 'HTML/CSS', icon: getLanguageIconUrl('html') },
                                        { id: 'java', label: 'Java', icon: getLanguageIconUrl('java') },
                                        { id: 'cpp', label: 'C++', icon: getLanguageIconUrl('cpp') }
                                    ].map(langOption => {
                                        const isActive = (classroom.language || '').split(',').map(l => l.trim()).includes(langOption.id);
                                        return (
                                            <button
                                                key={langOption.id}
                                                type="button"
                                                onClick={() => handleToggleLanguage(langOption.id)}
                                                aria-pressed={isActive}
                                                style={{
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    padding: '12px',
                                                    borderRadius: '8px',
                                                    border: `2px solid ${isActive ? 'var(--blue-600)' : 'transparent'}`,
                                                    background: isActive ? 'var(--btn-secondary-bg)' : 'var(--bg-secondary)',
                                                    cursor: 'pointer',
                                                    transition: 'all 0.2s'
                                                }}
                                                title={`Toggle ${langOption.label}`}
                                            >
                                                <img src={langOption.icon} alt={langOption.label} style={{ width: '32px', height: '32px' }} />
                                                <span style={{ fontSize: '0.85rem', fontWeight: isActive ? '600' : '400', color: 'var(--text-primary)' }}>{langOption.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="control-panel-card assignments-card">
                                <div className="card-custom-header">
                                    <div className="title-section">
                                        <BookOpen size={20} />
                                        <h3>Connected Courses</h3>
                                    </div>
                                    <button 
                                        type="button" 
                                        className="btn-action-sm primary add-course-btn"
                                        onClick={() => setActiveModal('add_course')}
                                        title="Add Connected Course"
                                        aria-label="Add Connected Course"
                                    >
                                        <Plus size={16} /> Add Course
                                    </button>
                                </div>
                                <div className="assignments-list">
                                    {classroom.course_assignments && classroom.course_assignments.length > 0 ? (
                                        classroom.course_assignments.map(assign => (
                                            <div key={assign.id} className="assignment-tile">
                                                <div className="tile-icon-wrapper">
                                                    {getCourseIcon(assign.course_name, assign.course_id)}
                                                </div>
                                                <span className="tile-label" title={assign.course_name || assign.course_id || 'Untitled Course'}>
                                                    {assign.course_name || assign.course_id || 'Untitled Course'}
                                                </span>
                                                <button
                                                    type="button"
                                                    className="tile-remove-btn"
                                                    onClick={() => handleDisconnectCourse(assign.id)}
                                                    disabled={formLoading}
                                                    title="Disconnect Course"
                                                    aria-label={`Disconnect course ${assign.course_name || assign.course_id}`}
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="empty-roster-msg">No courses connected.</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'people' && (
                    <div className="tab-pane people-pane">
                        <div className="admin-class-grid single-column">
                            <div className="control-panel-card roster-card">
                                <div className="card-custom-header">
                                    <div className="title-section">
                                        <h3>Students</h3>
                                    </div>
                                    <button 
                                        type="button"
                                        className="btn-action-sm primary" 
                                        onClick={() => setActiveModal('enroll_student')}
                                        title="Enroll Student"
                                        aria-label="Enroll Student"
                                    >
                                        <UserPlus size={18} />
                                    </button>
                                </div>

                                <div className="roster-list-container">
                                    {filteredRoster.length > 0 ? (
                                        <div className="roster-list">
                                            {filteredRoster.map(student => (
                                                <div key={student.id} className="roster-item">
                                                    <div role="button" tabIndex={0} className="student-info cursor-pointer" onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.currentTarget.click(); } }} onClick={() => navigate(`/admin/users/${student.id}`)}>
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
                            </div>
                        </div>
                    </div>
                )}


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
            <AddCourseModal
                key={activeModal}
                isOpen={activeModal === 'add_course'}
                onClose={() => setActiveModal(null)}
                onSubmit={handleAddCourse}
                courses={courses}
                loading={formLoading}
            />
            <EnrollStudentModal
                isOpen={activeModal === 'enroll_student'}
                onClose={() => setActiveModal(null)}
                onEnroll={handleEnrollStudent}
                availableStudents={availableStudents}
                joinCode={joinCode}
                onRegenerateJoinCode={handleRegenerateJoinCode}
                loading={formLoading}
            />
        </div>
    );
};

export default AdminClassDashboard;
