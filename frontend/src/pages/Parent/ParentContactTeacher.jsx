/**
 * ParentContactTeacher.jsx
 *
 * A premium floating modal that lets a parent message their child's teacher.
 *
 * Props:
 *   isOpen   {boolean}        – controls visibility
 *   onClose  {() => void}     – called to dismiss
 *   children {React.ReactNode} – displayed as modal subtitle (e.g. child's name)
 *
 * Usage:
 *   <ParentContactTeacher
 *     isOpen={showModal}
 *     onClose={() => setShowModal(false)}
 *   >
 *     Regarding: {child.nickname}
 *   </ParentContactTeacher>
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Send } from 'lucide-react';
import toast from 'react-hot-toast';
import client from '../../api/client';
import './ParentContactTeacher.css';

const MAX_BODY = 2000;

const ParentContactTeacher = ({ isOpen, onClose, children }) => {
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    const overlayRef = useRef(null);
    const firstInputRef = useRef(null);

    // Reset form whenever modal opens
    useEffect(() => {
        if (isOpen) {
            setSubject('');
            setBody('');
            setIsSending(false);
            setIsClosing(false);
            // Focus subject field after animation
            setTimeout(() => firstInputRef.current?.focus(), 120);
        }
    }, [isOpen]);

    // Close on Escape key
    useEffect(() => {
        if (!isOpen) return;
        const handleKey = (e) => {
            if (e.key === 'Escape') handleClose();
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

    /** Trigger exit animation then call onClose */
    const handleClose = useCallback(() => {
        if (isSending) return; // block close while in-flight
        setIsClosing(true);
        setTimeout(() => {
            setIsClosing(false);
            onClose();
        }, 210);
    }, [isSending, onClose]);

    /** Close when clicking the overlay backdrop */
    const handleOverlayClick = (e) => {
        if (e.target === overlayRef.current) handleClose();
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!body.trim()) {
            toast.error('Please enter a message before sending.');
            return;
        }

        setIsSending(true);
        try {
            await client.post('/api/parents/contact-teacher', {
                subject: subject.trim() || undefined,
                body: body.trim(),
            });
            toast.success('Message sent to the teacher! 🎉');
            // Auto-close after success
            setTimeout(() => handleClose(), 350);
        } catch (err) {
            const msg = err.response?.data?.error || 'Failed to send message. Please try again.';
            toast.error(msg);
        } finally {
            setIsSending(false);
        }
    };

    // Char counter state
    const remaining = MAX_BODY - body.length;
    const counterClass =
        remaining <= 0 ? 'ct-char-counter limit' :
        remaining <= 200 ? 'ct-char-counter warn' :
        'ct-char-counter';

    if (!isOpen && !isClosing) return null;

    return (
        <div
            ref={overlayRef}
            className={`contact-teacher-overlay${isClosing ? ' closing' : ''}`}
            onClick={handleOverlayClick}
            role="dialog"
            aria-modal="true"
            aria-labelledby="ct-modal-title"
        >
            <div className="contact-teacher-modal">
                {/* ── Header ── */}
                <div className="contact-teacher-header">
                    <div className="contact-teacher-header-text">
                        <h2 className="contact-teacher-title" id="ct-modal-title">
                            Message Your Teacher
                        </h2>
                        {children && (
                            <p className="contact-teacher-subtitle">{children}</p>
                        )}
                    </div>
                    <button
                        className="contact-teacher-close"
                        onClick={handleClose}
                        aria-label="Close"
                        disabled={isSending}
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* ── Body ── */}
                <form onSubmit={handleSubmit} noValidate>
                    <div className="contact-teacher-body">
                        {/* Subject */}
                        <div className="ct-field">
                            <label className="ct-label" htmlFor="ct-subject">
                                Subject
                                <span className="ct-optional">(optional)</span>
                            </label>
                            <input
                                id="ct-subject"
                                ref={firstInputRef}
                                type="text"
                                className="ct-input"
                                placeholder="e.g. Question about homework"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                maxLength={200}
                                disabled={isSending}
                            />
                        </div>

                        {/* Message body */}
                        <div className="ct-field">
                            <label className="ct-label" htmlFor="ct-body">
                                Message
                            </label>
                            <textarea
                                id="ct-body"
                                className="ct-textarea"
                                placeholder="Write your message here…"
                                value={body}
                                onChange={(e) => setBody(e.target.value.slice(0, MAX_BODY))}
                                required
                                disabled={isSending}
                            />
                            <span className={counterClass}>
                                {body.length} / {MAX_BODY}
                            </span>
                        </div>
                    </div>

                    {/* ── Footer ── */}
                    <div className="contact-teacher-footer">
                        <button
                            type="button"
                            className="ct-btn-cancel"
                            onClick={handleClose}
                            disabled={isSending}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="ct-btn-send"
                            disabled={isSending || !body.trim()}
                            aria-label="Send message"
                        >
                            {isSending ? (
                                <>
                                    <span className="ct-spinner" />
                                    Sending…
                                </>
                            ) : (
                                <>
                                    <Send size={15} />
                                    Send Message
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ParentContactTeacher;
