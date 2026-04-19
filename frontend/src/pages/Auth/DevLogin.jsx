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
                    navigate('/');
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
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100vh',
            background: '#0f172a',
            color: '#e2e8f0',
            fontFamily: 'system-ui, sans-serif',
            gap: '1rem',
        }}>
            <Zap size={48} color="#3b82f6" />
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600 }}>
                Dev Login
            </h2>

            {!error ? (
                <p style={{ opacity: 0.7, fontSize: '0.9rem' }}>{status}</p>
            ) : (
                <div style={{
                    background: '#7f1d1d',
                    border: '1px solid #dc2626',
                    borderRadius: '8px',
                    padding: '1rem 1.5rem',
                    maxWidth: '400px',
                    textAlign: 'center',
                }}>
                    <strong>Dev Login Failed</strong>
                    <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', opacity: 0.85 }}>
                        {error}
                    </p>
                    <p style={{ margin: '0.75rem 0 0', fontSize: '0.8rem', opacity: 0.6 }}>
                        Stop and report this failure. Do not attempt alternative credentials.
                    </p>
                </div>
            )}
        </div>
    );
};

export default DevLogin;
