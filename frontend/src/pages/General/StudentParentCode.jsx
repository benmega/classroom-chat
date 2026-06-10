import React, { useState, useEffect } from 'react';
import { Copy, RefreshCw, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import client from '../../api/client';
import './StudentParentCode.css';

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

    if (isLoading) return <div className="student-code-loading">Loading...</div>;

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

                <button className="refresh-btn" onClick={fetchCode}>
                    <RefreshCw size={16} />
                    Refresh Code
                </button>
            </div>
        </div>
    );
};

export default StudentParentCode;
