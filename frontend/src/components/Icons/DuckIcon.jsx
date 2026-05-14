import React from 'react';

/**
 * DuckIcon - A clean, professional SVG rubber duck icon.
 * Used as the branding icon for the "Ducks" currency across all pages.
 * Designed to be crisp at small sizes (20-32px).
 */
const DuckIcon = ({ size = 24, className = '', color = 'currentColor', style = {} }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`duck-icon ${className}`}
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        transition: 'transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.1))',
        ...style
      }}
    >
      {/* Defined Gradient for a premium look */}
      <defs>
        <radialGradient id="duckGradient" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(13 10) rotate(45) scale(15)">
          <stop stopColor="white" stopOpacity="0.3" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Body */}
      <path 
        d="M15.5 13.5C15.5 16.5 13.5 19.5 9.5 19.5C5.5 19.5 3.5 16.5 3.5 13.5C3.5 10.5 5.5 9 8.5 9C9.5 9 10.5 9.5 11.5 10.5C12.5 9.5 13.5 9 14.5 9C15.5 9 15.5 11.5 15.5 13.5Z" 
        fill={color} 
      />
      
      {/* Body Highlight */}
      <path 
        d="M15.5 13.5C15.5 16.5 13.5 19.5 9.5 19.5C5.5 19.5 3.5 16.5 3.5 13.5C3.5 10.5 5.5 9 8.5 9" 
        fill="url(#duckGradient)" 
      />

      {/* Head */}
      <circle cx="16.5" cy="8.5" r="4" fill={color} />
      
      {/* Head Highlight */}
      <circle cx="16.5" cy="8.5" r="4" fill="url(#duckGradient)" />

      {/* Beak */}
      <path 
        d="M20 8.5C21.5 8.5 22.5 9 22.5 10C22.5 11 21.5 11.5 20 11.5L19.5 10L20 8.5Z" 
        fill="#FF9900" 
      />

      {/* Eye */}
      <circle cx="17.5" cy="7.5" r="0.8" fill="#1A1A1A" />
      <circle cx="17.7" cy="7.3" r="0.3" fill="white" />

      {/* Wing detail */}
      <path 
        d="M6 13.5C7.5 12.5 10.5 12.5 12 13.5" 
        stroke="white" 
        strokeWidth="1.2" 
        strokeLinecap="round" 
        strokeOpacity="0.4"
      />

      {/* Base/Water overlap */}
      <path 
        d="M4 18.5C6 17.5 10 17.5 12 18.5" 
        stroke="black" 
        strokeWidth="0.5" 
        strokeOpacity="0.1" 
        strokeLinecap="round"
      />
    </svg>
  );
};

export default DuckIcon;
