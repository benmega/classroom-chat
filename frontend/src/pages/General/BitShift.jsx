import React, { useState } from 'react';
import { Coins, Package, ArrowRightLeft, CreditCard } from 'lucide-react';
import client from '../../api/client';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/useAuthStore';
import './BitShift.css';

const BitShift = () => {
    const { user, checkAuth } = useAuthStore();
    const [digitalDucks, setDigitalDucks] = useState(0);
    const [duckCounts, setDuckCounts] = useState(Array(7).fill(0));
    const [isByteMode, setIsByteMode] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleDuckCountChange = (index, value) => {
        const newCounts = [...duckCounts];
        newCounts[index] = Math.max(0, Math.min(10, parseInt(value) || 0));
        setDuckCounts(newCounts);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (digitalDucks < 1) {
            toast.error('Must trade at least 1 duck.');
            return;
        }

        setIsLoading(true);
        try {
            const payload = {
                digital_ducks: digitalDucks,
                bit_ducks: isByteMode ? [] : duckCounts,
                byte_ducks: isByteMode ? duckCounts : []
            };

            const response = await client.post('/duck_trade/submit_trade', payload, {
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            });

            if (response.data.status === 'success') {
                toast.success(response.data.message || 'Trade submitted for approval.');
                setDigitalDucks(0);
                setDuckCounts(Array(7).fill(0));
                checkAuth(); // Refresh user balance
            } else {
                toast.error(response.data.message || 'Trade failed.');
            }
        } catch (error) {
            console.error('Error submitting trade:', error);
            toast.error(error.response?.data?.message || 'An unexpected error occurred.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bit-shift-page">
            <section className="trade-form-section glass-panel animate-fade-in">
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div className="brand-logo animate-float">
                        <ArrowRightLeft size={40} color="white" />
                    </div>
                </div>
                <h2 className="form-heading">Duck Exchange</h2>
                <p className="form-subheading">
                    Convert your earned digital ducks into physical classroom assets. 
                    Power the classroom ecosystem with your contributions!
                </p>

                <form onSubmit={handleSubmit} className="trade-form">
                    <div className="form-group main-input">
                        <label htmlFor="digital_ducks">Digital Ducks to Trade</label>
                        <div style={{ position: 'relative' }}>
                            <input 
                                type="number" 
                                id="digital_ducks" 
                                value={digitalDucks}
                                onChange={(e) => setDigitalDucks(parseInt(e.target.value) || 0)}
                                className="digital-ducks-input" 
                                min="0" 
                                max={user?.duck_balance || 0}
                                required 
                            />
                        </div>
                        <div className="balance-info">
                            <Coins size={18} />
                            <span>Wallet Balance: {user?.duck_balance?.toLocaleString(undefined, { maximumFractionDigits: 3 }) || 0}</span>
                        </div>
                    </div>

                    <div className="ducks-grid">
                        {duckCounts.map((count, i) => (
                            <div key={i} className="small-input-group">
                                <label htmlFor={`duck_${i}`} className="duck-label">
                                    {(Math.pow(2, i)).toString(2)}b
                                </label>
                                <input 
                                    type="number" 
                                    id={`duck_${i}`}
                                    value={count}
                                    onChange={(e) => handleDuckCountChange(i, e.target.value)}
                                    className="input-sm" 
                                    min="0" 
                                    max="10" 
                                />
                            </div>
                        ))}
                    </div>

                    <div className="toggle-container">
                        <div className="toggle-switch">
                            <span className={`toggle-text bit-text ${!isByteMode ? 'active' : ''}`}>bit</span>
                            <div style={{ position: 'relative', display: 'inline-block' }}>
                                <input 
                                    type="checkbox" 
                                    id="duck-type-toggle" 
                                    checked={isByteMode}
                                    onChange={() => setIsByteMode(!isByteMode)}
                                    style={{ display: 'none' }}
                                />
                                <label htmlFor="duck-type-toggle" className="toggle-slider"></label>
                            </div>
                            <span className={`toggle-text byte-text ${isByteMode ? 'active' : ''}`}>Byte</span>
                        </div>
                    </div>

                    <button type="submit" className="submit-button btn-premium" disabled={isLoading}>
                        {isLoading ? (
                            'Processing Exchange...'
                        ) : (
                            <>
                                <CreditCard size={24} /> Submit Exchange Request
                            </>
                        )}
                    </button>
                </form>
            </section>
        </div>
    );
};

export default BitShift;
