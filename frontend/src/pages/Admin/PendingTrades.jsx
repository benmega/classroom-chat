import React, { useState, useEffect } from 'react';
import { 
    ShoppingBag, 
    CheckCircle, 
    XCircle, 
    User, 
    Clock, 
    ArrowLeft,
    AlertCircle,
    Hash
} from 'lucide-react';
import client from '../../api/client';
import toast from 'react-hot-toast';
import './PendingTrades.css';
import AdminPageHeader from '../../components/admin/AdminPageHeader';

const PendingTrades = () => {
    const [trades, setTrades] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(null);

    const fetchTrades = async () => {
        setIsLoading(true);
        try {
            const response = await client.get('/api/admin/pending_trades');
            if (response.data.status === 'success') {
                setTrades(response.data.data.trades);
            }
        } catch {
            toast.error('Failed to load pending trades.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchTrades();
    }, []);

    const handleTradeAction = async (tradeId, action) => {
        setIsProcessing(tradeId);
        const formData = new FormData();
        formData.append('trade_id', tradeId);
        formData.append('action', action);

        try {
            const response = await client.post('/api/admin/trade_action', formData);
            if (response.data.status === 'success') {
                toast.success(response.data.message);
                setTrades(prev => prev.filter(t => t.id !== tradeId));
            } else {
                toast.error(response.data.message || 'Action failed.');
            }
        } catch {
            toast.error('An error occurred while processing the trade.');
        } finally {
            setIsProcessing(null);
        }
    };

    const formatBits = (bits) => {
        if (!bits || !Array.isArray(bits)) return 'N/A';
        // Ensure 8 bits, pad with 0 at the end (since it's LSB first in the array)
        const paddedBits = [...bits];
        while (paddedBits.length < 8) {
            paddedBits.push(0);
        }
        // Reverse to show MSB on the left and join with spaces
        return paddedBits.reverse().join(' ');
    };

    if (isLoading) return <div className="admin-loading">Loading Trades...</div>;

    return (
        <div className="admin-pending-trades-page">
            <AdminPageHeader 
                title="Duck Trades" 
            />
 
            <div className="trades-list">
                {trades.length > 0 ? (
                    trades.map(trade => (
                        <div key={trade.id} className="trade-card card">
                            <div className="trade-header">
                                <div className="user-info">
                                    <div className="avatar-placeholder">
                                        <User size={24} />
                                    </div>
                                    <div>
                                        <h3>{trade.username}</h3>
                                        <span className="timestamp">
                                            <Clock size={14} /> 
                                            {new Date(trade.timestamp).toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                                <div className="trade-id">
                                    <Hash size={14} /> ID: {trade.id}
                                </div>
                            </div>
 
                            <div className="trade-details">
                                <div className="detail-item total">
                                    <span className="label">Digital Ducks</span>
                                    <span className="value">{trade.digital_ducks} 🦆</span>
                                </div>
                                <div className="detail-grid">
                                    <div className="detail-item">
                                        <span className="label">Bit Ducks</span>
                                        <span className="value font-mono">{formatBits(trade.bit_ducks)}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="label">Byte Ducks</span>
                                        <span className="value font-mono">{formatBits(trade.byte_ducks)}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="trade-actions">
                                <button 
                                    className="btn-reject"
                                    onClick={() => handleTradeAction(trade.id, 'reject')}
                                    disabled={isProcessing === trade.id}
                                >
                                    <XCircle size={18} /> Reject
                                </button>
                                <button 
                                    className="btn-approve"
                                    onClick={() => handleTradeAction(trade.id, 'approve')}
                                    disabled={isProcessing === trade.id}
                                >
                                    <CheckCircle size={18} /> {isProcessing === trade.id ? 'Processing...' : 'Approve Trade'}
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="empty-state card">
                        <ShoppingBag size={48} />
                        <h3>No Pending Trades</h3>
                        <p>When students trade digital ducks for physical ones, they'll appear here.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PendingTrades;
