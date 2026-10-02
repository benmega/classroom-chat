import React, { useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import useModalA11y from '../../hooks/useModalA11y';
import './Modal.css';

// bodyClassName lets a caller restyle the body, e.g. to drop its padding for a full-bleed console.
const Modal = ({ isOpen, onClose, title, ariaLabel, children, maxWidth, bodyClassName }) => {
    const modalRef = useRef(null);
    // Not a fixed id: two modals can be open at once (e.g. a helper dialog over a form).
    const titleId = useId();

    useModalA11y({ isOpen, onClose, containerRef: modalRef, lockScroll: true });

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
                aria-labelledby={title ? titleId : undefined}
                aria-label={title ? undefined : ariaLabel}
                style={maxWidth ? { maxWidth } : undefined}
            >
                {title ? (
                    <div className="modal-header">
                        <h3 id={titleId}>{title}</h3>
                        <button onClick={onClose} className="close-btn" aria-label="Close modal"><X size={20} /></button>
                    </div>
                ) : (
                    <button onClick={onClose} className="close-btn" aria-label="Close modal" style={{ position: 'absolute', top: '15px', right: '15px', zIndex: 10, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}><X size={20} /></button>
                )}
                <div className={bodyClassName ? `modal-body ${bodyClassName}` : 'modal-body'}>
                    {children}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default Modal;
