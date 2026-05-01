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
            backgroundImage: 'radial-gradient(at 0% 0%, rgba(59, 130, 246, 0.15) 0px, transparent 50%), radial-gradient(at 100% 100%, rgba(37, 99, 235, 0.1) 0px, transparent 50%)',
            color: '#f8fafc',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            padding: '1rem',
        }}>
            <div style={{
                width: '100%',
                maxWidth: '440px',
                background: 'rgba(30, 41, 59, 0.7)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '24px',
                padding: '3rem 2rem',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                textAlign: 'center',
            }}>
                <div style={{
                    width: '64px',
                    height: '64px',
                    background: 'rgba(59, 130, 246, 0.1)',
                    borderRadius: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 1.5rem',
                    color: '#3b82f6',
                }}>
                    <Zap size={32} />
                </div>

                <h1 style={{
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    marginBottom: '0.5rem',
                    letterSpacing: '-0.025em',
                }}>
                    Dev Login
                </h1>

                {!error ? (
                    <>
                        <p style={{
                            fontSize: '0.9375rem',
                            color: '#94a3b8',
                            marginBottom: '2rem',
                        }}>
                            {status}
                        </p>
                        <div style={{
                            width: '24px',
                            height: '24px',
                            border: '3px solid rgba(59, 130, 246, 0.1)',
                            borderTop: '3px solid #3b82f6',
                            borderRadius: '50%',
                            margin: '0 auto',
                            animation: 'spin 1s linear infinite',
                        }} />
                    </>
                ) : (
                    <div style={{
                        background: 'rgba(127, 29, 29, 0.2)',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        borderRadius: '16px',
                        padding: '1.5rem',
                        marginTop: '1.5rem',
                        textAlign: 'left',
                    }}>
                        <div style={{
                            color: '#ef4444',
                            fontWeight: 600,
                            fontSize: '0.875rem',
                            marginBottom: '0.25rem',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                        }}>
                            <Zap size={16} />
                            Authentication Failed
                        </div>
                        <p style={{
                            color: 'rgba(248, 250, 252, 0.8)',
                            fontSize: '0.8125rem',
                            lineHeight: 1.5,
                            margin: 0,
                        }}>
                            {error}
                        </p>
                    </div>
                )}
            </div>

            <p style={{
                marginTop: '2rem',
                fontSize: '0.75rem',
                color: 'rgba(148, 163, 184, 0.5)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
            }}>
                Development Environment Only
            </p>

            <style>{`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default DevLogin;
