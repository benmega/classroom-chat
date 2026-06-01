import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Lock, ArrowRight, Zap } from 'lucide-react';
import useAuthStore from '../../store/useAuthStore';
import toast from 'react-hot-toast';
import './Auth.css';

const Login = () => {
    const { login } = useAuthStore();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const result = await login(username, password);
            if (result.success) {
                toast.success('Login successful!');
                if (result.awarded_duck) {
                    toast.success('Welcome! Daily duck awarded.', { icon: '🦆' });
                }
                navigate('/chat');
            } else {
                toast.error(result.error || 'Invalid username or password.');
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
                                autoComplete="current-password"
                                className="auth-input"
                            />
                            <Lock className="input-icon" size={18} />
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
                
                <div className="auth-footer">
                    Don't have an account? 
                    <Link to="/signup" className="auth-link">Create Account</Link>
                </div>
            </div>
        </div>
    );
};

export default Login;
