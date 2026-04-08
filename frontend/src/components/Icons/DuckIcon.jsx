import React from 'react';

/**
 * Cartoon rubber duck SVG icon.
 * Accepts `size` (number, default 24) and `style` props, matching lucide-react conventions.
 */
const DuckIcon = ({ size = 24, style = {}, className = '' }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        style={style}
        className={className}
        aria-label="Duck"
        role="img"
    >
        {/* Body */}
        <ellipse cx="32" cy="42" rx="22" ry="16" fill="#FFD93D" />
        {/* Body sheen */}
        <ellipse cx="24" cy="38" rx="7" ry="4" fill="#FFE97A" opacity="0.5" />

        {/* Head */}
        <circle cx="46" cy="26" r="13" fill="#FFD93D" />
        {/* Head sheen */}
        <circle cx="42" cy="21" r="4" fill="#FFE97A" opacity="0.5" />

        {/* Eye */}
        <circle cx="51" cy="23" r="3" fill="#1a1a2e" />
        <circle cx="52" cy="22" r="1" fill="white" />

        {/* Beak */}
        <path d="M57 27 Q64 26 62 30 Q58 32 55 30 Z" fill="#FF8C42" />

        {/* Wing */}
        <ellipse cx="26" cy="43" rx="10" ry="5" fill="#F7C12A" transform="rotate(-10 26 43)" />

        {/* Water ripple / base */}
        <ellipse cx="32" cy="56" rx="20" ry="4" fill="#4ECDC4" opacity="0.35" />
    </svg>
);

export default DuckIcon;
