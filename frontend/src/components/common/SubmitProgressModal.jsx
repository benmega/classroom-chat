import React, { useState, useEffect, useRef } from 'react';
import client from '../../api/client';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/useAuthStore';
import UserSearchInput from './UserSearchInput';
import Modal from './Modal';
import confetti from 'canvas-confetti';
import { Users, X } from 'lucide-react';
import { getErrorMessage } from '../../utils/apiError';
import './SubmitProgressModal.css';

// Check if the URL is a certificate URL
const CERT_URL_PATTERN = /^https:\/\/(?:www\.)?(?:codecombat|ozaria)\.com\/certificates\/[\w\d]+\?.*course=[\w\d-]+.*$/;

const SubmitProgressModal = ({ isOpen, onClose }) => {
    const { checkAuth } = useAuthStore();
    const popoverRef = useRef(null);
    
    const [url, setUrl] = useState('');
    const [helpers, setHelpers] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showHelperModal, setShowHelperModal] = useState(false);
    const [pendingCourseRequest, setPendingCourseRequest] = useState(null);

    // Certificate support
    const [isCertificate, setIsCertificate] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    useEffect(() => {
        if (CERT_URL_PATTERN.test(url.trim())) {
            setIsCertificate(true);
        } else {
            setIsCertificate(false);
            setUploadProgress(0);
        }
    }, [url]);

    const resetForm = () => {
        setUrl('');
        setHelpers('');
    };

    // Handle Escape key and outside clicks
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') onClose();
        };
        const handleClickOutside = (e) => {
            if (popoverRef.current && !popoverRef.current.contains(e.target)) {
                // Check if they didn't click inside a toast or something similar before closing
                // The main thing is they clicked outside the popover
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);

    const handleCourseRequest = async () => {
        try {
            const response = await client.post('/api/course-requests/submit', pendingCourseRequest);
            if (response.data.success) {
                setPendingCourseRequest(null);
                resetForm();
                if (onClose) onClose();
            }
        } catch (error) {
            toast.error(getErrorMessage(error, 'Failed to submit request'));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        setIsSubmitting(true);
        try {
            if (isCertificate) {
                const formData = new FormData();
                formData.append('certificate_url', url);

                setUploadProgress(0);
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
                    resetForm();
                    setUploadProgress(0);
                    if (onClose) onClose();
                } else {
                    toast.error(response.data.error || 'Submission failed.');
                }
            } else {
                const response = await client.post('/challenge/submit', {
                    url,
                    helpers
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

                    resetForm();
                    checkAuth();
                    if (onClose) onClose();
                } else {
                    toast.error(response.data.message || 'Submission failed.');
                    setUrl('');
                }
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

    if (!isOpen) return null;

    return (
        <>
            <div 
                ref={popoverRef}
                className="submit-challenge-popover" 
                style={{ 
                    position: 'fixed', 
                    bottom: '10rem',
                    right: '2rem', 
                    zIndex: 1000,
                    width: '350px',
                    animation: 'slideUp 0.2s ease-out'
                }}
            >
                {/* Floating Helper Icon */}
                <button
                    type="button"
                    onClick={() => setShowHelperModal(!showHelperModal)}
                    style={{
                        position: 'absolute',
                        top: '-40px',
                        right: '0',
                        background: 'var(--surface-primary)',
                        border: '1px solid var(--border-subtle)',
                        boxShadow: 'var(--shadow-sm)',
                        borderRadius: '50%',
                        width: '32px',
                        height: '32px',
                        cursor: 'pointer',
                        color: helpers ? 'var(--primary-color)' : 'var(--text-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1002
                    }}
                    title={helpers ? `Helper: ${helpers}` : "Tag a helper"}
                >
                    <Users size={16} />
                </button>

                {showHelperModal && (
                    <div style={{
                        position: 'absolute',
                        bottom: 'calc(100% + 48px)',
                        right: '0',
                        background: 'var(--surface-primary)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-md)',
                        boxShadow: 'var(--shadow-lg)',
                        padding: '0.75rem',
                        width: '280px',
                        zIndex: 1001,
                        animation: 'slideUp 0.15s ease-out'
                    }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span>Who helped you?</span>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                {helpers && (
                                    <button type="button" onClick={() => { setHelpers(''); setShowHelperModal(false); }} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.75rem' }}>Clear</button>
                                )}
                                <button type="button" onClick={() => setShowHelperModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex' }}><X size={14}/></button>
                            </div>
                        </div>
                        <UserSearchInput 
                            id="helpers"
                            value={helpers}
                            onChange={setHelpers}
                            onSelect={(u) => { setHelpers(u.username); setShowHelperModal(false); }}
                            placeholder="Search users..." 
                            className="form-control"
                            showIcon={true}
                        />
                    </div>
                )}

                <div className="form-card" style={{ maxWidth: '100%', margin: '0', border: 'none', boxShadow: 'none', padding: '0' }}>
                    <form onSubmit={handleSubmit} className="challenge-form">
                        <div className="challenge-form-main">
                            <div className="form-group primary-input">
                                <div className="input-with-icon">
                                    <input 
                                        type="url" 
                                        id="url"
                                        value={url}
                                        onChange={(e) => setUrl(e.target.value)}
                                        placeholder="Paste link and press Enter..." 
                                        required 
                                        autoComplete="off"
                                        className="form-control main-url-input"
                                        style={{ fontSize: '1.1rem', padding: '1rem', borderRadius: 'var(--radius-md)' }}
                                    />
                                </div>
                            </div>

                            {/* Removed optional section */}

                            {isCertificate && isSubmitting && uploadProgress > 0 && (
                                <div className="progress-container mt-md">
                                    <div className="progress-bar-wrapper">
                                        <div 
                                            className="progress-bar-fill" 
                                            style={{ width: `${uploadProgress}%`, background: 'var(--primary-color)' }}
                                        ></div>
                                    </div>
                                    <span className="progress-text" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{uploadProgress}% Uploaded</span>
                                </div>
                            )}

                            {isSubmitting && (
                                <div style={{ textAlign: 'center', marginTop: '1rem', color: 'var(--text-secondary)' }}>
                                    <svg className="spinner" viewBox="0 0 50 50" style={{ width: '20px', height: '20px', verticalAlign: 'middle', marginRight: '8px' }}>
                                        <circle className="path" cx="25" cy="25" r="20" fill="none" strokeWidth="5"></circle>
                                    </svg>
                                    {isCertificate ? 'Uploading...' : 'Submitting...'}
                                </div>
                            )}

                            <button type="submit" style={{ display: 'none' }} disabled={isSubmitting}>Submit</button>
                        </div>
                    </form>
                </div>
                
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
        </>
    );
};

export default SubmitProgressModal;
