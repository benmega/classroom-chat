import React, { useState } from 'react';
import { User, Code } from 'lucide-react';

const SmartImage = ({ 
  src, 
  alt = '', 
  fallbackType = 'avatar', 
  className = '', 
  style = {},
  ...props 
}) => {
  const [errorCount, setErrorCount] = useState(0); // 0: healthy, 1: primary failed, 2: fallback failed
  const [prevSrc, setPrevSrc] = useState(src);

  if (src !== prevSrc) {
    setPrevSrc(src);
    setErrorCount(0);
  }

  const getFallback = () => {
    if (fallbackType === 'avatar') {
      return '/static/images/Default_pfp.jpg';
    }
    return '/static/images/Project_placeholder.png';
  };

  const handleError = () => {
    setErrorCount(prev => prev + 1);
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
        <span style={{ fontSize: '0.75rem', marginTop: '8px', fontWeight: 500 }}>
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
      onError={handleError}
      {...props}
    />
  );
};


export default SmartImage;
