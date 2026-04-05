import React, { useState } from 'react';
import client from '../../api/client';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/useAuthStore';
import './SubmitChallenge.css';

const SubmitChallenge = () => {
    const { checkAuth } = useAuthStore();
    const [url, setUrl] = useState('');
    const [helpers, setHelpers] = useState('');
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const playQuackSound = () => {
        return new Promise((resolve) => {
            const quack = new Audio('/static/sounds/quack.mp3');
            quack.onended = resolve;
            quack.onerror = (err) => {
                console.warn('Audio play error:', err);
                resolve();
            };
            quack.play().catch((err) => {
                console.warn('Autoplay prevented:', err);
                resolve();
            });
        });
    };

    const playQuacksSequentially = async (count) => {
        for (let i = 0; i < count; i++) {
            await playQuackSound();
        }
    };

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
                
                // Play quacks
                if (response.data.quack_count > 0) {
                    playQuacksSequentially(response.data.quack_count);
                }

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

    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    const fullApiUrl = apiBase.startsWith('http') ? apiBase : (window.location.origin + apiBase);
    
    // Improved bookmarklet code
    const bookmarkletCode = `javascript:(function(){
        const url = window.location.href;
        if(!url.includes('codecombat.com/play') && !url.includes('ozaria.com/play') && !url.includes('codecombat.com/s/')) {
            alert('🚨 This bookmarklet only works when you are on a CodeCombat or Ozaria level!');
            return;
        }
        
        console.log('Submitting challenge to ${fullApiUrl}...');
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
            const data = await r.json().catch(() => ({ success: false, message: 'Server returned a ' + r.status + ' error. Are you logged in?' }));
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
    })();`.replace(/\n\s+/g, ''); // Compact for bookmarklet use

    return (
        <div className="submit-challenge-page">
            <div className="form-card">
                <h2 className="form-title">Submit a Challenge</h2>
                <form onSubmit={handleSubmit} className="challenge-form">
                    <div className="form-group">
                        <label htmlFor="url">Challenge URL *</label>
                        <input 
                            type="url" 
                            id="url"
                            value={url}
                            onChange={(e) => setUrl(e.target.value)}
                            placeholder="https://codecombat.com/play/level/..." 
                            required 
                            className="form-control"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="helpers">Who helped you? (optional)</label>
                        <input 
                            type="text" 
                            id="helpers"
                            value={helpers}
                            onChange={(e) => setHelpers(e.target.value)}
                            placeholder="Username of the person who helped" 
                            className="form-control"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="notes">Notes (optional)</label>
                        <textarea 
                            id="notes" 
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows="3" 
                            className="form-control"
                            placeholder="What did you learn or struggle with?"
                        ></textarea>
                    </div>

                    <button type="submit" className="submit-button" disabled={isSubmitting}>
                        {isSubmitting ? 'Submitting...' : 'Submit Challenge'}
                    </button>
                    
                    <div className="bookmarklet-container">
                        <p className="bookmarklet-hint">Pro Tip: Drag this button to your bookmarks bar to submit challenges instantly from CodeCombat/Ozaria!</p>
                        <a 
                            href={bookmarkletCode}
                            className="bookmarklet-btn"
                            onClick={(e) => {
                                alert('To install, please drag this link to your bookmarks bar.');
                                e.preventDefault();
                            }}
                        >
                            ➡️ Submit Challenge 🦆
                        </a>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default SubmitChallenge;
