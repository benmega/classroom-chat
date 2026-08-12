import React, { useState, useEffect } from 'react';
import client from '../../api/client';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/useAuthStore';
import UserSearchInput from '../../components/common/UserSearchInput';
import Modal from '../../components/common/Modal';
import confetti from 'canvas-confetti';
import { getErrorMessage } from '../../utils/apiError';
import './SubmitChallenge.css';
import './SubmitCertificate.css';

// Check if the URL is a certificate URL
const CERT_URL_PATTERN = /^https:\/\/(?:www\.)?(?:codecombat|ozaria)\.com\/certificates\/[\w\d]+\?.*course=[\w\d-]+.*$/;

const SubmitChallenge = () => {
    const { checkAuth } = useAuthStore();
    const [url, setUrl] = useState('');
    const [helpers, setHelpers] = useState('');
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showOptional, setShowOptional] = useState(false);
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
        setNotes('');
    };

    const handleCourseRequest = async () => {
        try {
            const response = await client.post('/api/course-requests/submit', pendingCourseRequest);
            if (response.data.success) {
                setPendingCourseRequest(null);
                resetForm();
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
                        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                        setUploadProgress(percentCompleted);
                    }
                });

                if (response.data.success) {
                    // Certificates need admin review before the achievement/ducks are
                    // awarded, so no success toast here — the confetti is just an
                    // acknowledgement that the submission went through.
                    confetti({
                        particleCount: 200,
                        spread: 100,
                        origin: { y: 0.6 },
                        zIndex: 9999
                    });
                    resetForm();
                    setUploadProgress(0);
                } else {
                    toast.error(response.data.error || 'Submission failed.');
                }
            } else {
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
                        // No success toast — the confetti here and the duck quack
                        // sound (fired globally in useLayout when the balance
                        // refreshed by checkAuth() below increases) are the feedback.
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
                    checkAuth(); // Refresh user balance
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

    return (
        <div className="submit-challenge-page">
            <div className="form-card" style={{ maxWidth: '900px', margin: '0 auto' }}>
                <form onSubmit={handleSubmit} className="challenge-form">
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

                        <button type="submit" className="submit-button" disabled={isSubmitting}>
                            {isSubmitting ? (
                                <span className="btn-loading">
                                    <svg className="spinner" viewBox="0 0 50 50">
                                        <circle className="path" cx="25" cy="25" r="20" fill="none" strokeWidth="5"></circle>
                                    </svg>
                                    {isCertificate ? 'Uploading...' : 'Submitting...'}
                                </span>
                            ) : (isCertificate ? 'Submit Certificate' : 'Submit Challenge')}
                        </button>
                    </div>
                </form>
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
    );
};

export default SubmitChallenge;

