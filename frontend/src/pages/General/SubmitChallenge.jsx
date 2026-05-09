import React, { useState, useEffect, useRef } from 'react';
import client from '../../api/client';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/useAuthStore';
import UserSearchInput from '../../components/common/UserSearchInput';
import './SubmitChallenge.css';

const SubmitChallenge = () => {
    const { checkAuth } = useAuthStore();
    const [url, setUrl] = useState('');
    const [helpers, setHelpers] = useState('');
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showOptional, setShowOptional] = useState(false);
    const bookmarkletRef = useRef(null);

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


    const handleSubmit = async (e) => {
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
                toast.success(response.data.message || 'Challenge submitted successfully!');
                
                setUrl('');
                setHelpers('');
                setNotes('');
                checkAuth(); // Refresh user balance
            } else {
                toast.error(response.data.message || 'Submission failed.');
            }
        } catch (error) {
            console.error('Submission error:', error);
            toast.error(error.response?.data?.message || 'An error occurred during submission.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="submit-challenge-page">
            <div className="form-card">
                <div className="form-header">
                    <h2 className="form-title">Submit a Challenge</h2>
                    <p className="form-description">Paste your level URL below to earn your bits!</p>
                </div>
                
                <form onSubmit={handleSubmit} className="challenge-form">
                    <div className="form-group primary-input">
                        <label htmlFor="url">Challenge URL</label>
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
                            <div className="input-accessory">
                                <span className="required-tag">Required</span>
                            </div>
                        </div>
                    </div>

                    <div className={`optional-section ${showOptional ? 'is-expanded' : ''}`}>
                        <button 
                            type="button" 
                            className="toggle-optional"
                            onClick={() => setShowOptional(!showOptional)}
                        >
                            <span>{showOptional ? '−' : '+'} Add Details (Helpers, Notes)</span>
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
                    
                    <div className="bookmarklet-container">
                        <div className="bookmarklet-header">
                          <h3>Quick Submit</h3>
                          <p>Drag this button to your bookmarks bar for instant submission!</p>
                        </div>
                        <a 
                            ref={bookmarkletRef}
                            className="bookmarklet-btn"
                            onClick={(e) => {
                                alert('To install, please drag this link to your bookmarks bar.');
                                e.preventDefault();
                            }}
                        >
                            <span>➡️ Submit Challenge 🦆</span>
                        </a>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SubmitChallenge;

