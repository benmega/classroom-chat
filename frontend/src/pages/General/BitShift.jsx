import React, { useState } from 'react';
import { Package, ArrowRightLeft, CreditCard } from 'lucide-react';
import DuckIcon from '../../components/Icons/DuckIcon';
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
    const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

    // Auto math check: sum of (count × 2^i) must equal the decimal input
    // In Byte mode, each unit is worth 8 times as much (1 Byte = 8 bits)
    const multiplier = isByteMode ? 8 : 1;
    const binaryTotal = duckCounts.reduce((sum, count, i) => sum + count * Math.pow(2, i) * multiplier, 0);
    const mathCheckPassed = digitalDucks > 0 && binaryTotal === digitalDucks;
    const mathCheckMismatch = digitalDucks > 0 && binaryTotal !== digitalDucks;

    const handleDuckCountChange = (index, value) => {
        setHasAttemptedSubmit(false);
        const newCounts = [...duckCounts];
        newCounts[index] = Math.max(0, Math.min(10, parseInt(value) || 0));
        setHasAttemptedSubmit(false);
        setDuckCounts(newCounts);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setHasAttemptedSubmit(true);

        if (digitalDucks < 1) {
            toast.error('Must trade at least 1 duck.');
            return;
        }

        if (!mathCheckPassed) {
            toast.error(`Binary total (${binaryTotal}) must equal the decimal amount (${digitalDucks}).`);
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
                setHasAttemptedSubmit(false);
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
                <h2 className="form-heading">Bit Shift</h2>

                <form onSubmit={handleSubmit} className="trade-form">
                    <div className="form-group main-input">
                        <div style={{ position: 'relative' }}>
                            <input
                                type="number"
                                id="digital_ducks"
                                value={digitalDucks}
                                onChange={(e) => {
                                    setDigitalDucks(parseInt(e.target.value) || 0);
                                    setHasAttemptedSubmit(false);
                                }}
                                className="digital-ducks-input"
                                min="0"
                                max={user?.duck_balance || 0}
                                required
                            />
                        </div>
                        <div className="balance-info">
                            <DuckIcon size={18} />
                            <span>Cache balance: {user?.duck_balance?.toLocaleString(undefined, { maximumFractionDigits: 3 }) || 0}</span>
                        </div>
                    </div>

                    <div className="ducks-grid">
                        {[6, 5, 4, 3, 2, 1, 0].map((i) => (
                            <div key={i} className="small-input-group">
                                <label htmlFor={`duck_${i}`} className="duck-label">
                                    {(Math.pow(2, i)).toString(2)}{isByteMode ? 'B' : 'b'}
                                </label>
                                <input
                                    type="number"
                                    id={`duck_${i}`}
                                    value={duckCounts[i]}
                                    onChange={(e) => handleDuckCountChange(i, e.target.value)}
                                    className="input-sm"
                                    min="0"
                                    max="10"
                                />
                            </div>
                        ))}
                    </div>

                    {/* Live math check indicator — only shown on incorrect attempt */}
                    {hasAttemptedSubmit && mathCheckMismatch && (
                        <div className="math-check-banner mismatch">
                            <span className="math-check-equation">
                                <strong className="binary-value">{binaryTotal.toString(2)}<sub>2</sub></strong>
                                {' '}≠{' '}
                                <span className="decimal-value">{digitalDucks}<sub>10</sub></span>
                            </span>
                            <span className="math-check-status">✗ Mismatch</span>
                        </div>
                    )}

                    <div className="toggle-container">
                        <div className="toggle-switch">
                            <span className={`toggle-text bit-text ${!isByteMode ? 'active' : ''}`}>bit</span>
                            <div style={{ position: 'relative', display: 'inline-block' }}>
                                <input
                                    type="checkbox"
                                    id="duck-type-toggle"
                                    checked={isByteMode}
                                    onChange={() => {
                                        setIsByteMode(!isByteMode);
                                        setHasAttemptedSubmit(false);
                                    }}
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
            
            <div className="binary-joke-container animate-fade-in" style={{ animationDelay: '0.4s' }}>
                <p className="binary-joke">
                    "There are 10 types of people in the world: those who understand binary, and those who don't."
                </p>
            </div>
        </div>
    );
};

export default BitShift;
