import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Download, Trash2 } from 'lucide-react';
import Papa from 'papaparse';
import toast from 'react-hot-toast';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import Skeleton from '../../components/common/Skeleton';
import { showConfirm } from '../../utils/confirm';
import { getErrorMessage } from '../../utils/apiError';
import { formatDuration } from '../../components/quiz/formatDuration';
import { listAdminQuizzes, updateQuizSettings, listAdminResults, deleteAttempt } from '../../api/quizzes';
import './AdminTests.css';

const TOGGLES = [
    { key: 'is_active', label: 'Active' },
    { key: 'reveal_answers', label: 'Answers shown' },
    { key: 'allow_retakes', label: 'Retakes' },
];

const STATUSES = [
    { value: '', label: 'All' },
    { value: 'submitted', label: 'Submitted' },
    { value: 'in_progress', label: 'In progress' },
];

const formatDate = (iso) => {
    if (!iso) return '';
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

const studentName = (student) => student?.nickname || student?.username || '';

const TimeLimitInput = ({ quiz, onCommit }) => {
    const saved = quiz.time_limit_minutes == null ? '' : String(quiz.time_limit_minutes);
    const [draft, setDraft] = useState(saved);

    useEffect(() => {
        setDraft(saved);
    }, [saved]);

    const commit = () => {
        const text = draft.trim();
        if (text === saved) return;
        if (text === '') {
            onCommit(null);
            return;
        }
        const minutes = Number(text);
        if (!Number.isInteger(minutes) || minutes < 1 || minutes > 600) {
            setDraft(saved);
            toast.error('Time limit must be 1-600');
            return;
        }
        onCommit(minutes);
    };

    return (
        <input
            type="number"
            min="1"
            max="600"
            step="1"
            className="admin-tests-input"
            aria-label={`Time limit (min): ${quiz.title}`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur();
            }}
        />
    );
};

const LoadingRows = () => (
    <div className="admin-tests-skeleton" aria-busy="true">
        <Skeleton height="2.5rem" />
        <Skeleton height="2.5rem" />
        <Skeleton height="2.5rem" />
    </div>
);

const AdminTests = () => {
    const [quizzes, setQuizzes] = useState([]);
    const [quizzesLoading, setQuizzesLoading] = useState(true);
    const [results, setResults] = useState([]);
    const [resultsLoading, setResultsLoading] = useState(true);
    const [quizFilter, setQuizFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [busyId, setBusyId] = useState(null);
    const requestRef = useRef(0);

    useEffect(() => {
        let cancelled = false;
        listAdminQuizzes()
            .then((data) => {
                if (!cancelled) setQuizzes(data?.quizzes || []);
            })
            .catch((error) => {
                if (!cancelled) toast.error(getErrorMessage(error, 'Failed to load tests'));
            })
            .finally(() => {
                if (!cancelled) setQuizzesLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const loadResults = useCallback(async () => {
        const request = ++requestRef.current;
        const params = {};
        if (quizFilter) params.quiz = quizFilter;
        if (statusFilter) params.status = statusFilter;
        try {
            const data = await listAdminResults(params);
            if (request === requestRef.current) setResults(data?.results || []);
        } catch (error) {
            if (request === requestRef.current) toast.error(getErrorMessage(error, 'Failed to load results'));
        } finally {
            if (request === requestRef.current) setResultsLoading(false);
        }
    }, [quizFilter, statusFilter]);

    useEffect(() => {
        loadResults();
    }, [loadResults]);

    const patchLocal = (slug, patch) =>
        setQuizzes((prev) => prev.map((q) => (q.slug === slug ? { ...q, ...patch } : q)));

    // Optimistic: apply the change now, put the old values back if the save fails.
    const saveSetting = async (quiz, patch) => {
        const previous = Object.fromEntries(Object.keys(patch).map((key) => [key, quiz[key]]));
        patchLocal(quiz.slug, patch);
        try {
            const data = await updateQuizSettings(quiz.slug, patch);
            if (data?.quiz) patchLocal(quiz.slug, data.quiz);
        } catch (error) {
            patchLocal(quiz.slug, previous);
            toast.error(getErrorMessage(error, 'Failed to save'));
        }
    };

    const handleDelete = async (row) => {
        const confirmed = await showConfirm(`${studentName(row.student)}, ${row.quiz?.title}`, {
            title: 'Delete result',
            confirmText: 'Delete',
            destructive: true,
        });
        if (!confirmed) return;
        setBusyId(row.id);
        try {
            await deleteAttempt(row.id);
            setResults((prev) => prev.filter((r) => r.id !== row.id));
            setQuizzes((prev) => prev.map((q) => {
                if (q.slug !== row.quiz?.slug) return q;
                return {
                    ...q,
                    attempt_count: Math.max(0, q.attempt_count - 1),
                    submitted_count: row.status === 'submitted' ? Math.max(0, q.submitted_count - 1) : q.submitted_count,
                };
            }));
        } catch (error) {
            toast.error(getErrorMessage(error, 'Failed to delete'));
        } finally {
            setBusyId(null);
        }
    };

    const handleExport = () => {
        const rows = results.map((r) => ({
            Student: studentName(r.student),
            Username: r.student?.username || '',
            Test: r.quiz?.title || '',
            Correct: r.correct ?? '',
            Total: r.total ?? '',
            Percent: r.score_percent ?? '',
            Seconds: r.elapsed_seconds ?? '',
            Submitted: r.submitted_at || '',
        }));
        const blob = new Blob([Papa.unparse(rows, { escapeFormulae: true })], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'test_results.csv');
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL?.(url);
    };

    return (
        <div className="admin-tests-page">
            <AdminPageHeader title="Tests" />

            <div className="admin-tests-card">
                {quizzesLoading ? <LoadingRows /> : (
                    <div className="admin-tests-scroll">
                        <table className="admin-tests-table" aria-label="Tests">
                            <thead>
                                <tr>
                                    <th>Title</th>
                                    <th>Questions</th>
                                    <th>Submitted</th>
                                    <th>Avg %</th>
                                    {TOGGLES.map((t) => <th key={t.key}>{t.label}</th>)}
                                    <th>Time limit (min)</th>
                                </tr>
                            </thead>
                            <tbody>
                                {quizzes.length === 0 ? (
                                    <tr><td colSpan={8} className="admin-tests-empty">None</td></tr>
                                ) : quizzes.map((quiz) => (
                                    <tr key={quiz.slug}>
                                        <td>{quiz.title}</td>
                                        <td>{quiz.question_count}</td>
                                        <td>{quiz.submitted_count}</td>
                                        <td>{quiz.average_percent == null ? '-' : `${quiz.average_percent}%`}</td>
                                        {TOGGLES.map((t) => (
                                            <td key={t.key}>
                                                <input
                                                    type="checkbox"
                                                    className="admin-tests-check"
                                                    aria-label={`${t.label}: ${quiz.title}`}
                                                    checked={Boolean(quiz[t.key])}
                                                    onChange={(e) => saveSetting(quiz, { [t.key]: e.target.checked })}
                                                />
                                            </td>
                                        ))}
                                        <td>
                                            <TimeLimitInput
                                                quiz={quiz}
                                                onCommit={(minutes) => saveSetting(quiz, { time_limit_minutes: minutes })}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="admin-tests-bar">
                <h2 className="admin-tests-heading">Results</h2>
                <div className="admin-tests-filters">
                    <select
                        className="admin-tests-select"
                        aria-label="Test"
                        value={quizFilter}
                        onChange={(e) => setQuizFilter(e.target.value)}
                    >
                        <option value="">All tests</option>
                        {quizzes.map((q) => <option key={q.slug} value={q.slug}>{q.title}</option>)}
                    </select>
                    <select
                        className="admin-tests-select"
                        aria-label="Status"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                    <button
                        type="button"
                        className="admin-tests-btn"
                        onClick={handleExport}
                        disabled={results.length === 0}
                    >
                        <Download size={16} aria-hidden="true" /> CSV
                    </button>
                </div>
            </div>

            <div className="admin-tests-card">
                {resultsLoading ? <LoadingRows /> : (
                    <div className="admin-tests-scroll">
                        <table className="admin-tests-table" aria-label="Results">
                            <thead>
                                <tr>
                                    <th>Student</th>
                                    <th>Test</th>
                                    <th>Score</th>
                                    <th>%</th>
                                    <th>Time</th>
                                    <th>Submitted</th>
                                    <th><span className="admin-tests-sr">Actions</span></th>
                                </tr>
                            </thead>
                            <tbody>
                                {results.length === 0 ? (
                                    <tr><td colSpan={7} className="admin-tests-empty">None</td></tr>
                                ) : results.map((row) => {
                                    const name = studentName(row.student);
                                    const submitted = row.status === 'submitted';
                                    return (
                                        <tr key={row.id}>
                                            <td>
                                                <Link className="admin-tests-link" to={`/admin/users/${row.student?.id}`}>{name}</Link>
                                            </td>
                                            <td>{row.quiz?.title}</td>
                                            <td>
                                                <Link
                                                    className="admin-tests-link"
                                                    to={`/admin/tests/results/${row.id}`}
                                                    aria-label={`Result: ${name}, ${row.quiz?.title}`}
                                                >
                                                    {submitted ? row.correct : '-'}/{row.total}
                                                </Link>
                                            </td>
                                            <td>{submitted && row.score_percent != null ? `${row.score_percent}%` : '-'}</td>
                                            <td>{formatDuration(row.elapsed_seconds)}</td>
                                            <td>{submitted ? formatDate(row.submitted_at) : 'In progress'}</td>
                                            <td className="admin-tests-actions">
                                                <button
                                                    type="button"
                                                    className="admin-tests-icon-btn"
                                                    aria-label={`Delete: ${name}, ${row.quiz?.title}`}
                                                    title="Delete"
                                                    disabled={busyId === row.id}
                                                    onClick={() => handleDelete(row)}
                                                >
                                                    <Trash2 size={16} aria-hidden="true" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminTests;
