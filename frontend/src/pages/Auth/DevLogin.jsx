/**
 * Dev-only shortcut login for browser agents: /dev-login?role=admin (default) or ?role=student
 * auto-submits, refreshes auth, then redirects to /. The route exists only when import.meta.env.DEV (App.jsx).
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Zap } from 'lucide-react';
import client from '../../api/client';
import { getErrorMessage } from '../../utils/apiError';
import useAuthStore from '../../store/useAuthStore';
import './DevLogin.css';
import useDocumentTitle from '../../hooks/useDocumentTitle';

const DevLogin = () => {
    useDocumentTitle('Dev login');
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { checkAuth } = useAuthStore();

    const [status, setStatus] = useState('Authenticating…');
    const [error, setError] = useState(null);

    useEffect(() => {
        const role = searchParams.get('role') || 'admin';

        const doLogin = async () => {
            try {
                const res = await client.post('/api/dev-login', { role });
                if (res.data?.success) {
                    setStatus(`Logged in as ${res.data.user?.username} (${role}). Redirecting…`);
                    await checkAuth();
                    const currentUser = useAuthStore.getState().user;
                    if (currentUser?.role === 'parent') {
                        navigate('/parent/dashboard');
                    } else if (currentUser?.role === 'student' && currentUser?.slug) {
                        navigate(`/course-progress/${currentUser.slug}`);
                    } else {
                        navigate('/chat');
                    }
                } else {
                    setError(getErrorMessage({ response: res }, 'Dev login returned an unexpected response.'));
                }
            } catch (err) {
                setError(getErrorMessage(err, 'Dev login request failed.'));
            }
        };

        doLogin();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className="devlogin-container">
            <div className="devlogin-card">
                <div className="devlogin-icon-box">
                    <Zap size={32} />
                </div>

                <h1 className="devlogin-title">
                    Dev Login
                </h1>

                {!error ? (
                    <>
                        <p className="devlogin-status">
                            {status}
                        </p>
                        <div className="devlogin-spinner" />
                    </>
                ) : (
                    <div className="devlogin-error-box">
                        <div className="devlogin-error-title">
                            <Zap size={16} />
                            Authentication Failed
                        </div>
                        <p className="devlogin-error-text">
                            {error}
                        </p>
                    </div>
                )}
            </div>

            <p className="devlogin-footer">
                Development Environment Only
            </p>
        </div>
    );
};

export default DevLogin;
