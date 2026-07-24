import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import useAuthStore from '../../store/useAuthStore';
import client from '../../api/client';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import './ConnectChild.css'; // reuse same minimal card styling

const JoinClassroomLink = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const location = useLocation();
    const { user, isAuthenticated } = useAuthStore();
    const [status, setStatus] = useState('loading');
    const [message, setMessage] = useState('Joining classroom...');
    const [classroomName, setClassroomName] = useState('');

    const code = searchParams.get('code');

    useEffect(() => {
        if (!code) {
            setStatus('error');
            setMessage('No classroom code provided.');
            return;
        }

        if (!isAuthenticated) {
            // Save code and redirect to login
            localStorage.setItem('pendingClassroomCode', code);
            navigate('/login', { state: { from: location.pathname + location.search } });
            return;
        }

        if (user?.role === 'parent') {
            setStatus('error');
            setMessage('Parent accounts cannot join classrooms.');
            return;
        }

        const joinClassroom = async () => {
            try {
                const res = await client.post('/api/classroom/join', { code });
                const name = res.data?.data?.classroom?.name || res.data?.classroom?.name || '';
                setClassroomName(name);
                setStatus('success');
                setMessage(name ? `Successfully joined "${name}"!` : 'Successfully joined classroom!');
                localStorage.removeItem('pendingClassroomCode');
                setTimeout(() => navigate('/submit-work'), 2500);
            } catch (err) {
                setStatus('error');
                setMessage(err.response?.data?.error || 'Failed to join. The code might be invalid.');
                localStorage.removeItem('pendingClassroomCode');
            }
        };

        joinClassroom();
    }, [code, isAuthenticated, user, navigate, location]);

    return (
        <div className="connect-child-page">
            <div className="connect-child-card">
                {status === 'loading' && (
                    <>
                        <Loader2 className="spinner" size={48} />
                        <h2>Joining Classroom...</h2>
                        <p>{message}</p>
                    </>
                )}
                {status === 'success' && (
                    <>
                        <CheckCircle className="icon-success" size={48} />
                        <h2>Joined!</h2>
                        <p>{message}</p>
                        <p className="redirect-text">Redirecting...</p>
                    </>
                )}
                {status === 'error' && (
                    <>
                        <XCircle className="icon-error" size={48} />
                        <h2>Could Not Join</h2>
                        <p>{message}</p>
                        <button className="btn-primary" onClick={() => navigate('/submit-work')}>
                            Go Back
                        </button>
                    </>
                )}
            </div>
        </div>
    );
};

export default JoinClassroomLink;
