import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import useAuthStore from '../../store/useAuthStore';
import client from '../../api/client';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import './ConnectChild.css';

const ConnectChild = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { user, isAuthenticated } = useAuthStore();
    const [status, setStatus] = useState('loading'); // loading, success, error
    const [message, setMessage] = useState('Connecting to student...');
    
    const code = searchParams.get('code');

    useEffect(() => {
        if (!code) {
            setTimeout(() => {
                setStatus('error');
                setMessage('No connection code provided.');
            }, 0);
            return;
        }

        if (!isAuthenticated) {
            // Save code and redirect to signup
            localStorage.setItem('pendingConnectionCode', code);
            navigate('/signup?role=parent', { state: { from: location.pathname + location.search } });
            return;
        }

        if (user?.role !== 'parent') {
            setTimeout(() => {
                setStatus('error');
                setMessage('You must be logged in as a parent to use this connection code.');
            }, 0);
            return;
        }

        const connectChild = async () => {
            try {
                await client.post('/api/parents/connect/code', { code });
                setStatus('success');
                setMessage('Successfully linked student account!');
                localStorage.removeItem('pendingConnectionCode');
                setTimeout(() => {
                    navigate('/parent/dashboard');
                }, 3000);
            } catch (err) {
                setStatus('error');
                setMessage(err.response?.data?.error || 'Failed to connect. The code might be invalid or already used.');
                localStorage.removeItem('pendingConnectionCode');
            }
        };

        connectChild();
    }, [code, isAuthenticated, user, navigate, location]);

    return (
        <div className="connect-child-page">
            <div className="connect-child-card">
                {status === 'loading' && (
                    <>
                        <Loader2 className="spinner" size={48} />
                        <h2>Processing...</h2>
                        <p>{message}</p>
                    </>
                )}
                {status === 'success' && (
                    <>
                        <CheckCircle className="icon-success" size={48} />
                        <h2>Connected!</h2>
                        <p>{message}</p>
                        <p className="redirect-text">Redirecting to your dashboard...</p>
                    </>
                )}
                {status === 'error' && (
                    <>
                        <XCircle className="icon-error" size={48} />
                        <h2>Connection Failed</h2>
                        <p>{message}</p>
                        <button className="btn-primary" onClick={() => navigate('/parent/dashboard')}>
                            Go to Dashboard
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

export default ConnectChild;
