import React, { useState } from 'react';
import { X } from 'lucide-react';
import client from '../../api/client';
import './AddChildModal.css';

const AddChildModal = ({ isOpen, onClose, onAdded }) => {
    const [code, setCode] = useState('');
    const [codeError, setCodeError] = useState(null);
    const [isSubmittingCode, setIsSubmittingCode] = useState(false);

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
            setCodeError(err.response?.data?.error || 'Failed to connect. Invalid code?');
        } finally {
            setIsSubmittingCode(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="add-child-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Connect Your Child</h2>
                    <button className="close-btn" onClick={onClose}><X size={20} /></button>
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
