import React, { useState } from 'react';

/**
 * SmartImage component handles broken images by falling back to curated defaults.
 * 
 * @param {string} src - The image source URL
 * @param {string} alt - Alt text for the image
 * @param {string} fallbackType - 'avatar' or 'project' to determine which default to use
 * @param {string} className - Optional CSS classes
 * @param {object} style - Optional inline styles
 */
const SmartImage = ({ 
  src, 
  alt = '', 
  fallbackType = 'avatar', 
  className = '', 
  style = {},
  ...props 
}) => {
  const [hasError, setHasError] = useState(false);
  const [prevSrc, setPrevSrc] = useState(src);

  if (src !== prevSrc) {
    setPrevSrc(src);
    setHasError(false);
  }

  const getFallback = () => {
    if (fallbackType === 'avatar') {
      return '/static/images/Default_pfp.jpg';
    }
    return '/static/images/Project_placeholder.png';
  };

  const handleError = () => {
    if (!hasError) {
      setHasError(true);
    }
  };

  const finalSrc = !src || hasError ? getFallback() : src;

  return (
    <img 
      src={finalSrc} 
      alt={alt} 
      className={className} 
      style={{
        ...style,
        objectFit: 'cover' // Default to cover for nice look
      }}
      onError={handleError}
      {...props}
    />
  );
};

export default SmartImage;
