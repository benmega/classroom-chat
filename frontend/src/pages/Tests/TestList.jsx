import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { listQuizzes } from '../../api/quizzes';
import { getErrorMessage } from '../../utils/apiError';
import Skeleton from '../../components/common/Skeleton';
import './TestList.css';

const actionFor = (quiz) => {
    if (quiz.in_progress_attempt_id) return { label: 'Resume', className: 'btn-primary' };
    if (quiz.attempts?.length) return { label: 'Retake', className: 'btn-secondary' };
    return { label: 'Start', className: 'btn-primary' };
};

const formatDate = (iso) => {
    if (!iso) return '';
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString();
};

const TestRow = ({ quiz }) => {
    const { label, className } = actionFor(quiz);
    const attempts = quiz.attempts || [];

    return (
        <li className="tests-row">
            <div className="tests-row-main">
                <h2 className="tests-row-title">{quiz.title}</h2>
                {quiz.description && <p className="tests-row-desc">{quiz.description}</p>}
                <div className="tests-row-meta">
                    <span>{quiz.question_count} questions</span>
                    {quiz.time_limit_minutes ? <span>{quiz.time_limit_minutes} min</span> : null}
                    {attempts.length > 0 && (
                        <span className="tests-row-scores">
                            {attempts.map((attempt, index) => (
                                <Link
                                    key={attempt.id}
                                    to={`/tests/results/${attempt.id}`}
                                    className={index === 0 ? 'tests-score tests-score-latest' : 'tests-score'}
                                    aria-label={`Result ${attempt.correct}/${attempt.total}${
                                        attempt.submitted_at ? `, ${formatDate(attempt.submitted_at)}` : ''
                                    }`}
                                >
                                    {attempt.correct}/{attempt.total}
                                </Link>
                            ))}
                        </span>
                    )}
                </div>
            </div>
            {quiz.can_start ? (
                <Link to={`/tests/${encodeURIComponent(quiz.slug)}`} className={`${className} tests-row-action`}>
                    {label}
                </Link>
            ) : (
                <button type="button" className={`${className} tests-row-action`} disabled>
                    {label}
                </button>
            )}
        </li>
    );
};

const TestList = () => {
    const [quizzes, setQuizzes] = useState(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        let cancelled = false;
        listQuizzes()
            .then((data) => {
                if (!cancelled) setQuizzes(data?.quizzes || []);
            })
            .catch((error) => {
                if (cancelled) return;
                setFailed(true);
                toast.error(getErrorMessage(error, 'Failed to load tests'));
            });
        return () => {
            cancelled = true;
        };
    }, []);

    let body;
    if (failed) {
        body = <p className="tests-empty">Tests unavailable</p>;
    } else if (quizzes === null) {
        body = (
            <div className="tests-loading" aria-busy="true" aria-label="Loading">
                <Skeleton height="84px" borderRadius="8px" />
                <Skeleton height="84px" borderRadius="8px" />
                <Skeleton height="84px" borderRadius="8px" />
            </div>
        );
    } else if (quizzes.length === 0) {
        body = <p className="tests-empty">No tests</p>;
    } else {
        body = (
            <ul className="tests-list">
                {quizzes.map((quiz) => (
                    <TestRow key={quiz.slug} quiz={quiz} />
                ))}
            </ul>
        );
    }

    return (
        <div className="tests-page">
            <h1 className="tests-heading">Tests</h1>
            {body}
        </div>
    );
};

export default TestList;
