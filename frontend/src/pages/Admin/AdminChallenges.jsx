import React, { useState, useEffect, useMemo, useRef } from 'react';
import { FileUp, Save, Info, Database, Folder, ArrowLeft, Plus, X, GripVertical } from 'lucide-react';
import client from '../../api/client';
import toast from 'react-hot-toast';
import './AdminChallenges.css';
import Papa from 'papaparse';
import Modal from '../../components/common/Modal';
import { getCourseHeaderImage } from '../../constants/courseImages';

const AdminChallenges = () => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [courses, setCourses] = useState([]);

    // Drill-down view state
    const [selectedCourseId, setSelectedCourseId] = useState(null);

    // List view state
    const [groupedChallenges, setGroupedChallenges] = useState({});
    const [isLoadingList, setIsLoadingList] = useState(true);

    // Bulk Import Modal state
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [parsedChallenges, setParsedChallenges] = useState([]);
    const [fileName, setFileName] = useState('');

    // Single Challenge Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingChallenge, setEditingChallenge] = useState(null);
    const [modalForm, setModalForm] = useState({
        name: '', slug: '', course_id: '', domain: 'codecombat.com', difficulty: 'medium', value: 1, sequence: '', description: ''
    });

    // Drag and Drop state
    const dragItem = useRef(null);
    const dragOverItem = useRef(null);

    const handleSort = async () => {
        if (dragItem.current === null || dragOverItem.current === null || dragItem.current === dragOverItem.current) {
            dragItem.current = null;
            dragOverItem.current = null;
            return;
        }
        
        let _grouped = { ...groupedChallenges };
        let items = [..._grouped[selectedCourseId]];
        
        const draggedItemContent = items.splice(dragItem.current, 1)[0];
        items.splice(dragOverItem.current, 0, draggedItemContent);
        
        _grouped[selectedCourseId] = items;
        setGroupedChallenges(_grouped);
        
        const updates = items.map((c, index) => ({ id: c.id, sequence: index + 1 }));
        
        dragItem.current = null;
        dragOverItem.current = null;

        try {
            await client.put('/api/admin/challenges/reorder', { updates });
            // We successfully saved order, no toast to avoid spam
        } catch (_error) {
            toast.error('Failed to save new order');
        }
    };

    useEffect(() => {
        fetchCourses();
        fetchGroupedChallenges();
    }, []);

    const fetchCourses = async () => {
        try {
            const res = await client.get('/api/admin/crud/courses');
            if (res.data && res.data.data) {
                setCourses(res.data.data);
            }
        } catch (err) {
            console.error("Failed to fetch courses", err);
        }
    };

    const getCourseName = (id) => {
        const course = courses.find(c => c.id === id);
        return course ? course.name : id;
    };

    const fetchGroupedChallenges = async () => {
        setIsLoadingList(true);
        try {
            const response = await client.get('/api/admin/challenges/all_grouped');
            if (response.data && response.data.data && response.data.data.challenges) {
                setGroupedChallenges(response.data.data.challenges);
            } else if (response.data && response.data.challenges) {
                setGroupedChallenges(response.data.challenges);
            }
        } catch (error) {
            console.error('Fetch challenges error:', error);
            toast.error('Failed to fetch challenges.');
        } finally {
            setIsLoadingList(false);
        }
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        setFileName(file.name);
        
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                if (results.data && results.data.length > 0) {
                    const challenges = results.data.map(row => {
                        const keys = Object.keys(row);
                        const findKey = (search) => keys.find(k => k.toLowerCase().trim().replace(/ /g, '_') === search || k.toLowerCase().trim() === search);
                        
                        const nameKey = findKey('name');
                        const slugKey = findKey('slug');
                        const descKey = findKey('description');
                        const seqKey = findKey('sequence');
                        const courseKey = findKey('course_id') || findKey('courseid') || findKey('course id');
                        const domainKey = findKey('domain');
                        const diffKey = findKey('difficulty');
                        const valueKey = findKey('value');

                        return {
                            name: nameKey ? row[nameKey] : '',
                            slug: slugKey ? row[slugKey] : '',
                            description: descKey ? row[descKey] : '',
                            sequence: seqKey && row[seqKey] ? parseInt(row[seqKey], 10) : null,
                            course_id: courseKey ? row[courseKey] : '',
                            domain: domainKey ? row[domainKey] : 'codecombat.com',
                            difficulty: diffKey ? row[diffKey] : 'medium',
                            value: valueKey ? parseInt(row[valueKey], 10) : 1,
                        };
                    }).filter(c => c.name && c.slug && c.course_id);
                    
                    if (challenges.length === 0) {
                        toast.error("No valid challenges found. Ensure 'Name', 'Slug', and 'Course ID' exist.");
                    } else {
                        setParsedChallenges(challenges);
                    }
                } else {
                    toast.error("No valid data found in CSV");
                }
            },
            error: (_error) => {
                toast.error("Error parsing CSV file");
            }
        });
    };

    const handleBulkSubmit = async (e) => {
        e.preventDefault();
        if (parsedChallenges.length === 0) {
            toast.error("Please upload a CSV file with valid challenge data.");
            return;
        }
        setIsSubmitting(true);
        const payload = {
            challenges: parsedChallenges
        };

        try {
            const response = await client.post('/api/admin/challenges/bulk_add', payload);
            if (response.data) {
                toast.success(response.data.message || 'Challenges imported.');
                setParsedChallenges([]);
                setFileName('');
                setIsBulkModalOpen(false);
                fetchGroupedChallenges();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to add challenges.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const openModal = (challenge = null) => {
        setEditingChallenge(challenge);
        if (challenge) {
            setModalForm({
                name: challenge.name || '',
                slug: challenge.slug || '',
                course_id: challenge.course_id || '',
                domain: challenge.domain || 'codecombat.com',
                difficulty: challenge.difficulty || 'medium',
                value: challenge.value || 1,
                sequence: challenge.sequence || '',
                description: challenge.description || ''
            });
        } else {
            setModalForm({
                name: '', slug: '', course_id: selectedCourseId || '', domain: 'codecombat.com', difficulty: 'medium', value: 1, sequence: '', description: ''
            });
        }
        setIsModalOpen(true);
    };

    const handleModalSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            if (editingChallenge) {
                const res = await client.put(`/api/admin/challenges/edit/${editingChallenge.id}`, modalForm);
                toast.success(res.data.message || 'Challenge updated.');
            } else {
                const res = await client.post('/api/admin/challenges/add', modalForm);
                toast.success(res.data.message || 'Challenge added.');
            }
            setIsModalOpen(false);
            fetchGroupedChallenges();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Action failed.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id, name) => {
        if (!window.confirm(`Are you sure you want to delete challenge "${name}"?`)) return;
        try {
            const res = await client.delete(`/api/admin/challenges/${id}`);
            toast.success(res.data.message || 'Challenge deleted.');
            fetchGroupedChallenges();
        } catch (_error) {
            toast.error('Failed to delete challenge.');
        }
    };

    const courseIds = useMemo(() => Object.keys(groupedChallenges).sort(), [groupedChallenges]);

    return (
        <div className="admin-challenges-page">
            <div className="d-flex justify-end mb-1-5rem">
                <div className="d-flex gap-md">
                    <button className="secondary-btn" onClick={() => setIsBulkModalOpen(true)}>
                        <FileUp size={18} /> Bulk Import
                    </button>
                    <button className="primary-btn" onClick={() => openModal()}>
                        <Plus size={18} /> Add Challenge
                    </button>
                </div>
            </div>

            <div className="card" style={{ padding: '24px' }}>
                {isLoadingList ? (
                    <div className="text-center text-muted py-2rem">Loading challenges...</div>
                ) : courseIds.length === 0 ? (
                    <div className="empty-state text-muted" style={{ width: '100%', textAlign: 'center', padding: '20px' }}>
                        No challenges found. Try adding some!
                    </div>
                ) : selectedCourseId === null ? (
                    // COURSES VIEW
                    <div className="courses-grid">
                        {courseIds.map(courseId => {
                            const courseName = getCourseName(courseId);
                            const courseDomain = courses.find(c => c.id === courseId)?.domain;
                            const courseImg = getCourseHeaderImage(courseId, courseName, courseDomain);
                            return (
                                <div
                                    key={courseId}
                                    className="course-card"
                                    onClick={() => setSelectedCourseId(courseId)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            setSelectedCourseId(courseId);
                                        }
                                    }}
                                    role="button"
                                    tabIndex={0}
                                >
                                    <div 
                                        className="course-card-header"
                                        style={{
                                            backgroundImage: courseImg ? `url(${courseImg})` : 'none',
                                            backgroundColor: courseImg ? 'transparent' : 'var(--purple-600)'
                                        }}
                                    >
                                        {!courseImg && <Folder size={48} />}
                                    </div>
                                    <div className="course-card-body">
                                        <div className="course-card-title" title={courseName}>
                                            {courseName}
                                        </div>
                                        <div className="course-card-meta">
                                            {groupedChallenges[courseId].length} Challenges
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    // COURSE DETAILS VIEW
                    <div className="course-details-view">
                        <button className="secondary-btn mb-1rem" onClick={() => setSelectedCourseId(null)} style={{ padding: '0.5rem 1rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', cursor: 'pointer' }}>
                            <ArrowLeft size={16} /> Back to Courses
                        </button>
                        
                        <div className="challenges-list mt-1rem">
                            {groupedChallenges[selectedCourseId]?.map((c, index) => (
                                <div
                                    key={c.id}
                                    className="challenge-list-item"
                                    draggable
                                    onDragStart={(_e) => { dragItem.current = index; }}
                                    onDragEnter={(_e) => { dragOverItem.current = index; }}
                                    onDragEnd={handleSort}
                                    onDragOver={(e) => e.preventDefault()}
                                    onClick={() => openModal(c)}
                                >
                                    <div className="drag-handle" onClick={(e) => e.stopPropagation()}>
                                        <GripVertical size={20} color="var(--text-secondary)" />
                                    </div>
                                    <div className="challenge-list-icon">
                                        <Database size={20} color="var(--purple-600)" />
                                    </div>
                                    <div className="challenge-list-content">
                                        <div className="challenge-list-title" title={c.name}>
                                            {c.name}
                                        </div>
                                        <div className="challenge-list-desc">
                                            <code>{c.slug}</code>
                                        </div>
                                    </div>
                                    <div className="challenge-list-meta">
                                        Seq: {index + 1} | Val: {c.value}🦆
                                    </div>
                                    <button
                                        type="button"
                                        className="challenge-list-remove-btn"
                                        onClick={(e) => { e.stopPropagation(); handleDelete(c.id, c.name); }}
                                        title="Delete Challenge"
                                    >
                                        <X size={18} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {/* Bulk Import Modal */}
            <Modal isOpen={isBulkModalOpen} onClose={() => setIsBulkModalOpen(false)} title="Bulk Import Challenges">
                <form onSubmit={handleBulkSubmit} className="admin-form">
                    <div className="bulk-import-help">
                        <h4><Info size={16} /> Required CSV Format</h4>
                        <p>Your CSV file must include headers matching the following column names. The import uses these columns to configure each challenge row.</p>
                        <ul>
                            <li><strong>Name</strong>: Display name of the challenge</li>
                            <li><strong>Slug</strong>: Unique identifier</li>
                            <li><strong>Course ID</strong>: Target course (e.g., <code>comp-sci-101</code>)</li>
                        </ul>
                        <p><em>Optional but recommended:</em> <strong>Description</strong>, <strong>Sequence</strong>, <strong>Domain</strong>, <strong>Difficulty</strong>, <strong>Value</strong>.</p>
                    </div>

                    <div className="form-group" style={{ marginTop: '1.5rem' }}>
                        <div className="file-upload-wrapper">
                            <input 
                                type="file" 
                                accept=".csv" 
                                onChange={handleFileUpload}
                                id="csv-upload"
                                className="file-input"
                            />
                            <label htmlFor="csv-upload" className="file-label" style={{ border: '2px dashed var(--border-color)', padding: '2rem', textAlign: 'center', borderRadius: 'var(--radius-md)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-tertiary)' }}>
                                <FileUp size={32} color="var(--text-secondary)" /> 
                                <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}>
                                    {fileName ? fileName : 'Click to select CSV file...'}
                                </span>
                            </label>
                        </div>
                    </div>

                    <div className="modal-actions mt-1-5rem d-flex justify-end gap-md">
                        <button type="button" className="btn-secondary" onClick={() => setIsBulkModalOpen(false)} disabled={isSubmitting}>Cancel</button>
                        <button type="submit" className="btn-primary" disabled={isSubmitting || parsedChallenges.length === 0}>
                            {isSubmitting ? 'Importing...' : `Import ${parsedChallenges.length > 0 ? parsedChallenges.length : ''} Challenges`}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Single Edit/Add Modal */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingChallenge ? 'Edit Challenge' : 'Add Challenge'}>
                <form onSubmit={handleModalSubmit} className="admin-form">
                    <div className="form-group">
                        <label htmlFor="modal-name">Challenge Name *</label>
                        <input id="modal-name" type="text" required value={modalForm.name} onChange={e => setModalForm({...modalForm, name: e.target.value})} />
                    </div>
                    <div className="form-group">
                        <label htmlFor="modal-slug">Slug *</label>
                        <input id="modal-slug" type="text" required value={modalForm.slug} onChange={e => setModalForm({...modalForm, slug: e.target.value})} />
                    </div>
                    <div className="form-group">
                        <label htmlFor="modal-course">Course ID *</label>
                        <input id="modal-course" type="text" required value={modalForm.course_id} onChange={e => setModalForm({...modalForm, course_id: e.target.value})} list="modal-course-list" />
                        <datalist id="modal-course-list">
                            {courses.map(course => <option key={course.id} value={course.id}>{course.name}</option>)}
                        </datalist>
                    </div>
                    <div className="form-group">
                        <label htmlFor="modal-domain">Domain</label>
                        <select id="modal-domain" className="admin-select" value={modalForm.domain} onChange={e => setModalForm({...modalForm, domain: e.target.value})}>
                            <option value="codecombat.com">codecombat.com</option>
                            <option value="studio.code.org">studio.code.org</option>
                            <option value="ozaria.com">ozaria.com</option>
                            <option value="other">other</option>
                        </select>
                    </div>
                    <div className="form-group flex-row gap-md">
                        <div className="flex-1">
                            <label htmlFor="modal-difficulty">Difficulty</label>
                            <select id="modal-difficulty" className="admin-select" value={modalForm.difficulty} onChange={e => setModalForm({...modalForm, difficulty: e.target.value})}>
                                <option value="easy">Easy</option>
                                <option value="medium">Medium</option>
                                <option value="hard">Hard</option>
                            </select>
                        </div>
                        <div className="flex-1">
                            <label htmlFor="modal-value">Value</label>
                            <input id="modal-value" type="number" required min="1" value={modalForm.value} onChange={e => setModalForm({...modalForm, value: e.target.value})} />
                        </div>
                        <div className="flex-1">
                            <label htmlFor="modal-sequence">Sequence</label>
                            <input id="modal-sequence" type="number" value={modalForm.sequence} onChange={e => setModalForm({...modalForm, sequence: e.target.value})} />
                        </div>
                    </div>
                    <div className="form-group">
                        <label htmlFor="modal-description">Description</label>
                        <textarea id="modal-description" rows="3" value={modalForm.description} onChange={e => setModalForm({...modalForm, description: e.target.value})} />
                    </div>

                    <div className="modal-actions mt-1-5rem d-flex justify-end gap-md">
                        <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>Cancel</button>
                        <button type="submit" className="btn-primary" disabled={isSubmitting}>
                            {isSubmitting ? 'Saving...' : 'Save Challenge'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default AdminChallenges;
