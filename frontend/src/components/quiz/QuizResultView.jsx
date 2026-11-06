import React, { useState } from 'react';
import { Check, Flag } from 'lucide-react';
import { safeDate } from '../../utils/formatters';
import DuckIcon from '../Icons/DuckIcon';
import DiagramFrame from './DiagramFrame';
import { formatDuration } from './formatDuration';
import './QuizResultView.css';

const FILTERS = [
    { key: 'all', label: 'All' },
    { key: 'incorrect', label: 'Incorrect' },
    { key: 'correct', label: 'Correct' },
];

const percentOf = (correct, total) => (total > 0 ? Math.round((correct / total) * 100) : 0);

const questionState = (question) => {
    if (question.is_correct) return 'correct';
    return question.selected ? 'wrong' : 'skipped';
};

const STATE_LABEL = { correct: 'Correct', wrong: 'Wrong', skipped: 'Skipped' };

const anchorId = (number) => `test-result-q${number}`;

// One tile per question: the letter chosen and, when wrong, the key. Jumps to the question.
function AnswerGrid({ review, onJump }) {
    return (
        <ol className="test-result-grid">
            {review.map((q) => {
                const state = questionState(q);
                const chosen = q.selected || '-';
                const label = `Q${q.number}: ${STATE_LABEL[state]}, ${q.selected ? `chose ${q.selected}` : 'none'}, key ${q.answer}${q.flagged ? ', flagged' : ''}`;
                return (
                    <li key={q.number}>
                        <button
                            type="button"
                            className={`test-result-tile test-result-tile--${state}`}
                            aria-label={label}
                            title={label}
                            onClick={() => onJump(q.number)}
                        >
                            <span className="test-result-tile-number">
                                {q.number}
                                {q.flagged && <Flag size={10} aria-hidden="true" />}
                            </span>
                            <span className="test-result-tile-letters">
                                {state === 'correct' ? chosen : `${chosen}→${q.answer}`}
                            </span>
                        </button>
                    </li>
                );
            })}
        </ol>
    );
}

function ReviewQuestion({ question, chosenLabel }) {
    const state = questionState(question);
    return (
        <li
            id={anchorId(question.number)}
            tabIndex={-1}
            className={`test-result-question test-result-question--${state}`}
            data-testid={`review-${question.number}`}
        >
            <div className="test-result-question-head">
                <span className="test-result-question-number">{question.number}</span>
                <span className="test-result-question-domain">{question.domain}</span>
                {question.flagged && (
                    <span className="test-result-question-flag">
                        <Flag size={12} aria-hidden="true" /> Flagged
                    </span>
                )}
                <span className="test-result-question-state">{STATE_LABEL[state]}</span>
            </div>
            <p className="test-result-prompt">{question.prompt}</p>
            {question.diagram_html && (
                <DiagramFrame html={question.diagram_html} title={`Question ${question.number} diagram`} />
            )}
            <ul className="test-result-options">
                {(question.options || []).map((option) => {
                    const isAnswer = option.letter === question.answer;
                    const isSelected = option.letter === question.selected;
                    const classes = ['test-result-option'];
                    if (isAnswer) classes.push('test-result-option--answer');
                    else if (isSelected) classes.push('test-result-option--wrong');
                    return (
                        <li key={option.letter} className={classes.join(' ')}>
                            <span className="test-result-option-letter">{option.letter}</span>
                            <span className="test-result-option-text">{option.text}</span>
                            <span className="test-result-option-marks">
                                {isSelected && <span className="test-result-mark">{chosenLabel}</span>}
                                {isAnswer && (
                                    <span className="test-result-mark test-result-mark--answer">
                                        <Check size={14} aria-hidden="true" /> Correct
                                    </span>
                                )}
                            </span>
                        </li>
                    );
                })}
            </ul>
            {question.explanation && <p className="test-result-explanation">{question.explanation}</p>}
        </li>
    );
}

/**
 * A test result: score, domain breakdown and (when the API sent it) the question review.
 * `attempt` is a Result, or an AttemptSummary while the attempt is in progress.
 * `showStudent` names the student in the header (parents and admins).
 */
const QuizResultView = ({ attempt, showStudent = false }) => {
    const [filter, setFilter] = useState('all');
    if (!attempt) return null;

    const student = attempt.student;
    const studentName = student ? student.nickname || student.username : '';
    const inProgress = attempt.status !== 'submitted';
    const submittedOn = safeDate(attempt.submitted_at, { dateStyle: 'medium' });
    const total = attempt.total ?? 0;
    const correct = attempt.correct ?? 0;
    const percent = attempt.score_percent ?? percentOf(correct, total);
    const domains = attempt.domains || [];
    const ducks = Number(attempt.ducks_awarded) || 0;
    const review = Array.isArray(attempt.review) ? attempt.review : null;
    const classrooms = Array.isArray(attempt.classrooms) ? attempt.classrooms : [];
    const limit = attempt.time_limit_minutes;

    const counts = review
        ? {
              all: review.length,
              incorrect: review.filter((q) => !q.is_correct).length,
              correct: review.filter((q) => q.is_correct).length,
          }
        : null;
    const jumpTo = (number) => {
        setFilter('all');
        // After the filter re-renders every question
        requestAnimationFrame(() => {
            const target = document.getElementById(anchorId(number));
            target?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
            target?.focus?.({ preventScroll: true });
        });
    };

    const shown = review
        ? review.filter((q) => filter === 'all' || (filter === 'correct' ? q.is_correct : !q.is_correct))
        : [];

    return (
        <article className="test-result">
            <header className="test-result-header">
                <h1 className="test-result-title">{attempt.quiz?.title}</h1>
                <dl className="test-result-meta">
                    {showStudent && studentName && (
                        <div>
                            <dt>Student</dt>
                            <dd>{studentName}</dd>
                        </div>
                    )}
                    {showStudent && classrooms.length > 0 && (
                        <div>
                            <dt>Class</dt>
                            <dd>{classrooms.join(', ')}</dd>
                        </div>
                    )}
                    {showStudent && attempt.attempt_number != null && (
                        <div>
                            <dt>Attempt</dt>
                            <dd>{attempt.attempt_number}/{attempt.attempt_count}</dd>
                        </div>
                    )}
                    {!inProgress && submittedOn && (
                        <div>
                            <dt>Date</dt>
                            <dd>{submittedOn}</dd>
                        </div>
                    )}
                    {!inProgress && (
                        <div>
                            <dt>Time</dt>
                            <dd>
                                {formatDuration(attempt.elapsed_seconds)}
                                {limit ? ` / ${limit} min` : ''}
                            </dd>
                        </div>
                    )}
                </dl>
            </header>

            {inProgress ? (
                <p className="test-result-progress">In progress</p>
            ) : (
                <>
                    <section className="test-result-score" aria-label="Score">
                        <p className="test-result-score-main">
                            <span className="test-result-score-value">{correct}/{total}</span>
                            <span className="test-result-score-percent">{percent}%</span>
                            {ducks > 0 && (
                                <span
                                    className="test-result-ducks"
                                    role="img"
                                    aria-label={`${ducks} ${ducks === 1 ? 'duck' : 'ducks'}`}
                                >
                                    <DuckIcon size={18} color="var(--primary-color)" />
                                    <span aria-hidden="true">+{ducks}</span>
                                </span>
                            )}
                        </p>
                        <dl className="test-result-counts">
                            <div>
                                <dt>Correct</dt>
                                <dd>{correct}</dd>
                            </div>
                            <div>
                                <dt>Wrong</dt>
                                <dd>{attempt.wrong ?? 0}</dd>
                            </div>
                            <div>
                                <dt>Skipped</dt>
                                <dd>{attempt.skipped ?? 0}</dd>
                            </div>
                        </dl>
                    </section>

                    {domains.length > 0 && (
                        <section className="test-result-section">
                            <h2>Domains</h2>
                            <table className="test-result-domains">
                                <thead>
                                    <tr>
                                        <th scope="col">Domain</th>
                                        <th scope="col">Score</th>
                                        <th scope="col">%</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {domains.map((d) => {
                                        const pct = percentOf(d.correct, d.total);
                                        return (
                                            <tr key={d.domain}>
                                                <th scope="row">{d.domain}</th>
                                                <td>{d.correct}/{d.total}</td>
                                                <td>{pct}%</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </section>
                    )}

                    {review && review.length > 0 && (
                        <section className="test-result-section" aria-label="Answers">
                            <h2>Answers</h2>
                            <AnswerGrid review={review} onJump={jumpTo} />
                        </section>
                    )}

                    {review && (
                        <section className="test-result-section">
                            <div className="test-result-review-head">
                                <h2>Review</h2>
                                <div className="test-result-filters" role="group" aria-label="Filter questions">
                                    {FILTERS.map(({ key, label }) => (
                                        <button
                                            key={key}
                                            type="button"
                                            className="test-result-filter"
                                            aria-pressed={filter === key}
                                            onClick={() => setFilter(key)}
                                        >
                                            {label} {counts[key]}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <ol className="test-result-questions">
                                {shown.map((q) => (
                                    <ReviewQuestion key={q.number} question={q} chosenLabel={showStudent ? 'Chosen' : 'Your answer'} />
                                ))}
                            </ol>
                        </section>
                    )}
                </>
            )}
        </article>
    );
};

export default QuizResultView;
