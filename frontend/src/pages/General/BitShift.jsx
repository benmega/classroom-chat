import React, { useState, useMemo } from 'react';
import { Package, ArrowRightLeft, CreditCard, Zap } from 'lucide-react';
import DuckIcon from '../../components/Icons/DuckIcon';
import client from '../../api/client';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/useAuthStore';
import './BitShift.css';

const BitShift = () => {
    const { user, checkAuth } = useAuthStore();
    const [digitalDucks, setDigitalDucks] = useState(0);
    const [duckCounts, setDuckCounts] = useState(Array(8).fill(0));
    const [isByteMode, setIsByteMode] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

    // Auto math check: sum of (count × 2^i) must equal the decimal input
    // In Byte mode, 1 Byte = 128 ducks (as per reviewer requirements)
    const multiplier = useMemo(() => isByteMode ? 128 : 1, [isByteMode]);
    const binaryTotal = useMemo(() => 
        duckCounts.reduce((sum, count, i) => sum + count * Math.pow(2, i) * multiplier, 0),
    [duckCounts, multiplier]);
    
    // Educational Design: The 'Bit Shift' interface is intentionally challenging.
    // By removing decimal hints (e.g., (128), (64)), we force students to 
    // "think in binary" and internalize the powers of 2 (2^0 through 2^7).
    // This promotes active recall and deeper understanding of binary-to-decimal conversion.

    const mathCheckPassed = useMemo(() => digitalDucks > 0 && binaryTotal === digitalDucks, [digitalDucks, binaryTotal]);
    const mathCheckMismatch = useMemo(() => digitalDucks > 0 && binaryTotal !== digitalDucks, [digitalDucks, binaryTotal]);

    const handleDuckToggle = (index) => {
        setHasAttemptedSubmit(false);
        setDuckCounts(prev => {
            const newCounts = [...prev];
            newCounts[index] = newCounts[index] === 0 ? 1 : 0;
            
            // INTENTIONAL FRICTION: We deliberately DO NOT auto-sync the digitalDucks 
            // value to the new binary total here. Students MUST calculate and enter 
            // the decimal equivalent manually to reinforce binary-to-decimal learning.
            // (Removed autofill feature)
            
            return newCounts;
        });
    };

    // Auto Bitshift perk: auto-fills binary toggles from the decimal input
    const autoCalculate = () => {
        if (digitalDucks < 1) {
            toast.error('Enter a duck amount first.');
            return;
        }
        const value = Math.floor(digitalDucks / multiplier);
        if (value > 255) {
            toast.error('Maximum value for 8 bits is 255.');
            return;
        }
        const newCounts = Array(8).fill(0);
        for (let i = 7; i >= 0; i--) {
            if (value & (1 << i)) {
                newCounts[i] = 1;
            }
        }
        setDuckCounts(newCounts);
        setHasAttemptedSubmit(false);
        toast.success('Binary auto-calculated!');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setHasAttemptedSubmit(true);

        if (digitalDucks < 1) {
            toast.error('Must trade at least 1 duck.');
            return;
        }

        if (!mathCheckPassed) {
            // Do not reveal the correct binaryTotal in the error message to maintain friction
            toast.error(`Binary total does not match the decimal amount entered (${digitalDucks}).`);
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
                setDuckCounts(Array(8).fill(0));
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
                <div className="toggle-wrapper">
                    <div className="toggle-switch compact">
                        <span className={`toggle-text bit-text ${!isByteMode ? 'active' : ''}`}>bit</span>
                        <div style={{ position: 'relative', display: 'inline-block' }}>
                            <input
                                type="checkbox"
                                id="duck-type-toggle"
                                checked={isByteMode}
                                onChange={() => {
                                    setIsByteMode(prev => !prev);
                                    // Reset state on mode toggle to avoid confusion with mismatched values
                                    setDuckCounts(Array(8).fill(0));
                                    setDigitalDucks(0);
                                    setHasAttemptedSubmit(false);
                                }}
                                style={{ display: 'none' }}
                            />
                            <label htmlFor="duck-type-toggle" className="toggle-slider"></label>
                        </div>
                        <span className={`toggle-text byte-text ${isByteMode ? 'active' : ''}`}>Byte</span>
                    </div>
                </div>

                <div className="header-container">
                    <div className="brand-logo-mini animate-float">
                        <ArrowRightLeft size={24} color="var(--primary-color)" />
                    </div>
                    <h2 className="form-heading">Bit Shift</h2>
                </div>

                <form onSubmit={handleSubmit} className="trade-form">
                    <div className="form-group main-input">
                        <div style={{ position: 'relative' }}>
                            <input
                                type="number"
                                id="digital_ducks"
                                value={digitalDucks}
                                onChange={(e) => {
                                    const val = parseInt(e.target.value) || 0;
                                    setDigitalDucks(val);
                                    setHasAttemptedSubmit(false);
                                }}
                                className="digital-ducks-input"
                                min="0"
                                max={user?.duck_balance || 0}
                                required
                            />
                        </div>
                        <div className="balance-info">
                            <DuckIcon size={16} />
                            <span>Cache: {(user?.duck_balance ?? 0).toLocaleString(undefined, { maximumFractionDigits: 3 })}</span>
                        </div>
                    </div>

                    <div className="ducks-grid">
                        {[7, 6, 5, 4, 3, 2, 1, 0].map((i) => (
                            <div key={i} className="small-input-group">
                                <label className="duck-label">
                                    {(Math.pow(2, i)).toString(2).padStart(i + 1, '0')}{isByteMode ? 'B' : 'b'}
                                    {/* Parenthetic hints removed to force students to calculate bit values manually */}
                                </label>
                                <button
                                    type="button"
                                    id={`duck_${i}`}
                                    onClick={() => handleDuckToggle(i)}
                                    className={`bit-toggle ${duckCounts[i] === 1 ? 'active' : ''}`}
                                    aria-pressed={duckCounts[i] === 1}
                                >
                                    {duckCounts[i]}
                                </button>
                            </div>
                        ))}
                    </div>

                    {user?.has_auto_bitshift && (
                        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '0.5rem' }}>
                            <button
                                type="button"
                                onClick={autoCalculate}
                                className="auto-bitshift-btn"
                                title="Auto-calculate the binary from your decimal input"
                            >
                                <Zap size={16} /> Auto Calculate
                            </button>
                        </div>
                    )}

                    {/* Live math check indicator — only shown on incorrect attempt */}
                    {(hasAttemptedSubmit && digitalDucks > 0) && (
                        <div className={`math-check-banner ${mathCheckMismatch ? 'mismatch' : 'match'}`}>
                            <span className="math-check-equation">
                                <strong className="binary-value">{(binaryTotal / multiplier).toString(2)}<sub>2</sub> {isByteMode ? 'B' : 'b'}</strong>
                                {' '}{mathCheckMismatch ? '≠' : '='}{' '}
                                <span className="decimal-value">{digitalDucks}<sub>10</sub> ducks</span>
                            </span>
                            <span className="math-check-status">{mathCheckMismatch ? '✗ Mismatch' : '✓ Match'}</span>
                        </div>
                    )}

                    <button type="submit" className="submit-button btn-premium" disabled={isLoading}>
                        {isLoading ? (
                            'Processing...'
                        ) : (
                            <>
                                <CreditCard size={20} /> Submit Exchange
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
