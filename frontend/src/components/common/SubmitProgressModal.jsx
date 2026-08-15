import React, { useState } from 'react';
import client from '../../api/client';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/useAuthStore';
import UserSearchInput from './UserSearchInput';
import Modal from './Modal';
import confetti from 'canvas-confetti';
import { getErrorMessage } from '../../utils/apiError';
import { UploadCloud, Paperclip, X } from 'lucide-react';
import './SubmitProgressModal.css';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_EXTENSIONS = ['png', 'jpg', 'jpeg', 'pdf'];
const ACCEPT_ATTR = ALLOWED_EXTENSIONS.map((ext) => `.${ext}`).join(',');

const formatFileSize = (bytes) => {
    if (bytes === null || bytes === undefined || isNaN(bytes)) return '';
    if (bytes < 1024) return `${bytes} B`;
    const units = ['KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = -1;
    do {
        size /= 1024;
        unitIndex++;
    } while (size >= 1024 && unitIndex < units.length - 1);
    return `${size.toFixed(1)} ${units[unitIndex]}`;
};

const SubmitProgressModal = ({ isOpen, onClose }) => {
    const { checkAuth } = useAuthStore();
    const [activeTab, setActiveTab] = useState('challenge'); // 'challenge' or 'certificate'

    // Challenge state
    const [url, setUrl] = useState('');
    const [helpers, setHelpers] = useState('');
    const [notes, setNotes] = useState('');
    const [showOptional, setShowOptional] = useState(false);
    const [pendingCourseRequest, setPendingCourseRequest] = useState(null);

    // Certificate state
    const [file, setFile] = useState(null);
    const [inputKey, setInputKey] = useState(0);
    const [isDragActive, setIsDragActive] = useState(false);
    const dragCounter = React.useRef(0);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const resetChallengeForm = () => {
        setUrl('');
        setHelpers('');
        setNotes('');
    };

    const resetCertForm = () => {
        setFile(null);
        setInputKey(k => k + 1);
        setUploadProgress(0);
    };

    const handleCourseRequest = async () => {
        try {
            const response = await client.post('/api/course-requests/submit', pendingCourseRequest);
            if (response.data.success) {
                setPendingCourseRequest(null);
                resetChallengeForm();
                if (onClose) onClose();
            }
        } catch (error) {
            toast.error(getErrorMessage(error, 'Failed to submit request'));
        }
    };

    const submitChallenge = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const response = await client.post('/challenge/submit', {
                url,
                helpers,
                notes
            }, {
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            });

            if (response.data.success) {
                if (response.data.reward_issued === false) {
                    toast(
                        "Challenge complete! But since you aren't assigned to this track, you didn't get a duck. Ask your teacher to change your track!",
                        { icon: '⚠️', duration: 6000 }
                    );
                } else {
                    const duckReward = response.data.duck_reward || 10;
                    const pCount = Math.min(50 + (duckReward * 10), 500);

                    confetti({
                        particleCount: pCount,
                        spread: Math.min(70 + (duckReward * 2), 160),
                        origin: { y: 0.6 },
                        zIndex: 9999
                    });
                }

                resetChallengeForm();
                checkAuth(); // Refresh user balance
                if (onClose) onClose();
            } else {
                toast.error(response.data.message || 'Submission failed.');
                setUrl('');
            }
        } catch (error) {
            console.error('Submission error:', error);
            const data = error.response?.data;
            if (data?.course_instance_not_found) {
                setPendingCourseRequest({
                    course_instance_id: data.course_instance_id,
                    requested_course_id: data.requested_course_id,
                    url: url
                });
            } else {
                toast.error(getErrorMessage(error, 'An error occurred during submission.'));
                setUrl('');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const submitCertificate = async (e) => {
        e.preventDefault();
        if (!file) {
            toast.error('Please choose a certificate file to upload.');
            return;
        }

        setIsSubmitting(true);
        setUploadProgress(0);
        try {
            const formData = new FormData();
            formData.append('file', file);

            const response = await client.post('/api/achievements/submit_certificate', formData, {
                headers: { 'X-Requested-With': 'XMLHttpRequest' },
                onUploadProgress: (progressEvent) => {
                    if (!progressEvent.total) return;
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setUploadProgress(percentCompleted);
                }
            });

            if (response.data.success) {
                confetti({
                    particleCount: 200,
                    spread: 100,
                    origin: { y: 0.6 },
                    zIndex: 9999
                });
                resetCertForm();
                if (onClose) onClose();
            } else {
                toast.error(response.data.error || 'Submission failed.');
            }
        } catch (error) {
            toast.error(getErrorMessage(error, 'Failed to upload certificate.'));
        } finally {
            setIsSubmitting(false);
        }
    };

    // File input handlers
    const validateFile = (selected) => {
        if (selected.size > MAX_FILE_SIZE) {
            toast.error('That file is too large. Max size is 10MB.');
            return false;
        }
        const parts = selected.name.split('.');
        const ext = parts.length > 1 ? parts.pop().toLowerCase() : '';
        if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
            toast.error(`Unsupported file type${ext ? ` ".${ext}"` : ''}. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`);
            return false;
        }
        return true;
    };

    const selectFile = (selected) => {
        if (!selected) {
            setFile(null);
            return;
        }
        if (!validateFile(selected)) {
            setFile(null);
            setInputKey((k) => k + 1);
            return;
        }
        setFile(selected);
    };

    const handleFileChange = (e) => {
        selectFile(e.target.files && e.target.files[0]);
    };

    const handleDragEnter = (e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current += 1;
        if (e.dataTransfer.types?.includes('Files')) {
            setIsDragActive(true);
        }
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current -= 1;
        if (dragCounter.current <= 0) {
            dragCounter.current = 0;
            setIsDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current = 0;
        setIsDragActive(false);

        const dropped = e.dataTransfer.files && e.dataTransfer.files[0];
        selectFile(dropped);
    };

    const clearFile = () => {
        setFile(null);
        setInputKey((k) => k + 1);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Submit Progress">
            <div className="submit-challenge-page" style={{ padding: '0' }}>
                <div className="form-card" style={{ maxWidth: '100%', margin: '0', border: 'none', boxShadow: 'none', padding: '0' }}>
                    <div className="tabs-container" style={{ display: 'flex', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
                        <button 
                            type="button"
                            className={`tab-btn ${activeTab === 'challenge' ? 'active' : ''}`} 
                            onClick={() => setActiveTab('challenge')}
                            style={{ flex: '1', padding: '0.75rem 1rem', background: 'none', border: 'none', borderBottom: activeTab === 'challenge' ? '2px solid var(--primary-color)' : '2px solid transparent', color: activeTab === 'challenge' ? 'var(--primary-color)' : 'var(--text-secondary)', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', fontSize: '1rem' }}
                        >
                            Challenge URL
                        </button>
                        <button 
                            type="button"
                            className={`tab-btn ${activeTab === 'certificate' ? 'active' : ''}`} 
                            onClick={() => setActiveTab('certificate')}
                            style={{ flex: '1', padding: '0.75rem 1rem', background: 'none', border: 'none', borderBottom: activeTab === 'certificate' ? '2px solid var(--primary-color)' : '2px solid transparent', color: activeTab === 'certificate' ? 'var(--primary-color)' : 'var(--text-secondary)', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', fontSize: '1rem' }}
                        >
                            Upload Certificate
                        </button>
                    </div>

                    {activeTab === 'challenge' && (
                        <form onSubmit={submitChallenge} className="challenge-form">
                            <div className="challenge-form-main">
                                <div className="form-group primary-input">
                                    <label htmlFor="url">URL</label>
                                    <div className="input-with-icon">
                                        <input 
                                            type="url" 
                                            id="url"
                                            value={url}
                                            onChange={(e) => setUrl(e.target.value)}
                                            placeholder="https://codecombat.com/play/level/..." 
                                            required 
                                            autoComplete="off"
                                            className="form-control main-url-input"
                                        />
                                    </div>
                                </div>

                                <div className={`optional-section ${showOptional ? 'is-expanded' : ''}`}>
                                    <button 
                                        type="button" 
                                        className="toggle-optional"
                                        onClick={() => setShowOptional(!showOptional)}
                                    >
                                        <span>{showOptional ? '−' : '+'} Extras</span>
                                    </button>
                                    
                                    <div className="optional-content">
                                        <div className="form-group">
                                            <label htmlFor="helpers">Who helped you?</label>
                                            <UserSearchInput 
                                                id="helpers"
                                                value={helpers}
                                                onChange={setHelpers}
                                                onSelect={(u) => setHelpers(u.username)}
                                                placeholder="Search for users who helped..." 
                                                className="form-control"
                                                showIcon={false}
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label htmlFor="notes">Notes</label>
                                            <textarea 
                                                id="notes" 
                                                value={notes}
                                                onChange={(e) => setNotes(e.target.value)}
                                                rows="2" 
                                                className="form-control"
                                                placeholder="What did you learn or struggle with?"
                                            ></textarea>
                                        </div>
                                    </div>
                                </div>

                                <button type="submit" className="submit-button" disabled={isSubmitting}>
                                    {isSubmitting ? (
                                        <span className="btn-loading">
                                            <svg className="spinner" viewBox="0 0 50 50">
                                                <circle className="path" cx="25" cy="25" r="20" fill="none" strokeWidth="5"></circle>
                                            </svg>
                                            Submitting...
                                        </span>
                                    ) : 'Submit Challenge'}
                                </button>
                            </div>
                        </form>
                    )}

                    {activeTab === 'certificate' && (
                        <form onSubmit={submitCertificate} className="challenge-form file-submission-form">
                            <div className="form-group">
                                <label htmlFor="cert-file">Certificate File</label>
                                <label
                                    htmlFor="cert-file"
                                    className={`file-drop-zone${isDragActive ? ' is-drag-active' : ''}`}
                                    onDragEnter={handleDragEnter}
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                >
                                    <UploadCloud size={28} />
                                    {file ? (
                                        <span className="file-chip">
                                            <Paperclip size={14} />
                                            <span className="file-chip-name">{file.name}</span>
                                            <span className="file-chip-size">{formatFileSize(file.size)}</span>
                                            <span
                                                role="button"
                                                tabIndex={0}
                                                className="file-chip-remove"
                                                aria-label="Remove selected file"
                                                onClick={(e) => { e.preventDefault(); e.stopPropagation(); clearFile(); }}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        clearFile();
                                                    }
                                                }}
                                            >
                                                <X size={14} />
                                            </span>
                                        </span>
                                    ) : (
                                        <span>Click to choose a file, or drag one here</span>
                                    )}
                                </label>
                                <input
                                    key={inputKey}
                                    type="file"
                                    id="cert-file"
                                    hidden
                                    accept={ACCEPT_ATTR}
                                    onChange={handleFileChange}
                                />
                                <span className="file-hint">Allowed: {ALLOWED_EXTENSIONS.join(', ')} &middot; Max 10MB</span>
                            </div>

                            {isSubmitting && uploadProgress > 0 && (
                                <div className="file-progress-container mt-md">
                                    <div className="file-progress-bar-wrapper">
                                        <div 
                                            className="file-progress-bar-fill" 
                                            style={{ width: `${uploadProgress}%`, background: 'var(--primary-color)' }}
                                        ></div>
                                    </div>
                                    <span className="file-progress-text" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{uploadProgress}% Uploaded</span>
                                </div>
                            )}

                            <button type="submit" className="submit-button" disabled={isSubmitting || !file}>
                                {isSubmitting ? (
                                    <span className="btn-loading">
                                        <svg className="spinner" viewBox="0 0 50 50">
                                            <circle className="path" cx="25" cy="25" r="20" fill="none" strokeWidth="5"></circle>
                                        </svg>
                                        Uploading...
                                    </span>
                                ) : 'Upload Certificate'}
                            </button>
                        </form>
                    )}
                </div>
                
                {pendingCourseRequest && (
                    <Modal 
                        isOpen={!!pendingCourseRequest} 
                        onClose={() => setPendingCourseRequest(null)}
                        title="Course Not Connected"
                    >
                        <p style={{marginBottom: '1rem'}}>
                            The challenge you submitted belongs to an unrecognized course connection. Would you like to request an admin to add it?
                        </p>
                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                            <button type="button" className="btn-secondary" onClick={() => setPendingCourseRequest(null)}>Cancel</button>
                            <button type="button" className="btn-premium" onClick={handleCourseRequest}>Request Course Addition</button>
                        </div>
                    </Modal>
                )}
            </div>
        </Modal>
    );
};

export default SubmitProgressModal;
