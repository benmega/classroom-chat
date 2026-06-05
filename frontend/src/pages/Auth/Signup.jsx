import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { User, Lock, UserPlus, Zap, CheckCircle } from 'lucide-react';
import client from '../../api/client';
import toast from 'react-hot-toast';
import './Auth.css';

const Signup = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [searchParams] = useSearchParams();
    const role = searchParams.get('role');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const payload = { username, password };
            if (role === 'parent') payload.role = 'parent';
            const response = await client.post('/user/signup', payload);
            toast.success(response.data.data.message || 'Signup successful! Awaiting approval.');
            setIsSuccess(true);
        } catch (error) {
            toast.error(error.response?.data?.error || 'Signup failed. Username may already be taken.');
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
                    <h1 className="auth-title">Create Account</h1>
                    <p className="auth-subtitle">Join our elite classroom community</p>
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
                ) : (
                    <form onSubmit={handleSubmit} className="auth-form" id="signup-form">
                        <div className="form-group">
                            <div className="input-wrapper">
                                <input 
                                    type="text" 
                                    id="username"
                                    value={username} 
                                    onChange={(e) => setUsername(e.target.value)} 
                                    required
                                    placeholder="Username"
                                    autoComplete="username"
                                    className="auth-input"
                                />
                                <User className="input-icon" size={18} />
                            </div>
                        </div>
                        
                        <div className="form-group">
                            <div className="input-wrapper">
                                <input 
                                    type="password" 
                                    id="password"
                                    value={password} 
                                    onChange={(e) => setPassword(e.target.value)} 
                                    required
                                    placeholder="Password"
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
                                'Requesting Account...'
                            ) : (
                                <>
                                    Request Access <UserPlus size={20} />
                                </>
                            )}
                        </button>
                    </form>
                )}
                
                <div className="auth-footer">
                    Already have an account? 
                    <Link to="/login" className="auth-link">Log In</Link>
                </div>
            </div>
        </div>
    );
};

export default Signup;
