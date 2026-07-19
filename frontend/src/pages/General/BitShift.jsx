import React, { useState, useMemo } from 'react';
import { Package, ArrowRightLeft, CreditCard, Zap } from 'lucide-react';
import DuckIcon from '../../components/Icons/DuckIcon';
import client from '../../api/client';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/useAuthStore';
import confetti from 'canvas-confetti';
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
                confetti({
                    particleCount: 100,
                    spread: 70,
                    origin: { y: 0.6 },
                    zIndex: 9999
                });
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
                        <div className="pos-rel d-inline-block">
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
                                className="d-none"
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
                        <div className="input-combined-container">
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
                            <div className="balance-info-inline">
                                <span>Cache: {(user?.duck_balance ?? 0).toLocaleString(undefined, { maximumFractionDigits: 3 })}</span>
                            </div>
                        </div>
                    </div>

                    <div className="ducks-grid">
                        {[7, 6, 5, 4, 3, 2, 1, 0].map((i) => (
                            <div key={i} className="small-input-group">
                                <button
                                    type="button"
                                    id={`duck_${i}`}
                                    onClick={() => handleDuckToggle(i)}
                                    className={`bit-toggle ${duckCounts[i] === 1 ? 'active' : ''}`}
                                    aria-pressed={duckCounts[i] === 1}
                                >
                                    <svg viewBox="0 0 24 24" className="duck-toggle-svg" width="100%" height="100%">
                                        <defs>
                                            <radialGradient id={`duckGradient-${i}`} cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(13 10) rotate(45) scale(15)">
                                                <stop stopColor="white" stopOpacity="0.4" />
                                                <stop offset="1" stopColor="white" stopOpacity="0" />
                                            </radialGradient>
                                        </defs>

                                        {/* Body */}
                                        <path 
                                            className="duck-body"
                                            d="M15.5 13.5C15.5 16.5 13.5 19.5 9.5 19.5C5.5 19.5 3.5 16.5 3.5 13.5C3.5 10.5 5.5 9 8.5 9C9.5 9 10.5 9.5 11.5 10.5C12.5 9.5 13.5 9 14.5 9C15.5 9 15.5 11.5 15.5 13.5Z" 
                                        />
                                        
                                        {/* Body Highlight */}
                                        <path 
                                            d="M15.5 13.5C15.5 16.5 13.5 19.5 9.5 19.5C5.5 19.5 3.5 16.5 3.5 13.5C3.5 10.5 5.5 9 8.5 9" 
                                            fill={`url(#duckGradient-${i})`}
                                        />

                                        {/* Head */}
                                        <circle className="duck-head" cx="16.5" cy="8.5" r="4" />
                                        
                                        {/* Head Highlight */}
                                        <circle cx="16.5" cy="8.5" r="4" fill={`url(#duckGradient-${i})`} />

                                        {/* Beak */}
                                        <path 
                                            className="duck-beak"
                                            d="M20 8.5C21.5 8.5 22.5 9 22.5 10C22.5 11 21.5 11.5 20 11.5L19.5 10L20 8.5Z" 
                                        />

                                        {/* Eye */}
                                        <circle className="duck-eye" cx="17.5" cy="7.5" r="0.8" />
                                        <circle className="duck-eye-shine" cx="17.7" cy="7.3" r="0.3" fill="white" />

                                        {/* Text for 0/1 */}
                                        <text 
                                            x="9.5" 
                                            y="15.5" 
                                            className="duck-text"
                                        >
                                            {(Math.pow(2, i)).toString(2).padStart(i + 1, '0')}{isByteMode ? 'B' : 'b'}
                                        </text>
                                    </svg>
                                </button>
                            </div>
                        ))}
                    </div>

                    {user?.has_auto_bitshift && (
                        <div className="d-flex justify-center mt-sm">
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
