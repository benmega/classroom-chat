import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import { getErrorMessage } from '../../utils/apiError';
import { createQuiz } from '../../api/quizzes';
import './AdminTests.css';

const MAX_OPTIONS = 8;
const MIN_OPTIONS = 2;
const letter = (index) => String.fromCharCode(65 + index);

let nextKey = 0;
// key: React identity only; answer: index into options
const blankQuestion = (domain = '') => ({
    key: ++nextKey,
    domain,
    prompt: '',
    options: ['', '', '', ''],
    answer: 0,
    explanation: '',
});

// The API shape: options lettered A, B, C... in order, the answer as its letter
const toPayload =({ title, description, questions }) => ({
    title,
    description,
    questions: questions.map((q) => ({
        domain: q.domain,
        prompt: q.prompt,
        options: Object.fromEntries(q.options.map((text, i) => [letter(i), text])),
        answer: letter(q.answer),
        explanation: q.explanation,
    })),
});

const QuestionEditor = ({ question, number, onChange, onRemove, canRemove }) => {
    const update = (patch) => onChange({ ...question, ...patch });

    const setOption = (index, text) =>
        update({ options: question.options.map((o, i) => (i === index ? text : o)) });

    const removeOption = (index) => {
        const options = question.options.filter((_, i) => i !== index);
        let { answer } = question;
        if (answer === index) answer = 0;
        else if (answer > index) answer -= 1;
        update({ options, answer });
    };

    const label = `Q${number}`;
    return (
        <fieldset className="admin-tests-card admin-test-question">
            <legend className="admin-tests-sr">{label}</legend>
            <div className="admin-test-question-head">
                <span className="admin-test-question-number">{label}</span>
                <input
                    type="text"
                    className="admin-test-field admin-test-topic"
                    aria-label={`${label} topic`}
                    placeholder="Topic"
                    maxLength={100}
                    value={question.domain}
                    onChange={(e) => update({ domain: e.target.value })}
                />
                <button
                    type="button"
                    className="admin-tests-icon-btn"
                    aria-label={`Remove ${label}`}
                    title="Remove"
                    disabled={!canRemove}
                    onClick={onRemove}
                >
                    <Trash2 size={16} aria-hidden="true" />
                </button>
            </div>
            <textarea
                className="admin-test-field"
                aria-label={`${label} prompt`}
                placeholder="Question"
                rows={3}
                maxLength={5000}
                value={question.prompt}
                onChange={(e) => update({ prompt: e.target.value })}
            />
            <div className="admin-test-options" role="radiogroup" aria-label={`${label} answer`}>
                {question.options.map((text, index) => (
                    <div key={index} className="admin-test-option">
                        <input
                            type="radio"
                            className="admin-tests-check"
                            name={`answer-${question.key}`}
                            aria-label={`${label} answer ${letter(index)}`}
                            checked={question.answer === index}
                            onChange={() => update({ answer: index })}
                        />
                        <span className="admin-test-option-letter">{letter(index)}</span>
                        <input
                            type="text"
                            className="admin-test-field"
                            aria-label={`${label} option ${letter(index)}`}
                            maxLength={500}
                            value={text}
                            onChange={(e) => setOption(index, e.target.value)}
                        />
                        <button
                            type="button"
                            className="admin-tests-icon-btn"
                            aria-label={`Remove ${label} option ${letter(index)}`}
                            title="Remove"
                            disabled={question.options.length <= MIN_OPTIONS}
                            onClick={() => removeOption(index)}
                        >
                            <X size={16} aria-hidden="true" />
                        </button>
                    </div>
                ))}
            </div>
            {question.options.length < MAX_OPTIONS && (
                <button
                    type="button"
                    className="admin-tests-btn admin-test-add-option"
                    onClick={() => update({ options: [...question.options, ''] })}
                >
                    <Plus size={16} aria-hidden="true" /> Option
                </button>
            )}
            <textarea
                className="admin-test-field"
                aria-label={`${label} explanation`}
                placeholder="Explanation"
                rows={2}
                maxLength={5000}
                value={question.explanation}
                onChange={(e) => update({ explanation: e.target.value })}
            />
        </fieldset>
    );
};

const AdminTestNew = () => {
    const navigate = useNavigate();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [questions, setQuestions] = useState(() => [blankQuestion()]);
    const [saving, setSaving] = useState(false);
    const savingRef = useRef(false);

    const updateQuestion = (key, next) =>
        setQuestions((prev) => prev.map((q) => (q.key === key ? next : q)));

    // A new question keeps the topic of the last one: questions usually come in runs
    const addQuestion = () =>
        setQuestions((prev) => [...prev, blankQuestion(prev[prev.length - 1]?.domain || '')]);

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (savingRef.current) return;
        savingRef.current = true;
        setSaving(true);
        try {
            await createQuiz(toPayload({ title, description, questions }));
            toast.success('Saved');
            navigate('/admin/tests');
        } catch (error) {
            toast.error(getErrorMessage(error, 'Failed to save'));
            savingRef.current = false;
            setSaving(false);
        }
    };

    return (
        <form className="admin-tests-page admin-test-new" onSubmit={handleSubmit}>
            <AdminPageHeader title="New test">
                <Link className="admin-tests-btn" to="/admin/tests">Cancel</Link>
                <button type="submit" className="btn-primary" disabled={saving}>Save</button>
            </AdminPageHeader>

            <div className="admin-tests-card admin-test-question">
                <input
                    type="text"
                    className="admin-test-field"
                    aria-label="Title"
                    placeholder="Title"
                    maxLength={150}
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                />
                <input
                    type="text"
                    className="admin-test-field"
                    aria-label="Description"
                    placeholder="Description"
                    maxLength={255}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                />
            </div>

            {questions.map((question, index) => (
                <QuestionEditor
                    key={question.key}
                    question={question}
                    number={index + 1}
                    canRemove={questions.length > 1}
                    onChange={(next) => updateQuestion(question.key, next)}
                    onRemove={() => setQuestions((prev) => prev.filter((q) => q.key !== question.key))}
                />
            ))}

            <div className="admin-tests-bar">
                <button type="button" className="admin-tests-btn" onClick={addQuestion}>
                    <Plus size={16} aria-hidden="true" /> Question
                </button>
            </div>
        </form>
    );
};

export default AdminTestNew;
