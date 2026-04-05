import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useAuthStore from '../../store/useAuthStore';
import toast from 'react-hot-toast';

const Login = () => {
    const { login } = useAuthStore();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        const result = await login(username, password);
        setIsLoading(false);
        
        if (result.success) {
            toast.success('Login successful!');
            if (result.awarded_duck) {
                toast.success('Welcome! Daily duck awarded.', { icon: '🦆' });
            }
            navigate('/');
        } else {
            toast.error(result.error || 'Invalid username or password.');
        }
    };

    return (
        <div className="auth-container" style={{ 
            maxWidth: '450px', 
            margin: '80px auto', 
            padding: '40px', 
            background: 'white', 
            borderRadius: '16px', 
            boxShadow: 'var(--shadow-lg)',
            border: '1px solid var(--border-subtle)'
        }}>
            <h1 style={{ 
                textAlign: 'center', 
                marginBottom: '30px',
                fontSize: '2rem',
                fontWeight: '700',
                color: 'var(--text-primary)'
            }}>Welcome Back</h1>
            
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="form-group">
                    <label style={{ 
                        display: 'block', 
                        marginBottom: '8px', 
                        fontWeight: '500',
                        color: 'var(--text-secondary)'
                    }}>Username</label>
                    <input 
                        type="text" 
                        value={username} 
                        onChange={(e) => setUsername(e.target.value)} 
                        required
                        placeholder="Enter your username"
                        style={{ 
                            width: '100%', 
                            padding: '12px 16px', 
                            borderRadius: '10px', 
                            border: '1px solid var(--border-subtle)',
                            fontSize: '1rem',
                            outline: 'none',
                            transition: 'border-color 0.2s'
                        }}
                        onFocus={(e) => e.target.style.borderColor = 'var(--primary-color)'}
                        onBlur={(e) => e.target.style.borderColor = 'var(--border-subtle)'}
                    />
                </div>
                
                <div className="form-group">
                    <label style={{ 
                        display: 'block', 
                        marginBottom: '8px', 
                        fontWeight: '500',
                        color: 'var(--text-secondary)'
                    }}>Password</label>
                    <input 
                        type="password" 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                        required
                        placeholder="••••••••"
                        style={{ 
                            width: '100%', 
                            padding: '12px 16px', 
                            borderRadius: '10px', 
                            border: '1px solid var(--border-subtle)',
                            fontSize: '1rem',
                            outline: 'none',
                            transition: 'border-color 0.2s'
                        }}
                        onFocus={(e) => e.target.style.borderColor = 'var(--primary-color)'}
                        onBlur={(e) => e.target.style.borderColor = 'var(--border-subtle)'}
                    />
                </div>
                
                <button 
                    type="submit" 
                    disabled={isLoading}
                    style={{ 
                        padding: '14px', 
                        background: 'var(--primary-color)', 
                        color: 'white', 
                        border: 'none', 
                        borderRadius: '10px', 
                        cursor: 'pointer',
                        fontSize: '1.1rem',
                        fontWeight: '600',
                        marginTop: '10px',
                        transition: 'all 0.2s ease',
                        opacity: isLoading ? 0.7 : 1
                    }}
                >
                    {isLoading ? 'Logging in...' : 'Login'}
                </button>
            </form>
            

        </div>
    );
};

export default Login;
