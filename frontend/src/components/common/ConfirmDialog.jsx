/* eslint-disable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/click-events-have-key-events */
import React, { useState, useEffect, useRef } from 'react';
import { confirmEvents } from '../../utils/confirm';
import useModalA11y from '../../hooks/useModalA11y';

const ConfirmDialog = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [config, setConfig] = useState(null);
    const resolveRef = useRef(null);
    const dialogRef = useRef(null);

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

    const handleConfirm = () => {
        setIsOpen(false);
        if (resolveRef.current) resolveRef.current(true);
    };

    const handleCancel = () => {
        setIsOpen(false);
        if (resolveRef.current) resolveRef.current(false);
    };

    const handleAlt = () => {
        setIsOpen(false);
        if (resolveRef.current) resolveRef.current('alt');
    };

    // Escape (only while this is the innermost dialog, so one stacked over a Modal leaves the Modal open),
    // a Tab trap, and focus back on the opener once answered.
    useModalA11y({ isOpen, onClose: handleCancel, containerRef: dialogRef });

    if (!isOpen || !config) return null;

    const isDestructive = config.options?.destructive;

    return (
        <div
            ref={dialogRef}
            tabIndex={-1}
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
                // Above the shared Modal overlay (10000): a confirmation can be raised from inside a Modal.
                zIndex: 10001,
                animation: 'fadeIn 0.2s ease',
                padding: '1rem'
            }}
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
                <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                    {/* A destructive confirmation starts on Cancel, any other on Confirm */}
                    <button
                        type="button"
                        className="btn-secondary"
                        onClick={handleCancel}
                        data-autofocus={isDestructive ? '' : undefined}
                        style={{ flex: 1 }}
                    >
                        {config.options?.cancelText || 'Cancel'}
                    </button>
                    {config.options?.altText && (
                        <button
                            type="button"
                            className="btn-secondary"
                            onClick={handleAlt}
                            style={{ flex: 1 }}
                        >
                            {config.options.altText}
                        </button>
                    )}
                    <button
                        type="button"
                        className={isDestructive ? 'btn-danger' : 'btn-primary'}
                        onClick={handleConfirm}
                        data-autofocus={isDestructive ? undefined : ''}
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
