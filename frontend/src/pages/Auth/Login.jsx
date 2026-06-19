import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { User, Lock, ArrowRight, Zap, Eye, EyeOff } from 'lucide-react';
import useAuthStore from '../../store/useAuthStore';
import toast from 'react-hot-toast';
import './Auth.css';

const Login = () => {
    const { login, loginParentCognito } = useAuthStore();
    const [usernameOrEmail, setUsernameOrEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            let result;
            if (usernameOrEmail.includes('@')) {
                result = await loginParentCognito(usernameOrEmail, password);
            } else {
                result = await login(usernameOrEmail, password);
            }

            if (result.success) {
                toast.success('Login successful!');
                if (result.awarded_duck) {
                    toast.success('Welcome! Daily duck awarded.', { icon: '🦆' });
                }
                
                const pendingCode = localStorage.getItem('pendingConnectionCode');
                const fromPath = location.state?.from || (pendingCode ? `/parent/connect?code=${pendingCode}` : null);

                if (fromPath) {
                    navigate(fromPath);
                } else if (result.role === 'parent') {
                    navigate('/parent/dashboard');
                } else {
                    navigate('/chat');
                }
            } else {
                toast.error(result.error || 'Invalid credentials.');
            }
        } catch {
            toast.error('An unexpected error occurred. Please try again.');
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
                    <h1 className="auth-title">Welcome Back</h1>
                    <p className="auth-subtitle">Continue your classroom journey</p>
                </div>
                
                <form onSubmit={handleSubmit} className="auth-form" id="login-form">
                    <div className="form-group">
                        <div className="input-wrapper">
                            <input 
                                type="text" 
                                id="usernameOrEmail"
                                value={usernameOrEmail} 
                                onChange={(e) => setUsernameOrEmail(e.target.value)} 
                                required
                                placeholder="Username or Email"
                                autoComplete="username"
                                className="auth-input"
                            />
                            <User className="input-icon" size={18} />
                        </div>
                    </div>
                    
                    <div className="form-group">
                        <div className="input-wrapper">
                            <input 
                                type={showPassword ? "text" : "password"} 
                                id="password"
                                value={password} 
                                onChange={(e) => setPassword(e.target.value)} 
                                required
                                placeholder="Password"
                                autoComplete="current-password"
                                className="auth-input has-password-toggle"
                            />
                            <Lock className="input-icon" size={18} />
                            <button 
                                type="button" 
                                className="toggle-password-btn"
                                onClick={() => setShowPassword(!showPassword)}
                                aria-label={showPassword ? "Hide password" : "Show password"}
                                tabIndex="-1"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>
                    
                    <button 
                        type="submit" 
                        className="auth-button"
                        id="login-submit-btn"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <div className="loading-spinner"></div>
                                Logging in...
                            </>
                        ) : (
                            <>
                                Login <ArrowRight size={20} />
                            </>
                        )}
                    </button>
                </form>
                
                <div className="auth-footer" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', gap: '1.25rem', justifyContent: 'center', alignItems: 'center', fontSize: '1.05rem' }}>
                        <Link to="/signup" className="auth-link" style={{ margin: 0 }}>New Student</Link>
                        <span style={{ color: 'var(--border-subtle)', userSelect: 'none' }}>|</span>
                        <Link to="/signup?role=parent" className="auth-link" style={{ margin: 0 }}>New Parent</Link>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <Link to="/forgot-password" className="auth-link" style={{ margin: 0, fontSize: '0.95rem' }}>Forgot Password?</Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
