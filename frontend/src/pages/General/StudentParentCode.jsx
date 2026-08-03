import React, { useState, useEffect } from 'react';
import { Copy, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import client from '../../api/client';
import './StudentParentCode.css';
import Skeleton from '../../components/common/Skeleton';

const StudentParentCode = () => {
    const [code, setCode] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchCode();
    }, []);

    const fetchCode = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await client.get('/api/user/parent-code');
            setCode(response.data.data?.connection_code || response.data.connection_code);
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load connection code');
        } finally {
            setIsLoading(false);
        }
    };

    const copyToClipboard = () => {
        if (!code) return;
        navigator.clipboard.writeText(code);
        toast.success('Connection code copied!');
    };

    if (isLoading) return (
        <div className="student-parent-code-section">
            <div className="code-card glass-panel" style={{ minHeight: '200px' }}>
                <Skeleton height="28px" width="200px" style={{ marginBottom: '0.75rem' }} />
                <Skeleton height="16px" width="300px" className="mb-2rem" />
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
                    <Skeleton height="56px" className="flex-1" borderRadius="8px" />
                    <Skeleton height="56px" width="56px" borderRadius="6px" />
                </div>
                <Skeleton height="40px" width="150px" borderRadius="6px" />
            </div>
        </div>
    );

    if (error) {
        return (
            <div className="student-code-error">
                <AlertCircle size={20} />
                <p>{error}</p>
            </div>
        );
    }

    return (
        <div className="student-parent-code-section">
            <div className="code-card glass-panel">
                <h3>Share with Your Parent</h3>
                <p className="code-description">Give this code to your parent so they can track your progress.</p>

                <div className="code-display">
                    <code className="code-value">{code}</code>
                    <button className="copy-btn" onClick={copyToClipboard} title="Copy code">
                        <Copy size={18} />
                    </button>
                </div>

                
            </div>
        </div>
    );
};

export default StudentParentCode;
