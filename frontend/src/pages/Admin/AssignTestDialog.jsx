import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../../components/common/Modal';
import UserSearchInput from '../../components/common/UserSearchInput';
import { getErrorMessage } from '../../utils/apiError';
import { listAdminClassrooms, setQuizAssignments } from '../../api/quizzes';

// Reserved classrooms nobody is enrolled in for teaching
const RESERVED = new Set(['global', 'archive']);

const studentName = (student) => student?.nickname || student?.username || '';

// Who a test is open to: classrooms ticked and students added. None of either: everyone.
const AssignTestDialog = ({ quiz, onClose, onSaved }) => {
    const [classrooms, setClassrooms] = useState(null);
    const [classroomIds, setClassroomIds] = useState(
        () => new Set(quiz.assignments?.classrooms?.map((c) => c.id) || []),
    );
    const [students, setStudents] = useState(quiz.assignments?.students || []);
    const [search, setSearch] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        let cancelled = false;
        listAdminClassrooms()
            .then((data) => {
                if (!cancelled) setClassrooms((data?.classrooms || []).filter((c) => !RESERVED.has(c.id)));
            })
            .catch((error) => {
                if (cancelled) return;
                setClassrooms([]);
                toast.error(getErrorMessage(error, 'Failed to load classes'));
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const toggleClassroom = (id) =>
        setClassroomIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });

    const addStudent = (user) => {
        setSearch('');
        setStudents((prev) => (prev.some((s) => s.id === user.id) ? prev : [...prev, user]));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const data = await setQuizAssignments(quiz.slug, {
                classroom_ids: [...classroomIds],
                student_ids: students.map((s) => s.id),
            });
            if (data?.quiz) onSaved(data.quiz);
            onClose();
        } catch (error) {
            toast.error(getErrorMessage(error, 'Failed to save'));
        } finally {
            setSaving(false);
        }
    };

    const everyone = classroomIds.size === 0 && students.length === 0;

    return (
        <Modal isOpen onClose={onClose} title={`Assign: ${quiz.title}`} maxWidth="520px">
            <div className="admin-tests-assign">
                <fieldset className="admin-tests-assign-group">
                    <legend>Classes</legend>
                    {classrooms === null ? (
                        <p className="admin-tests-muted">Loading</p>
                    ) : classrooms.length === 0 ? (
                        <p className="admin-tests-muted">None</p>
                    ) : (
                        <div className="admin-tests-assign-classes">
                            {classrooms.map((c) => (
                                <label key={c.id} className="admin-tests-assign-option">
                                    <input
                                        type="checkbox"
                                        className="admin-tests-check"
                                        checked={classroomIds.has(c.id)}
                                        onChange={() => toggleClassroom(c.id)}
                                    />
                                    {c.name}
                                </label>
                            ))}
                        </div>
                    )}
                </fieldset>

                <fieldset className="admin-tests-assign-group">
                    <legend>Students</legend>
                    {students.length > 0 && (
                        <ul className="admin-tests-chips">
                            {students.map((s) => (
                                <li key={s.id} className="admin-tests-chip">
                                    {studentName(s)}
                                    <button
                                        type="button"
                                        className="admin-tests-chip-remove"
                                        aria-label={`Remove ${studentName(s)}`}
                                        onClick={() => setStudents((prev) => prev.filter((p) => p.id !== s.id))}
                                    >
                                        <X size={14} aria-hidden="true" />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                    <UserSearchInput
                        value={search}
                        onChange={setSearch}
                        onSelect={addStudent}
                        placeholder="Add student"
                        dropdownClassName="admin-tests-assign-results"
                    />
                </fieldset>

                <div className="admin-tests-assign-footer">
                    <span className="admin-tests-muted">{everyone ? 'Everyone' : ''}</span>
                    <div className="admin-tests-assign-actions">
                        <button type="button" className="admin-tests-btn" onClick={onClose}>Cancel</button>
                        <button type="button" className="btn-primary" onClick={handleSave} disabled={saving}>
                            Save
                        </button>
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default AssignTestDialog;
