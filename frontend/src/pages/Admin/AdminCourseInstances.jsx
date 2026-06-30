import React, { useState, useEffect, useCallback } from 'react';
import { 
    Plus, 
    Edit2, 
    Trash2, 
    RefreshCw,
    Search,
    BookOpen,
    X,
    FolderKanban
} from 'lucide-react';
import client from '../../api/client';
import toast from 'react-hot-toast';
import './AdminCourseInstances.css';
import Skeleton from '../../components/common/Skeleton';
import AdminPageHeader from '../../components/admin/AdminPageHeader';

const AdminCourseInstances = () => {
    const [instances, setInstances] = useState([]);
    const [classrooms, setClassrooms] = useState([]);
    const [courses, setCourses] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    
    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
    const [selectedInstance, setSelectedInstance] = useState(null);
    
    // Form fields
    const [formId, setFormId] = useState('');
    const [formClassroomId, setFormClassroomId] = useState('');
    const [formCourseId, setFormCourseId] = useState('');
    const [formErrors, setFormErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Search/Filters
    const [searchTerm, setSearchTerm] = useState('');

    const fetchData = useCallback(async (quiet = false) => {
        if (!quiet) setIsLoading(true);
        else setIsRefreshing(true);
        
        try {
            const [instancesRes, classroomsRes, coursesRes] = await Promise.all([
                client.get('/api/admin/crud/courseinstance'),
                client.get('/api/admin/crud/classroom'),
                client.get('/api/admin/crud/course')
            ]);
            
            setInstances(instancesRes.data.data || []);
            setClassrooms(classroomsRes.data.data || []);
            setCourses(coursesRes.data.data || []);
        } catch (error) {
            toast.error('Failed to load course instances data.');
            console.error(error);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleOpenCreateModal = () => {
        setModalMode('create');
        setFormId('');
        setFormClassroomId(classrooms[0]?.id || '');
        setFormCourseId(courses[0]?.id || '');
        setFormErrors({});
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (instance) => {
        setModalMode('edit');
        setSelectedInstance(instance);
        setFormId(instance.id);
        setFormClassroomId(instance.classroom_id || '');
        setFormCourseId(instance.course_id || '');
        setFormErrors({});
        setIsModalOpen(true);
    };

    const validateForm = () => {
        const errors = {};
        if (!formId.trim()) {
            errors.id = 'Instance ID is required';
        }
        if (!formClassroomId) {
            errors.classroom_id = 'Classroom is required';
        }
        if (!formCourseId) {
            errors.course_id = 'Course is required';
        }
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;

        setIsSubmitting(true);
        const payload = {
            id: formId,
            classroom_id: formClassroomId,
            course_id: formCourseId
        };

        try {
            if (modalMode === 'create') {
                await client.post('/api/admin/crud/courseinstance', payload);
                toast.success('Course Instance created successfully.');
            } else {
                await client.put(`/api/admin/crud/courseinstance/${selectedInstance.id}`, payload);
                toast.success('Course Instance updated successfully.');
            }
            setIsModalOpen(false);
            fetchData(true);
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to save course instance.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to permanently delete this course instance?')) return;

        try {
            await client.delete(`/api/admin/crud/courseinstance/${id}`);
            toast.success('Course Instance deleted.');
            fetchData(true);
        } catch {
            toast.error('Failed to delete course instance.');
        }
    };

    // Resolvers
    const getClassroomName = (id) => {
        const room = classrooms.find(c => c.id === id);
        return room ? room.name : id;
    };

    const getCourseName = (id) => {
        const course = courses.find(c => c.id === id);
        return course ? course.name : id;
    };

    const filteredInstances = instances.filter(inst => {
        const search = searchTerm.toLowerCase();
        const instId = (inst.id || '').toLowerCase();
        const classroomName = getClassroomName(inst.classroom_id).toLowerCase();
        const courseName = getCourseName(inst.course_id).toLowerCase();
        
        return instId.includes(search) || 
               classroomName.includes(search) || 
               courseName.includes(search);
    });

    if (isLoading) {
        return (
            <div className="admin-course-instances-page">
                <AdminPageHeader title="Course Instances">
                    <Skeleton height="36px" width="200px" borderRadius="18px" />
                    <Skeleton height="36px" width="120px" borderRadius="18px" />
                </AdminPageHeader>
                <div className="instances-stats-row" style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
                    <Skeleton height="80px" style={{ flex: 1 }} borderRadius="8px" />
                    <Skeleton height="80px" style={{ flex: 1 }} borderRadius="8px" />
                    <Skeleton height="80px" style={{ flex: 1 }} borderRadius="8px" />
                </div>
                <div className="instances-table-container card">
                    {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} style={{ padding: '12px 24px' }}>
                            <Skeleton height="40px" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="admin-course-instances-page">
            <AdminPageHeader title="Course Instances">
                <div className="search-bar">
                    <Search size={18} />
                    <input 
                        type="text" 
                        placeholder="Search by instance ID, classroom, or course..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <button className="primary-btn" onClick={handleOpenCreateModal}>
                    <Plus size={18} /> Add Instance
                </button>
                <button 
                    className={`refresh-btn ${isRefreshing ? 'spinning' : ''}`}
                    onClick={() => fetchData(true)}
                    disabled={isRefreshing}
                >
                    <RefreshCw size={18} />
                </button>
            </AdminPageHeader>

            <div className="instances-stats-row">
                <div className="stat-mini-card">
                    <span className="label">Total Instances</span>
                    <span className="value">{instances.length}</span>
                </div>
                <div className="stat-mini-card">
                    <span className="label">Assigned Classrooms</span>
                    <span className="value">{new Set(instances.map(i => i.classroom_id)).size}</span>
                </div>
                <div className="stat-mini-card">
                    <span className="label">Assigned Courses</span>
                    <span className="value">{new Set(instances.map(i => i.course_id)).size}</span>
                </div>
            </div>

            <div className="instances-table-container card">
                <table className="instances-table">
                    <thead>
                        <tr>
                            <th>Instance ID (Unique Identifier)</th>
                            <th>Classroom</th>
                            <th>Course</th>
                            <th>Created At</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredInstances.length > 0 ? (
                            filteredInstances.map(inst => (
                                <tr key={inst.id}>
                                    <td>
                                        <div className="instance-id-cell">
                                            <FolderKanban size={16} className="icon" />
                                            <span className="id-text">{inst.id}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <span className="classroom-pill">
                                            {getClassroomName(inst.classroom_id)}
                                        </span>
                                    </td>
                                    <td>
                                        <span className="course-pill">
                                            <BookOpen size={12} className="course-icon-margin" />
                                            {getCourseName(inst.course_id)}
                                        </span>
                                    </td>
                                    <td>
                                        <span className="date-text">
                                            {inst.created_at ? new Date(inst.created_at).toLocaleDateString() : 'N/A'}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="action-group">
                                            <button 
                                                className="action-btn edit" 
                                                onClick={() => handleOpenEditModal(inst)}
                                                title="Edit Instance"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button 
                                                className="action-btn delete" 
                                                onClick={() => handleDelete(inst.id)}
                                                title="Delete Instance"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="5" className="empty-row">
                                    No course instances found matching your search.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Create/Edit Modal */}
            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-card">
                        <div className="modal-header">
                            <h3>{modalMode === 'create' ? 'Create Course Instance' : 'Edit Course Instance'}</h3>
                            <button className="close-btn" onClick={() => setIsModalOpen(false)}>
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="modal-form">
                            <div className="form-group">
                                <label htmlFor="instance-id">Instance ID (Unique Identifier)</label>
                                <input 
                                    type="text" 
                                    id="instance-id"
                                    value={formId}
                                    onChange={(e) => setFormId(e.target.value)}
                                    placeholder="e.g. Sat1030CS4PY or 678b56dc..."
                                    disabled={modalMode === 'edit'}
                                    className={formErrors.id ? 'error' : ''}
                                />
                                {formErrors.id && <span className="error-text">{formErrors.id}</span>}
                            </div>

                            <div className="form-group">
                                <label htmlFor="classroom-select">Classroom</label>
                                <select 
                                    id="classroom-select"
                                    value={formClassroomId}
                                    onChange={(e) => setFormClassroomId(e.target.value)}
                                    className={formErrors.classroom_id ? 'error' : ''}
                                >
                                    <option value="" disabled>Select a classroom...</option>
                                    {classrooms.map(room => (
                                        <option key={room.id} value={room.id}>{room.name} ({room.id})</option>
                                    ))}
                                </select>
                                {formErrors.classroom_id && <span className="error-text">{formErrors.classroom_id}</span>}
                            </div>

                            <div className="form-group">
                                <label htmlFor="course-select">Course</label>
                                <select 
                                    id="course-select"
                                    value={formCourseId}
                                    onChange={(e) => setFormCourseId(e.target.value)}
                                    className={formErrors.course_id ? 'error' : ''}
                                >
                                    <option value="" disabled>Select a course...</option>
                                    {courses.map(course => (
                                        <option key={course.id} value={course.id}>{course.name} ({course.id})</option>
                                    ))}
                                </select>
                                {formErrors.course_id && <span className="error-text">{formErrors.course_id}</span>}
                            </div>

                            <div className="modal-footer">
                                <button 
                                    type="button" 
                                    className="secondary-btn" 
                                    onClick={() => setIsModalOpen(false)}
                                    disabled={isSubmitting}
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    className="primary-btn"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? 'Saving...' : 'Save Instance'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminCourseInstances;
