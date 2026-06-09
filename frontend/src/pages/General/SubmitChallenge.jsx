import React, { useState, useEffect, useRef } from 'react';
import client from '../../api/client';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/useAuthStore';
import UserSearchInput from '../../components/common/UserSearchInput';
import './SubmitChallenge.css';
import './SubmitCertificate.css';

// Check if the URL is a certificate URL
const CERT_URL_PATTERN = /^https:\/\/(?:www\.)?(?:codecombat|ozaria)\.com\/certificates\/[\w\d]+\?.*course=[\w\d-]+.*$/;

const SubmitChallenge = () => {
    const { user, checkAuth } = useAuthStore();
    const [url, setUrl] = useState('');
    const [helpers, setHelpers] = useState('');
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showOptional, setShowOptional] = useState(false);
    const bookmarkletRef = useRef(null);

    // Certificate support
    const [isCertificate, setIsCertificate] = useState(false);
    const [certificateFile, setCertificateFile] = useState(null);
    const [uploadProgress, setUploadProgress] = useState(0);

    const apiBase = import.meta.env.VITE_API_URL || '';
    const fullApiUrl = apiBase.startsWith('http') ? apiBase : (window.location.origin + apiBase);
    
    // Improved bookmarklet code
    const bookmarkletCode = `javascript:(function(){
        const url = window.location.href;
        if(!url.includes('codecombat.com/play') && !url.includes('ozaria.com/play') && !url.includes('codecombat.com/s/')) {
            alert('🚨 This bookmarklet only works when you are on a CodeCombat or Ozaria level!');
            return;
        }
        
        const p=new URLSearchParams();
        p.append('url', url);
        p.append('helpers', '');
        p.append('notes', '');
        
        fetch('${fullApiUrl}/challenge/submit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            },
            body: p,
            credentials: 'include'
        })
        .then(async r => {
            let data;
            try {
                data = await r.json();
            } catch (e) {
                data = { success: false, message: 'Server returned an invalid response (' + r.status + ').' };
            }

            if (r.status === 401) {
                alert('🔑 Please log in to the Classroom Chat app first!');
                return;
            }
            if (data.success) {
                alert('✅ Success! ' + (data.message || 'Challenge submitted successfully.'));
            } else {
                alert('❌ Submission Failed:\\n\\n' + (data.message || data.error || 'Unknown error occurred.'));
            }
        })
        .catch(e => {
            console.error('Submission Error:', e);
            alert('⚠️ Network Error:\\n\\nCould not reach the Classroom Chat server. Make sure you are logged in and the server is running!');
        });
    })();`.replace(/\n\s+/g, ' '); // Compact for bookmarklet use

    useEffect(() => {
        if (bookmarkletRef.current) {
            bookmarkletRef.current.setAttribute('href', bookmarkletCode);
        }
    }, [bookmarkletCode]);

    useEffect(() => {
        if (CERT_URL_PATTERN.test(url.trim())) {
            setIsCertificate(true);
        } else {
            setIsCertificate(false);
            setCertificateFile(null);
            setUploadProgress(0);
        }
    }, [url]);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.type === 'application/pdf') {
                setCertificateFile(file);
            } else {
                toast.error('Please select a valid PDF file.');
                e.target.value = null;
                setCertificateFile(null);
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        setIsSubmitting(true);
        try {
            if (isCertificate) {
                if (!certificateFile) {
                    toast.error("Please upload the certificate PDF file.");
                    setIsSubmitting(false);
                    return;
                }
                const formData = new FormData();
                formData.append('certificate_url', url);
                formData.append('certificate_file', certificateFile);

                setUploadProgress(0);
                const response = await client.post('/api/achievements/submit_certificate', formData, {
                    headers: { 'X-Requested-With': 'XMLHttpRequest' },
                    onUploadProgress: (progressEvent) => {
                        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                        setUploadProgress(percentCompleted);
                    }
                });

                if (response.data.success) {
                    toast.success('Certificate submitted successfully!');
                    setUrl('');
                    setCertificateFile(null);
                    setHelpers('');
                    setNotes('');
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
                    toast.success(response.data.message || 'Challenge submitted successfully!');
                    
                    setUrl('');
                    setHelpers('');
                    setNotes('');
                    checkAuth(); // Refresh user balance
                } else {
                    toast.error(response.data.message || 'Submission failed.');
                }
            }
        } catch (error) {
            console.error('Submission error:', error);
            toast.error(error.response?.data?.message || error.response?.data?.error || 'An error occurred during submission.');
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
                                    className="form-control main-url-input"
                                />
                            </div>
                        </div>

                        {isCertificate && (
                            <div className="form-group" style={{ animation: 'fadeIn 0.3s ease-out' }}>
                                <label htmlFor="certificate_file">Upload Certificate PDF</label>
                                <div className="submit-cert-file-input-wrapper" style={{ marginTop: '0.5rem' }}>
                                    <input 
                                        type="file" 
                                        id="certificate_file"
                                        onChange={handleFileChange}
                                        accept="application/pdf" 
                                        className="submit-cert-file-input"
                                        required={isCertificate}
                                    />
                                    <div className="file-dummy">
                                        {certificateFile ? certificateFile.name : 'Choose a PDF file...'}
                                    </div>
                                </div>
                            </div>
                        )}

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
                                
                                {user?.has_auto_claimer && (
                                    <div className="bookmarklet-container" style={{ marginTop: '1rem', padding: '1.5rem' }}>
                                        <div className="bookmarklet-header">
                                            <h3>Quick Submit</h3>
                                            <p style={{ marginBottom: '1rem' }}>Drag this button to your bookmarks bar for instant submission!</p>
                                        </div>
                                        <a 
                                            ref={bookmarkletRef}
                                            className="bookmarklet-btn"
                                            onClick={(e) => {
                                                alert('To install, please drag this link to your bookmarks bar.');
                                                e.preventDefault();
                                            }}
                                            style={{ fontSize: '0.9rem', padding: '10px 20px' }}
                                        >
                                            <span>➡️ Submit Challenge 🦆</span>
                                        </a>
                                    </div>
                                )}
                            </div>
                        </div>

                        {isCertificate && isSubmitting && uploadProgress > 0 && (
                            <div className="progress-container" style={{ marginTop: '1rem' }}>
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
        </div>
    );
};

export default SubmitChallenge;

