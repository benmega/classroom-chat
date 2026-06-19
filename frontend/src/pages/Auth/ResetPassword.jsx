import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Lock, ShieldCheck, ArrowRight, Eye, EyeOff } from 'lucide-react';
import client from '../../api/client';
import toast from 'react-hot-toast';
import './Auth.css';

const ResetPassword = () => {
    const [searchParams] = useSearchParams();
    const email = searchParams.get('email');
    
    const [code, setCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!email) {
            toast.error('Email is missing. Please restart the password reset process.');
            return;
        }

        if (newPassword !== confirmPassword) {
            toast.error("Passwords do not match.");
            return;
        }

        setIsLoading(true);
        try {
            const res = await client.post('/api/auth/cognito/confirm-forgot-password', { 
                email, 
                code, 
                new_password: newPassword 
            });
            
            if (res.data.success) {
                toast.success('Password reset successfully! Please log in.');
                navigate('/login');
            }
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to reset password.');
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
                    <h1 className="auth-title">Reset Password</h1>
                    <p className="auth-subtitle">
                        {email ? `Enter the code sent to ${email}` : 'Enter your verification code'}
                    </p>
                </div>
                
                <form onSubmit={handleSubmit} className="auth-form" id="reset-password-form">
                    <div className="form-group">
                        <div className="input-wrapper">
                            <input 
                                type="text" 
                                value={code} 
                                onChange={(e) => setCode(e.target.value)} 
                                required
                                placeholder="6-Digit Verification Code"
                                className="auth-input"
                            />
                            <ShieldCheck className="input-icon" size={18} />
                        </div>
                    </div>
                    
                    <div className="form-group">
                        <div className="input-wrapper">
                            <input 
                                type={showPassword ? "text" : "password"} 
                                value={newPassword} 
                                onChange={(e) => setNewPassword(e.target.value)} 
                                required
                                placeholder="New Password (min 8 chars)"
                                autoComplete="new-password"
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
                    
                    <div className="form-group">
                        <div className="input-wrapper">
                            <input 
                                type={showConfirmPassword ? "text" : "password"} 
                                value={confirmPassword} 
                                onChange={(e) => setConfirmPassword(e.target.value)} 
                                required
                                placeholder="Confirm New Password"
                                autoComplete="new-password"
                                className="auth-input has-password-toggle"
                            />
                            <Lock className="input-icon" size={18} />
                            <button 
                                type="button" 
                                className="toggle-password-btn"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                                tabIndex="-1"
                            >
                                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>
                    
                    <button 
                        type="submit" 
                        className="auth-button"
                        id="reset-password-submit-btn"
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <>
                                <div className="loading-spinner"></div>
                                Resetting...
                            </>
                        ) : (
                            <>
                                Reset Password <ArrowRight size={20} />
                            </>
                        )}
                    </button>
                </form>
                
                <div className="auth-footer" style={{ marginTop: '1.5rem' }}>
                    <Link to="/login" className="auth-link" style={{ marginLeft: 0 }}>Back to Log In</Link>
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;
