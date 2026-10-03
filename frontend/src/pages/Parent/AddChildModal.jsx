import React, { useState, useRef, useId } from 'react';
import { X } from 'lucide-react';
import client from '../../api/client';
import { getErrorMessage } from '../../utils/apiError';
import useModalA11y from '../../hooks/useModalA11y';
import './AddChildModal.css';

const AddChildModal = ({ isOpen, onClose, onAdded }) => {
    const [code, setCode] = useState('');
    const [codeError, setCodeError] = useState(null);
    const [isSubmittingCode, setIsSubmittingCode] = useState(false);
    const dialogRef = useRef(null);
    const titleId = useId();

    useModalA11y({ isOpen, onClose, containerRef: dialogRef });

    if (!isOpen) return null;

    const handleCodeSubmit = async (e) => {
        e.preventDefault();
        setCodeError(null);
        setIsSubmittingCode(true);
        
        try {
            await client.post('/api/parents/connect/code', { code });
            onAdded();
            onClose();
            setCode('');
        } catch (err) {
            setCodeError(getErrorMessage(err, 'Failed to connect. Invalid code?'));
        } finally {
            setIsSubmittingCode(false);
        }
    };

    return (
        <div role="presentation" className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1} className="add-child-modal">
                <div className="modal-header">
                    <h2 id={titleId}>Connect Your Child</h2>
                    <button className="close-btn" onClick={onClose} aria-label="Close"><X size={20} /></button>
                </div>
                
                <div className="modal-body">
                    <div className="add-child-section animate-fade-in">
                        <p className="tab-desc modal-tab-desc">
                            If you received a physical card or connection code from the school, enter the 6-character code below to instantly link the student.
                        </p>
                        
                        <form onSubmit={handleCodeSubmit} className="add-child-form inline-form">
                            <div className="form-group inline-input">
                                <input 
                                    type="text" 
                                    placeholder="Enter connection code..." 
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                    maxLength={10}
                                />
                                <button type="submit" className="submit-btn" disabled={isSubmittingCode || !code.trim()}>
                                    {isSubmittingCode ? 'Connecting...' : 'Connect'}
                                </button>
                            </div>
                            {codeError && <div className="error-message">{codeError}</div>}
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AddChildModal;
