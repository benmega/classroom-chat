import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import client from '../../api/client';
import toast from 'react-hot-toast';

const Signup = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const response = await client.post('/user/signup', { username, password });
            toast.success(response.data.data.message || 'Signup successful! Please log in.');
            navigate('/login');
        } catch (error) {
            toast.error(error.response?.data?.error || 'Signup failed. Username may already be taken.');
        } finally {
            setIsLoading(false);
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
            }}>Join Us</h1>
            
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
                    {isLoading ? 'Creating Account...' : 'Sign Up'}
                </button>
            </form>
            
            <p style={{ textAlign: 'center', marginTop: '25px', color: 'var(--text-secondary)' }}>
                Already have an account? <Link to="/login" style={{ color: 'var(--primary-color)', fontWeight: '600' }}>Log in</Link>
            </p>
        </div>
    );
};

export default Signup;
