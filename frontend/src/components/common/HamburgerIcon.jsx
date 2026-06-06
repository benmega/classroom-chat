import React from 'react';
import './HamburgerIcon.css';

// Helper to interpolate between two hex colors
const interpolateColor = (color1, color2, factor) => {
    const f = Math.max(0, Math.min(1, factor));
    
    // Parse hex colors (assuming #RRGGBB format)
    const r1 = parseInt(color1.substring(1, 3), 16);
    const g1 = parseInt(color1.substring(3, 5), 16);
    const b1 = parseInt(color1.substring(5, 7), 16);

    const r2 = parseInt(color2.substring(1, 3), 16);
    const g2 = parseInt(color2.substring(3, 5), 16);
    const b2 = parseInt(color2.substring(5, 7), 16);

    const r = Math.round(r1 + f * (r2 - r1));
    const g = Math.round(g1 + f * (g2 - g1));
    const b = Math.round(b1 + f * (b2 - b1));

    // Convert back to hex
    const toHex = (c) => c.toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

const HamburgerIcon = ({ progress = 0, size = 24, className = "" }) => {
    // Ensure progress is within [0, 1]
    const p = Math.max(0, Math.min(1, progress));

    // Colors
    // Target color is --text-secondary (#334155)
    const targetColor = "#334155";
    
    const bunColor = interpolateColor("#D97706", targetColor, p);
    const pattyColor = interpolateColor("#78350F", targetColor, p);
    const lettuceColor = "#22C55E";
    const cheeseColor = "#FACC15";

    // Hamburger parts coordinates
    // Top Bun (morphs into line 1)
    const topBunY = 3 + 2 * p;
    const topBunH = 6 - 4 * p;
    const topBunRx = 3 - 2 * p;

    // Lettuce (shrinks & fades)
    const lettuceX = 2 + 1 * p;
    const lettuceY = 9 + 2 * p;
    const lettuceW = 20 - 2 * p;
    const lettuceH = 1.5 * (1 - p);
    const lettuceOpacity = 1 - p;

    // Cheese (fades)
    const cheeseOpacity = 1 - p;

    // Patty (morphs into line 2)
    const pattyX = 4 - 1 * p;
    const pattyY = 10.5 + 0.5 * p;
    const pattyW = 16 + 2 * p;
    const pattyH = 4.5 - 2.5 * p;
    const pattyRx = 1.5 - 0.5 * p;

    // Bottom Bun (morphs into line 3)
    const bottomBunY = 15 + 2 * p;
    const bottomBunH = 5 - 3 * p;
    const bottomBunRx = 2.5 - 1.5 * p;

    // Sesame seeds opacity
    const sesameOpacity = 1 - p;

    return (
        <svg 
            width={size} 
            height={size} 
            viewBox="0 0 24 24" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            className={`hamburger-transition-svg ${className}`}
        >
            {/* Top Bun / Line 1 */}
            <rect 
                x="3" 
                y={topBunY} 
                width="18" 
                height={topBunH} 
                rx={topBunRx} 
                ry={topBunRx} 
                fill={bunColor} 
                className="hamburger-top-bun"
            />

            {/* Sesame Seeds on Top Bun (only visible when p < 1) */}
            {sesameOpacity > 0.05 && (
                <g opacity={sesameOpacity} className="hamburger-sesame-seeds">
                    <ellipse cx="7" cy="5.2" rx="0.5" ry="0.3" fill="#FFFBEB" transform="rotate(-15 7 5.2)" />
                    <ellipse cx="12" cy="4.5" rx="0.5" ry="0.3" fill="#FFFBEB" />
                    <ellipse cx="17" cy="5.2" rx="0.5" ry="0.3" fill="#FFFBEB" transform="rotate(15 17 5.2)" />
                </g>
            )}

            {/* Lettuce (only visible when p < 1) */}
            {lettuceOpacity > 0.05 && (
                <rect 
                    x={lettuceX} 
                    y={lettuceY} 
                    width={lettuceW} 
                    height={lettuceH} 
                    rx="0.75" 
                    fill={lettuceColor} 
                    opacity={lettuceOpacity}
                    className="hamburger-lettuce"
                />
            )}

            {/* Cheese (only visible when p < 1) */}
            {cheeseOpacity > 0.05 && (
                <polygon 
                    points="8,10.5 11,13 14,10.5" 
                    fill={cheeseColor} 
                    opacity={cheeseOpacity}
                    className="hamburger-cheese"
                />
            )}

            {/* Patty / Middle Line */}
            <rect 
                x={pattyX} 
                y={pattyY} 
                width={pattyW} 
                height={pattyH} 
                rx={pattyRx} 
                ry={pattyRx} 
                fill={pattyColor} 
                className="hamburger-patty"
            />

            {/* Bottom Bun / Bottom Line */}
            <rect 
                x="3" 
                y={bottomBunY} 
                width="18" 
                height={bottomBunH} 
                rx={bottomBunRx} 
                ry={bottomBunRx} 
                fill={bunColor} 
                className="hamburger-bottom-bun"
            />
        </svg>
    );
};

export default HamburgerIcon;
