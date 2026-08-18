import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import './Modal.css';

const Modal = ({ isOpen, onClose, title, children, maxWidth }) => {
    const modalRef = useRef(null);

    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose();
            } else if (e.key === 'Tab') {
                if (!modalRef.current) return;
                
                const focusableElements = modalRef.current.querySelectorAll(
                    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
                );
                
                if (focusableElements.length === 0) return;

                const firstElement = focusableElements[0];
                const lastElement = focusableElements[focusableElements.length - 1];

                if (e.shiftKey) {
                    if (document.activeElement === firstElement) {
                        lastElement.focus();
                        e.preventDefault();
                    }
                } else {
                    if (document.activeElement === lastElement) {
                        firstElement.focus();
                        e.preventDefault();
                    }
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        
        // Focus first element on open
        if (modalRef.current) {
             const focusableElements = modalRef.current.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            if (focusableElements.length > 0) {
                // Focus first element, typically a close button or input
                focusableElements[0].focus();
            } else {
                modalRef.current.focus();
            }
        }
        
        // Prevent body scroll when modal is open
        const originalStyle = window.getComputedStyle(document.body).overflow;
        document.body.style.overflow = 'hidden';

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = originalStyle;
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return createPortal(
        <div className="admin-modal-overlay" onClick={onClose} role="presentation">
            {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/click-events-have-key-events */}
            <div
                className="admin-modal-content"
                onClick={e => e.stopPropagation()}
                ref={modalRef}
                tabIndex="-1"
                role="dialog"
                aria-modal="true"
                aria-labelledby="modal-title"
                style={maxWidth ? { maxWidth } : undefined}
            >
                {title ? (
                    <div className="modal-header">
                        <h3 id="modal-title">{title}</h3>
                        <button onClick={onClose} className="close-btn" aria-label="Close modal"><X size={20} /></button>
                    </div>
                ) : (
                    <button onClick={onClose} className="close-btn" aria-label="Close modal" style={{ position: 'absolute', top: '15px', right: '15px', zIndex: 10, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={20} /></button>
                )}
                <div className="modal-body">
                    {children}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default Modal;
