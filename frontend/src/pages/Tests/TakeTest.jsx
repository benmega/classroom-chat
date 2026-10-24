import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { saveAttempt, startAttempt, submitAttempt } from '../../api/quizzes';
import { getErrorMessage } from '../../utils/apiError';
import { showConfirm } from '../../utils/confirm';
import DiagramFrame from '../../components/quiz/DiagramFrame';
import Skeleton from '../../components/common/Skeleton';
import './TakeTest.css';

const SAVE_DEBOUNCE_MS = 800;
const SAVE_INTERVAL_MS = 15000;

const SAVE_LABELS = { saving: 'Saving', saved: 'Saved', error: 'Not saved' };

const formatClock = (totalSeconds) => {
    const safe = Math.max(0, Math.floor(totalSeconds));
    const hours = Math.floor(safe / 3600);
    const minutes = Math.floor((safe % 3600) / 60);
    const seconds = safe % 60;
    const mm = String(minutes).padStart(2, '0');
    const ss = String(seconds).padStart(2, '0');
    return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
};

// Counts up from the elapsed time the server already holds, or down to the deadline when there is one.
const Clock = ({ baseMs, deadlineMs, onExpire }) => {
    const [now, setNow] = useState(() => Date.now());
    const onExpireRef = useRef(onExpire);

    useEffect(() => {
        onExpireRef.current = onExpire;
    }, [onExpire]);

    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, []);

    const remaining = deadlineMs ? Math.ceil((deadlineMs - now) / 1000) : null;
    const expired = remaining !== null && remaining <= 0;

    useEffect(() => {
        if (expired) onExpireRef.current?.();
    }, [expired]);

    const seconds = remaining !== null ? remaining : (now - baseMs) / 1000;
    return (
        <span
            className={`take-test-clock${remaining !== null && remaining <= 60 ? ' take-test-clock-low' : ''}`}
            role="timer"
            aria-label={remaining !== null ? 'Time left' : 'Time'}
        >
            {formatClock(seconds)}
        </span>
    );
};

const Notice = ({ children }) => (
    <div className="take-test-page">
        <p className="take-test-notice">{children}</p>
        <Link to="/tests" className="take-test-back">Tests</Link>
    </div>
);

const TakeTest = () => {
    const { slug } = useParams();
    const navigate = useNavigate();

    const [phase, setPhase] = useState('loading'); // loading | ready | blocked | expired
    const [blockedMessage, setBlockedMessage] = useState('');
    const [attempt, setAttempt] = useState(null);
    const [answers, setAnswers] = useState({});
    const [flagged, setFlagged] = useState([]);
    const [index, setIndex] = useState(0);
    const [saveState, setSaveState] = useState('idle'); // idle | saving | saved | error
    const [submitting, setSubmitting] = useState(false);

    const attemptIdRef = useRef(null);
    const answersRef = useRef({});
    const flaggedRef = useRef([]);
    const baseMsRef = useRef(Date.now());
    const lastElapsedRef = useRef(0);
    const dirtyRef = useRef(false);
    const lockedRef = useRef(false);
    const inFlightRef = useRef(false);
    const queuedRef = useRef(false);
    const debounceRef = useRef(null);
    const submittingRef = useRef(false);

    // Never reports less than it already has: the server rejects a decreasing value.
    const getElapsed = useCallback(() => {
        const computed = Math.max(0, Math.floor((Date.now() - baseMsRef.current) / 1000));
        lastElapsedRef.current = Math.max(lastElapsedRef.current, computed);
        return lastElapsedRef.current;
    }, []);

    const progress = useCallback(
        () => ({
            answers: answersRef.current,
            flagged: flaggedRef.current,
            elapsed_seconds: getElapsed(),
        }),
        [getElapsed]
    );

    const goToResult = useCallback(
        (id) => {
            lockedRef.current = true;
            navigate(`/tests/results/${id}`, { replace: true });
        },
        [navigate]
    );

    // Sends everything (answers and flags go whole, so a retry is always safe); one request at a time.
    const flush = useCallback(
        async function run({ quiet = false } = {}) {
            const id = attemptIdRef.current;
            if (!id || lockedRef.current) return;
            clearTimeout(debounceRef.current);
            if (inFlightRef.current) {
                queuedRef.current = true;
                return;
            }
            inFlightRef.current = true;
            dirtyRef.current = false;
            if (!quiet) setSaveState('saving');
            try {
                await saveAttempt(id, progress());
                if (!quiet) setSaveState('saved');
            } catch (error) {
                const status = error?.response?.status;
                if (status === 409 && error.response.data?.expired) {
                    lockedRef.current = true;
                    setPhase('expired');
                } else if (status === 409) {
                    goToResult(id);
                } else {
                    dirtyRef.current = true;
                    setSaveState('error');
                }
            } finally {
                inFlightRef.current = false;
                if (queuedRef.current) {
                    queuedRef.current = false;
                    run({ quiet });
                }
            }
        },
        [progress, goToResult]
    );

    const markDirty = useCallback(() => {
        dirtyRef.current = true;
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => flush(), SAVE_DEBOUNCE_MS);
    }, [flush]);

    // Start (or resume) the attempt.
    useEffect(() => {
        let cancelled = false;
        setPhase('loading');
        startAttempt(slug)
            .then((data) => {
                if (cancelled) return;
                const state = data.attempt;
                attemptIdRef.current = state.id;
                answersRef.current = state.answers || {};
                flaggedRef.current = state.flagged || [];
                lastElapsedRef.current = state.elapsed_seconds || 0;
                baseMsRef.current = Date.now() - lastElapsedRef.current * 1000;
                lockedRef.current = false;
                setAttempt(state);
                setAnswers(answersRef.current);
                setFlagged(flaggedRef.current);
                setIndex(0);
                setPhase('ready');
            })
            .catch((error) => {
                if (cancelled) return;
                const status = error?.response?.status;
                if (status === 403) {
                    setBlockedMessage(getErrorMessage(error, 'Not available'));
                } else if (status === 404) {
                    setBlockedMessage('Test not found');
                } else {
                    setBlockedMessage('Failed to load test');
                    toast.error(getErrorMessage(error, 'Failed to load test'));
                }
                setPhase('blocked');
            });
        return () => {
            cancelled = true;
        };
    }, [slug]);

    // Periodic elapsed-time save, and a save when the page is hidden, closed or left.
    useEffect(() => {
        if (phase !== 'ready') return undefined;
        const interval = setInterval(() => flush({ quiet: true }), SAVE_INTERVAL_MS);
        const onVisibility = () => {
            if (document.visibilityState === 'hidden') flush({ quiet: true });
        };
        const onPageHide = () => flush({ quiet: true });
        document.addEventListener('visibilitychange', onVisibility);
        window.addEventListener('pagehide', onPageHide);
        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', onVisibility);
            window.removeEventListener('pagehide', onPageHide);
            clearTimeout(debounceRef.current);
            if (dirtyRef.current) flush({ quiet: true });
        };
    }, [phase, flush]);

    const questions = attempt?.questions;
    const total = questions?.length ?? 0;
    const question = questions?.[index];

    const answeredCount = useMemo(
        () => (questions || []).filter((q) => answers[q.number]).length,
        [questions, answers]
    );

    const selectOption = (number, letter) => {
        if (submittingRef.current) return;
        answersRef.current = { ...answersRef.current, [number]: letter };
        setAnswers(answersRef.current);
        markDirty();
    };

    const toggleFlag = (number) => {
        if (submittingRef.current) return;
        const next = flaggedRef.current.includes(number)
            ? flaggedRef.current.filter((n) => n !== number)
            : [...flaggedRef.current, number];
        flaggedRef.current = next;
        setFlagged(next);
        markDirty();
    };

    const doSubmit = useCallback(async () => {
        const id = attemptIdRef.current;
        if (!id || submittingRef.current || lockedRef.current) return;
        submittingRef.current = true;
        setSubmitting(true);
        clearTimeout(debounceRef.current);
        try {
            await submitAttempt(id, progress());
            goToResult(id);
        } catch (error) {
            const status = error?.response?.status;
            if (status === 409 && error.response.data?.expired) {
                lockedRef.current = true;
                setPhase('expired');
            } else if (status === 409) {
                goToResult(id);
            } else {
                submittingRef.current = false;
                setSubmitting(false);
                toast.error(getErrorMessage(error, 'Failed to submit'));
            }
        }
    }, [progress, goToResult]);

    const handleSubmit = async () => {
        if (submittingRef.current) return;
        const unanswered = total - answeredCount;
        const confirmed = await showConfirm(unanswered > 0 ? `${unanswered} unanswered` : 'All answered', {
            title: 'Submit',
            confirmText: 'Submit',
            cancelText: 'Back',
        });
        if (confirmed) doSubmit();
    };

    if (phase === 'loading') {
        return (
            <div className="take-test-page" aria-busy="true" aria-label="Loading">
                <Skeleton height="28px" borderRadius="6px" />
                <Skeleton height="160px" borderRadius="8px" style={{ marginTop: '1rem' }} />
            </div>
        );
    }
    if (phase === 'blocked') return <Notice>{blockedMessage}</Notice>;
    if (phase === 'expired') return <Notice>Time expired</Notice>;
    if (!question) return <Notice>No questions</Notice>;

    const isFlagged = flagged.includes(question.number);
    const selected = answers[question.number] || null;
    const parsedDeadline = attempt.deadline ? new Date(attempt.deadline).getTime() : null;
    const deadlineMs = Number.isNaN(parsedDeadline) ? null : parsedDeadline;
    const promptId = `take-test-prompt-${question.number}`;

    return (
        <div className="take-test-page">
            <header className="take-test-top">
                <h1 className="take-test-title">{attempt.quiz?.title}</h1>
                <div className="take-test-status">
                    {saveState !== 'idle' && (
                        <span className={`take-test-save take-test-save-${saveState}`} role="status">
                            {SAVE_LABELS[saveState]}
                        </span>
                    )}
                    <Clock baseMs={baseMsRef.current} deadlineMs={deadlineMs} onExpire={doSubmit} />
                </div>
            </header>

            <div className="take-test-layout">
                <section className="take-test-card" aria-label={`Question ${index + 1} of ${total}`}>
                    <div className="take-test-meta">
                        <span className="take-test-count">{index + 1} of {total}</span>
                        {question.domain && <span className="take-test-domain">{question.domain}</span>}
                    </div>

                    <p id={promptId} className="take-test-prompt">{question.prompt}</p>

                    {question.diagram_html && (
                        <div className="take-test-diagram">
                            <DiagramFrame html={question.diagram_html} title={`Question ${question.number} diagram`} />
                        </div>
                    )}

                    <div className="take-test-options" role="radiogroup" aria-labelledby={promptId}>
                        {question.options.map((option) => (
                            <label
                                key={option.letter}
                                className={`take-test-option${selected === option.letter ? ' selected' : ''}`}
                            >
                                <input
                                    type="radio"
                                    name={`question-${question.number}`}
                                    value={option.letter}
                                    checked={selected === option.letter}
                                    onChange={() => selectOption(question.number, option.letter)}
                                    disabled={submitting}
                                />
                                <span className="take-test-letter" aria-hidden="true">{option.letter}</span>
                                <span className="take-test-option-text">{option.text}</span>
                            </label>
                        ))}
                    </div>

                    <div className="take-test-nav">
                        <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => setIndex((i) => Math.max(0, i - 1))}
                            disabled={index === 0}
                        >
                            Prev
                        </button>
                        <button
                            type="button"
                            className={`btn-secondary take-test-flag${isFlagged ? ' active' : ''}`}
                            aria-pressed={isFlagged}
                            onClick={() => toggleFlag(question.number)}
                        >
                            Flag
                        </button>
                        <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => setIndex((i) => Math.min(total - 1, i + 1))}
                            disabled={index === total - 1}
                        >
                            Next
                        </button>
                    </div>
                </section>

                <aside className="take-test-side">
                    <nav className="take-test-palette" aria-label="Questions">
                        {questions.map((q, i) => {
                            const isAnswered = Boolean(answers[q.number]);
                            const isMarked = flagged.includes(q.number);
                            const state = [isAnswered ? 'answered' : 'unanswered', isMarked ? 'flagged' : null]
                                .filter(Boolean)
                                .join(', ');
                            return (
                                <button
                                    key={q.number}
                                    type="button"
                                    className={[
                                        'take-test-dot',
                                        isAnswered ? 'answered' : '',
                                        isMarked ? 'flagged' : '',
                                        i === index ? 'current' : '',
                                    ].filter(Boolean).join(' ')}
                                    aria-label={`Question ${q.number}, ${state}`}
                                    aria-current={i === index ? 'step' : undefined}
                                    onClick={() => setIndex(i)}
                                >
                                    {q.number}
                                </button>
                            );
                        })}
                    </nav>
                    <div className="take-test-progress">{answeredCount}/{total}</div>
                    <button type="button" className="btn-primary take-test-submit" onClick={handleSubmit} disabled={submitting}>
                        Submit
                    </button>
                </aside>
            </div>
        </div>
    );
};

export default TakeTest;
