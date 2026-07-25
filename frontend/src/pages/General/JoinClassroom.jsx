import React, { useState } from 'react';
import { LogIn, CheckCircle, Loader2, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';
import client from '../../api/client';
import './JoinClassroom.css';

/**
 * JoinClassroom — inline component for the Submit Work page.
 *
 * Props:
 *   compact    {boolean} — if true, renders a subtle single-line prompt instead
 *                          of the full card (used when student already has a classroom)
 *   onJoined   {function} — called with the joined classroom object on success
 */
const JoinClassroom = ({ compact = false, onJoined }) => {
    const [code, setCode] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [expanded, setExpanded] = useState(!compact);
    const [success, setSuccess] = useState(null); // { name: '...' } after joining

    const handleSubmit = async (e) => {
        e.preventDefault();
        const trimmed = code.trim().toUpperCase();
        if (!trimmed || trimmed.length !== 5) {
            toast.error('Enter a 5-character classroom code.');
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await client.post('/api/classroom/join', { code: trimmed });
            const classroom = res.data?.data?.classroom || res.data?.classroom || {};
            setSuccess(classroom);
            setCode('');
            toast.success(`Joined ${classroom.name || 'classroom'}!`);
            if (onJoined) onJoined(classroom);
        } catch (err) {
            const msg = err.response?.data?.error || 'Invalid code. Please check and try again.';
            toast.error(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (success) {
        return (
            <div className="join-classroom-success">
                <CheckCircle size={16} className="join-success-icon" />
                <span>Joined <strong>{success.name || 'classroom'}</strong></span>
            </div>
        );
    }

    if (compact && !expanded) {
        return (
            <button
                className="join-classroom-compact-trigger"
                onClick={() => setExpanded(true)}
                type="button"
            >
                <LogIn size={14} />
                Join a classroom
                <ChevronRight size={14} className="trigger-chevron" />
            </button>
        );
    }

    return (
        <div className={`join-classroom-inline ${compact ? 'join-classroom-compact' : 'join-classroom-prominent'}`}>
            {!compact && (
                <div className="join-classroom-header">
                    <LogIn size={18} />
                    <h3>Join Your Classroom</h3>
                    <p>Enter the 5-character code your teacher gave you.</p>
                </div>
            )}
            {compact && (
                <span className="join-classroom-compact-label">
                    <LogIn size={13} /> Join a classroom
                </span>
            )}
            <form onSubmit={handleSubmit} className="join-classroom-form">
                <input
                    type="text"
                    className="join-code-input"
                    placeholder="Enter code e.g. AB3C9"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    maxLength={5}
                    autoComplete="off"
                    spellCheck={false}
                    disabled={isSubmitting}
                    aria-label="Classroom join code"
                />
                <button
                    type="submit"
                    className="join-code-btn"
                    disabled={isSubmitting || code.trim().length < 1}
                >
                    {isSubmitting ? <Loader2 size={14} className="spin" /> : 'Join'}
                </button>
                {compact && (
                    <button
                        type="button"
                        className="join-code-cancel"
                        onClick={() => { setExpanded(false); setCode(''); }}
                    >
                        Cancel
                    </button>
                )}
            </form>
        </div>
    );
};

export default JoinClassroom;
