import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, ArrowRight } from 'lucide-react';
import client from '../../api/client';
import toast from 'react-hot-toast';
import './Auth.css';

const ForgotPassword = () => {
    const [selectedRole, setSelectedRole] = useState('student');
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (selectedRole === 'student') return;

        if (!email) {
            toast.error('Please enter your email address.');
            return;
        }

        setIsLoading(true);
        try {
            const res = await client.post('/api/auth/cognito/forgot-password', { email });
            if (res.data.success) {
                toast.success('Verification code sent to your email!');
                navigate(`/reset-password?email=${encodeURIComponent(email)}`);
            }
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to send verification code.');
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
                    <h1 className="auth-title">Forgot Password</h1>
                    <p className="auth-subtitle">Select your role to reset your password</p>
                </div>
                
                <form onSubmit={handleSubmit} className="auth-form" id="forgot-password-form">
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

                    {selectedRole === 'student' ? (
                        <div style={{ textAlign: 'center', padding: '2rem 1rem', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                            <p style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                                Please ask your teacher to reset your password.
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="form-group">
                                <div className="input-wrapper">
                                    <input 
                                        type="email" 
                                        id="email"
                                        value={email} 
                                        onChange={(e) => setEmail(e.target.value)} 
                                        required
                                        placeholder="Enter your Email Address"
                                        autoComplete="email"
                                        className="auth-input"
                                    />
                                    <Mail className="input-icon" size={18} />
                                </div>
                            </div>
                            
                            <button 
                                type="submit" 
                                className="auth-button"
                                id="forgot-password-submit-btn"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <>
                                        <div className="loading-spinner"></div>
                                        Sending...
                                    </>
                                ) : (
                                    <>
                                        Send Code <ArrowRight size={20} />
                                    </>
                                )}
                            </button>
                        </>
                    )}
                </form>
                
                <div className="auth-footer" style={{ marginTop: '1.5rem' }}>
                    <Link to="/login" className="auth-link" style={{ marginLeft: 0 }}>Back to Log In</Link>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
