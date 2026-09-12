/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */
import React, { useState, useEffect, useRef } from 'react';
import { confirmEvents } from '../../utils/confirm';

const ConfirmDialog = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [config, setConfig] = useState(null);
    const resolveRef = useRef(null);
    const confirmBtnRef = useRef(null);

    useEffect(() => {
        const handleShow = ({ message, options, resolve }) => {
            setConfig({ message, options });
            resolveRef.current = resolve;
            setIsOpen(true);
        };

        confirmEvents.on('show', handleShow);
        return () => {
            confirmEvents.off('show', handleShow);
        };
    }, []);

    useEffect(() => {
        if (isOpen && confirmBtnRef.current) {
            confirmBtnRef.current.focus();
        }
    }, [isOpen]);

    if (!isOpen || !config) return null;

    const handleConfirm = () => {
        setIsOpen(false);
        if (resolveRef.current) resolveRef.current(true);
    };

    const handleCancel = () => {
        setIsOpen(false);
        if (resolveRef.current) resolveRef.current(false);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            handleCancel();
        }
    };

    const isDestructive = config.options?.destructive;

    return (
        // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(15, 23, 42, 0.6)',
                backdropFilter: 'blur(4px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
                animation: 'fadeIn 0.2s ease',
                padding: '1rem'
            }}
            onKeyDown={handleKeyDown}
            onClick={(e) => { if (e.target === e.currentTarget) handleCancel(); }}
        >
            <div
                className="glass-panel"
                style={{
                    width: '100%',
                    maxWidth: '420px',
                    padding: '1.5rem',
                    background: 'var(--bg-primary, #ffffff)',
                    borderRadius: 'var(--radius-lg, 0.5rem)',
                    boxShadow: 'var(--shadow-xl)',
                    textAlign: 'center'
                }}
            >
                <h3 id="confirm-dialog-title" style={{ margin: '0 0 1rem', fontSize: '1.25rem', color: 'var(--text-primary)' }}>
                    {config.options?.title || 'Are you sure?'}
                </h3>
                <p style={{ margin: '0 0 1.5rem', color: 'var(--text-secondary)', fontSize: '0.95rem', lineHeight: 1.5 }}>
                    {config.message}
                </p>
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                    <button
                        type="button"
                        className="btn-secondary"
                        onClick={handleCancel}
                        style={{ flex: 1 }}
                    >
                        {config.options?.cancelText || 'Cancel'}
                    </button>
                    <button
                        ref={confirmBtnRef}
                        type="button"
                        className={isDestructive ? 'btn-danger' : 'btn-primary'}
                        onClick={handleConfirm}
                        style={{ flex: 1 }}
                    >
                        {config.options?.confirmText || 'Confirm'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmDialog;
