import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import './DesktopNotice.css';

const DesktopNotice = () => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const isDismissed = localStorage.getItem('desktopNoticeDismissed');
        if (!isDismissed) {
            setIsVisible(true);
        }
    }, []);

    const handleDismiss = () => {
        setIsVisible(false);
        localStorage.setItem('desktopNoticeDismissed', 'true');
    };

    if (!isVisible) return null;

    return (
        <div className="mobile-desktop-notice">
            <span>For the best viewing experience, we recommend using a desktop device.</span>
            <button className="dismiss-notice-btn" onClick={handleDismiss} aria-label="Dismiss notice">
                <X size={16} />
            </button>
        </div>
    );
};

export default DesktopNotice;
