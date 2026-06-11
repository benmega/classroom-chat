import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { User, Lock, UserPlus, CheckCircle, Mail, ShieldCheck, ArrowRight } from 'lucide-react';
import client from '../../api/client';
import toast from 'react-hot-toast';
import './Auth.css';

const Signup = () => {
    const [searchParams] = useSearchParams();
    const defaultRole = searchParams.get('role') || 'student';
    
    const [selectedRole, setSelectedRole] = useState(defaultRole);
    const [mode, setMode] = useState('signup'); // 'signup' or 'verify'
    
    // Form state
    const [username, setUsername] = useState(''); // for student
    const [email, setEmail] = useState(''); // for parent
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [code, setCode] = useState(''); // for verify
    
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false); // for student success

    useEffect(() => {
        if (searchParams.get('role')) {
            setSelectedRole(searchParams.get('role'));
        }
    }, [searchParams]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            toast.error("Passwords do not match.");
            return;
        }
        setIsLoading(true);
        try {
            if (selectedRole === 'parent') {
                const res = await client.post('/api/auth/cognito/register', { email, password });
                if (res.data.success) {
                    toast.success('Verification code sent to your email!');
                    setMode('verify');
                }
            } else {
                // Student/Educator
                const payload = { username, password };
                if (selectedRole === 'educator') payload.role = 'educator';
                
                const response = await client.post('/user/signup', payload);
                toast.success(response.data.data.message || 'Signup successful! Awaiting approval.');
                setIsSuccess(true);
            }
        } catch (error) {
            if (selectedRole === 'parent' && error.response?.data?.error?.includes('already exists')) {
                try {
                    const loginRes = await client.post('/api/auth/cognito/login', { email, password });
                    if (loginRes.data.success) {
                        toast.success('Account found! Logging you in...');
                        window.location.href = '/parent/dashboard';
                        return;
                    }
                } catch {
                    toast.error('Account exists, but password was incorrect. Please log in.');
                    setTimeout(() => window.location.href = '/login', 1500);
                }
            } else if (selectedRole !== 'parent' && error.response?.status === 409 && error.response?.data?.error === 'Username already exists.') {
                try {
                    await client.post('/user/login', { username, password });
                    toast.success('Account found! Logging you in...');
                    window.location.href = '/';
                    return;
                } catch {
                    toast.error('Account exists, but password was incorrect. Please log in.');
                    setTimeout(() => window.location.href = '/login', 1500);
                }
            } else {
                toast.error(error.response?.data?.error || 'Signup failed.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerify = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const res = await client.post('/api/auth/cognito/verify', { email, code });
            if (res.data.success) {
                toast.success('Email verified! Logging you in...');
                const loginRes = await client.post('/api/auth/cognito/login', { email, password });
                if (loginRes.data.success) {
                    window.location.href = '/parent/dashboard';
                }
            }
        } catch (error) {
            toast.error(error.response?.data?.error || 'Verification failed.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-bg-decoration">
                <div className="auth-blob blob-1"></div>
                <div className="auth-blob blob-2"></div>
            </div>

            <div className="auth-container">
                <div className="auth-header">
                    <div className="brand-logo">
                        <img src="/images/logo.ico" alt="Classroom Chat Logo" />
                    </div>
                    <h1 className="auth-title">
                        {selectedRole === 'student' ? 'Welcome new student' : 'Welcome new parent'}
                    </h1>
                    {mode === 'verify' && (
                        <p className="auth-subtitle">
                            Check your email for the verification code
                        </p>
                    )}
                </div>
                
                {isSuccess ? (
                    <div className="auth-success-message">
                        <CheckCircle size={48} className="success-icon" />
                        <h2>Request Submitted!</h2>
                        <p>Your account is now awaiting administrator approval. You'll be able to log in once an admin has reviewed your registration.</p>
                        <Link to="/login" className="auth-button success">
                            Back to Login
                        </Link>
                    </div>
                ) : mode === 'verify' ? (
                    <form onSubmit={handleVerify} className="auth-form">
                        <div className="form-group">
                            <div className="input-wrapper">
                                <input 
                                    type="text" 
                                    value={code} 
                                    onChange={(e) => setCode(e.target.value)} 
                                    required
                                    placeholder="6-Digit Code"
                                    className="auth-input"
                                />
                                <ShieldCheck className="input-icon" size={18} />
                            </div>
                        </div>
                        <button type="submit" className="auth-button" disabled={isLoading}>
                            {isLoading ? (
                                <>
                                    <div className="loading-spinner"></div>
                                    Verifying...
                                </>
                            ) : (
                                <>Verify Code <ArrowRight size={20} /></>
                            )}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={handleSubmit} className="auth-form" id="signup-form">
                        <div className="role-selector" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                            <button 
                                type="button"
                                className={`role-btn ${selectedRole === 'student' ? 'active' : ''}`}
                                onClick={() => setSelectedRole('student')}
                                style={{ flex: 1, padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: selectedRole === 'student' ? 'var(--primary-color)' : 'transparent', color: selectedRole === 'student' ? 'white' : 'var(--text-primary)', cursor: 'pointer', transition: 'all 0.2s', fontWeight: selectedRole === 'student' ? 'bold' : 'normal' }}
                            >
                                Student
                            </button>
                            <button 
                                type="button"
                                className={`role-btn ${selectedRole === 'parent' ? 'active' : ''}`}
                                onClick={() => setSelectedRole('parent')}
                                style={{ flex: 1, padding: '0.75rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', background: selectedRole === 'parent' ? 'var(--primary-color)' : 'transparent', color: selectedRole === 'parent' ? 'white' : 'var(--text-primary)', cursor: 'pointer', transition: 'all 0.2s', fontWeight: selectedRole === 'parent' ? 'bold' : 'normal' }}
                            >
                                Parent
                            </button>
                        </div>

                        {selectedRole === 'parent' ? (
                            <div className="form-group">
                                <div className="input-wrapper">
                                    <input 
                                        type="email" 
                                        id="email"
                                        value={email} 
                                        onChange={(e) => setEmail(e.target.value)} 
                                        required
                                        placeholder="Email Address"
                                        autoComplete="email"
                                        className="auth-input"
                                    />
                                    <Mail className="input-icon" size={18} />
                                </div>
                            </div>
                        ) : (
                            <div className="form-group">
                                <div className="input-wrapper">
                                    <input 
                                        type="text" 
                                        id="username"
                                        value={username} 
                                        onChange={(e) => setUsername(e.target.value)} 
                                        required
                                        pattern="[a-zA-Z0-9_]{3,30}"
                                        title="Username must be 3-30 chars: letters, numbers, or underscores only."
                                        placeholder="Username"
                                        autoComplete="username"
                                        className="auth-input"
                                    />
                                    <User className="input-icon" size={18} />
                                </div>
                            </div>
                        )}
                        
                        <div className="form-group">
                            <div className="input-wrapper">
                                <input 
                                    type="password" 
                                    id="password"
                                    value={password} 
                                    onChange={(e) => setPassword(e.target.value)} 
                                    required
                                    placeholder={selectedRole === 'parent' ? "Password (min 8 chars)" : "Password"}
                                    autoComplete="new-password"
                                    className="auth-input"
                                />
                                <Lock className="input-icon" size={18} />
                            </div>
                        </div>
                        
                        <div className="form-group">
                            <div className="input-wrapper">
                                <input 
                                    type="password" 
                                    id="confirmPassword"
                                    value={confirmPassword} 
                                    onChange={(e) => setConfirmPassword(e.target.value)} 
                                    required
                                    placeholder="Confirm Password"
                                    autoComplete="new-password"
                                    className="auth-input"
                                />
                                <Lock className="input-icon" size={18} />
                            </div>
                        </div>
                        
                        <button 
                            type="submit" 
                            className="auth-button"
                            id="signup-submit-btn"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <div className="loading-spinner"></div>
                                    Requesting...
                                </>
                            ) : (
                                <>
                                    Request Access <UserPlus size={20} />
                                </>
                            )}
                        </button>
                    </form>
                )}
                
                <div className="auth-footer" style={{ marginTop: '1.5rem' }}>
                    Already have an account? 
                    <Link to="/login" className="auth-link" style={{ marginLeft: '0.5rem' }}>Log In</Link>
                </div>
            </div>
        </div>
    );
};

export default Signup;
