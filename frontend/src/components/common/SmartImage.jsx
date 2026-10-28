import React, { useState } from 'react';
import { User, Code } from 'lucide-react';

// Images load lazily and decode off the main thread by default, so a page of avatars or project
// covers does not fetch everything up front. Pass `eager` for an image that is on screen as soon
// as the page opens (a profile header avatar, a hero picture): lazy-loading those delays the first
// paint. A `loading` or `decoding` prop still wins over both defaults.
const SmartImage = ({ 
  src, 
  alt = '', 
  fallbackType = 'avatar', 
  className = '', 
  style = {},
  eager = false,
  ...props 
}) => {
  const [errorState, setErrorState] = useState({ src, count: 0 });

  const errorCount = errorState.src === src ? errorState.count : 0;

  const getFallback = () => {
    if (fallbackType === 'avatar') {
      return '/static/images/Default_pfp.jpg';
    }
    return '/static/images/Project_placeholder.png';
  };

  const handleError = () => {
    setErrorState(prev => ({
      src,
      count: prev.src === src ? prev.count + 1 : 1
    }));
  };

  if (errorCount >= 2) {
    // Both failed - render CSS placeholder
    return (
      <div 
        className={`css-placeholder smart-image-base ${className}`}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-tertiary, #f3f4f6)',
          color: 'var(--text-muted, #9ca3af)',
          borderRadius: 'inherit',
          minHeight: '100px',
          ...style
        }}
      >
        {fallbackType === 'avatar' ? <User size={24} /> : <Code size={32} />}
        <span className="smart-image-placeholder-text">
          {fallbackType === 'avatar' ? 'No Avatar' : 'No Preview'}
        </span>
      </div>
    );
  }

  const finalSrc = (errorCount === 1 || !src) ? getFallback() : src;

  return (
    <img 
      src={finalSrc} 
      alt={alt} 
      className={`smart-image-base ${className}`} 
      style={{
        objectFit: 'cover',
        ...style
      }}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      onError={handleError}
      {...props}
    />
  );
};


export default SmartImage;
