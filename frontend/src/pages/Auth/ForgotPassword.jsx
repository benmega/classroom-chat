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
                    <div className="auth-role-selector-container">
                        <button 
                            type="button"
                            className={`auth-role-btn ${selectedRole === 'student' ? 'active' : 'inactive'}`}
                            onClick={() => setSelectedRole('student')}
                        >
                            Student
                        </button>
                        <button 
                            type="button"
                            className={`auth-role-btn ${selectedRole === 'parent' ? 'active' : 'inactive'}`}
                            onClick={() => setSelectedRole('parent')}
                        >
                            Parent
                        </button>
                    </div>

                    {selectedRole === 'student' ? (
                        <div className="auth-info-box">
                            <p className="auth-info-text">
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
                    <Link to="/login" className="auth-link auth-link-no-margin">Back to Log In</Link>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
