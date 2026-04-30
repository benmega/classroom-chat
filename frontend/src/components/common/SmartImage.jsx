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
      return '/static/user/profile_pictures/Default_pfp.jpg';
    }
    return '/static/images/projects/Project_placeholder.png';
  };

  const handleError = () => {
    setErrorCount(prev => prev + 1);
  };

  if (errorCount >= 2 || !src) {
    // Both failed - render CSS placeholder
    return (
      <div 
        className={`css-placeholder ${className}`}
        style={{
          ...style,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-tertiary, #f3f4f6)',
          color: 'var(--text-muted, #9ca3af)',
          borderRadius: 'inherit',
          width: '100%',
          height: '100%',
          minHeight: '100px'
        }}
      >
        {fallbackType === 'avatar' ? <User size={24} /> : <Code size={32} />}
        <span style={{ fontSize: '0.75rem', marginTop: '8px', fontWeight: 500 }}>
          {fallbackType === 'avatar' ? 'No Avatar' : 'No Preview'}
        </span>
      </div>
    );
  }

  const finalSrc = errorCount === 1 ? getFallback() : src;

  return (
    <img 
      src={finalSrc} 
      alt={alt} 
      className={className} 
      style={{
        ...style,
        objectFit: 'cover'
      }}
      onError={handleError}
      {...props}
    />
  );
};


export default SmartImage;
