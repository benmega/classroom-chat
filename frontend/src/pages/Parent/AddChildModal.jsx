import React, { useState } from 'react';
import { X, Key, Search, UserPlus } from 'lucide-react';
import client from '../../api/client';
import './AddChildModal.css';

const AddChildModal = ({ isOpen, onClose, onAdded }) => {
    const [activeTab, setActiveTab] = useState('code'); // 'code' or 'search'
    
    // Code Form
    const [code, setCode] = useState('');
    const [codeError, setCodeError] = useState(null);
    const [isSubmittingCode, setIsSubmittingCode] = useState(false);

    // Search Form
    const [username, setUsername] = useState('');
    const [relationship, setRelationship] = useState('Parent');
    const [message, setMessage] = useState('');
    const [searchError, setSearchError] = useState(null);
    const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
    const [requestSuccess, setRequestSuccess] = useState(false);

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

    const handleSearchSubmit = async (e) => {
        e.preventDefault();
        setSearchError(null);
        setIsSubmittingRequest(true);
        
        try {
            await client.post('/api/parents/connect/request', { username, relationship, message });
            setRequestSuccess(true);
            setUsername('');
            setMessage('');
        } catch (err) {
            setSearchError(err.response?.data?.error || 'Failed to send request. Check username.');
        } finally {
            setIsSubmittingRequest(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="add-child-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Connect Your Child</h2>
                    <button className="close-btn" onClick={onClose}><X size={20} /></button>
                </div>
                
                <div className="modal-body unified-layout">
                    {/* OPTION 1: INSTANT CONNECT WITH CODE */}
                    <div className="add-child-section">
                        <h3><Key size={18} /> Connect with Code</h3>
                        <p className="tab-desc">If you received a physical card, enter the 6-character connection code to instantly link the student.</p>
                        
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

                    <div className="modal-divider">
                        <span>OR</span>
                    </div>

                    {/* OPTION 2: SEARCH AND REQUEST */}
                    <div className="add-child-section">
                        <h3><Search size={18} /> Search & Request</h3>
                        
                        {requestSuccess ? (
                            <div className="success-message">
                                <UserPlus size={40} />
                                <h3>Request Sent!</h3>
                                <p>The administrator will review your request. Once approved, the student will appear on your dashboard.</p>
                            </div>
                        ) : (
                            <form onSubmit={handleSearchSubmit} className="add-child-form">
                                <p className="tab-desc">Search for your child's username and submit a request to the administrator.</p>
                                
                                <div className="form-group">
                                    <label>Student's Username</label>
                                    <input 
                                        type="text" 
                                        value={username}
                                        onChange={(e) => setUsername(e.target.value)}
                                        required
                                    />
                                </div>
                                
                                <div className="form-row">
                                    <div className="form-group half-width">
                                        <label>Relationship</label>
                                        <select value={relationship} onChange={(e) => setRelationship(e.target.value)}>
                                            <option value="Parent">Parent</option>
                                            <option value="Guardian">Guardian</option>
                                            <option value="Tutor">Tutor</option>
                                            <option value="Other">Other</option>
                                        </select>
                                    </div>
                                    <div className="form-group half-width">
                                        <label>Message (Optional)</label>
                                        <input 
                                            type="text"
                                            value={message}
                                            onChange={(e) => setMessage(e.target.value)}
                                            placeholder="Any details..."
                                        />
                                    </div>
                                </div>
                                
                                {searchError && <div className="error-message">{searchError}</div>}
                                
                                <button type="submit" className="submit-btn" disabled={isSubmittingRequest || !username.trim()}>
                                    {isSubmittingRequest ? 'Sending Request...' : 'Send Request'}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AddChildModal;
