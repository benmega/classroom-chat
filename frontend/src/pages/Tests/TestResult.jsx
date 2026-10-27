import React, { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, Printer } from 'lucide-react';
import { getAttempt } from '../../api/quizzes';
import Skeleton from '../../components/common/Skeleton';
import QuizResultView from '../../components/quiz/QuizResultView';
import './TestResult.css';

/** Which of the three result routes this is, from the URL prefix. */
const viewerOf = (pathname) => {
    if (pathname.startsWith('/parent/')) return 'parent';
    if (pathname.startsWith('/admin/')) return 'admin';
    return 'student';
};

const errorLine = (err) => {
    const status = err?.response?.status;
    return status === 403 || status === 404 ? 'Result not available' : 'Could not load result';
};

const TestResult = () => {
    const { attemptId } = useParams();
    const { pathname } = useLocation();
    const viewer = viewerOf(pathname);
    const [state, setState] = useState({ id: null, attempt: null, error: null });

    useEffect(() => {
        let cancelled = false;
        getAttempt(attemptId)
            .then((data) => {
                if (!cancelled) setState({ id: attemptId, attempt: data?.attempt ?? null, error: null });
            })
            .catch((err) => {
                if (!cancelled) setState({ id: attemptId, attempt: null, error: errorLine(err) });
            });
        return () => {
            cancelled = true;
        };
    }, [attemptId]);

    const settled = state.id === attemptId;
    const attempt = settled ? state.attempt : null;
    const error = settled ? state.error : null;

    // The owner reopening an unfinished attempt goes back to taking it.
    if (attempt?.status === 'in_progress' && Array.isArray(attempt.questions) && attempt.quiz?.slug) {
        return <Navigate to={`/tests/${attempt.quiz.slug}`} replace />;
    }

    let back = { to: '/tests', label: 'Back to tests' };
    if (viewer === 'admin') back = { to: '/admin/tests', label: 'Back to admin tests' };
    if (viewer === 'parent') {
        const studentId = attempt?.student?.id;
        back = {
            to: studentId ? `/parent/report/${studentId}` : '/parent/dashboard',
            label: 'Back to report card',
        };
    }

    return (
        <div className="test-result-page">
            <div className="test-result-bar-top">
                <Link to={back.to} className="test-result-back" aria-label={back.label}>
                    <ArrowLeft size={16} aria-hidden="true" /> Back
                </Link>
                {attempt?.status === 'submitted' && viewer !== 'student' && (
                    <button type="button" className="test-result-back" onClick={() => window.print()}>
                        <Printer size={16} aria-hidden="true" /> Print
                    </button>
                )}
            </div>
            {error && <p className="test-result-message" role="alert">{error}</p>}
            {!error && !attempt && (
                <div aria-busy="true" aria-label="Loading">
                    <Skeleton height="28px" borderRadius="6px" />
                    <Skeleton height="96px" borderRadius="8px" style={{ marginTop: '1rem' }} />
                </div>
            )}
            {attempt && <QuizResultView attempt={attempt} showStudent={viewer !== 'student'} />}
        </div>
    );
};

export default TestResult;
