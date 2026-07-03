/**
 * File: DevLogin.jsx
 * Type: React component (development-only)
 * Summary: Agent/automated-testing shortcut login page.
 *
 * This page is ONLY rendered in development builds (import.meta.env.DEV).
 * In production the route is not registered on App.jsx, and Vite strips
 * the entire module from the production bundle via dead-code elimination.
 *
 * Usage (browser agent task):
 *   Navigate to http://localhost:5173/dev-login?role=admin   (default)
 *   Navigate to http://localhost:5173/dev-login?role=student
 *   The page auto-submits, refreshes auth state, then redirects to /.
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Zap } from 'lucide-react';
import client from '../../api/client';
import useAuthStore from '../../store/useAuthStore';
import './DevLogin.css';

const DevLogin = () => {
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
                    navigate('/chat');
                } else {
                    setError(res.data?.error || 'Dev login returned an unexpected response.');
                }
            } catch (err) {
                const msg =
                    err.response?.data?.error ||
                    err.message ||
                    'Dev login request failed.';
                setError(msg);
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
