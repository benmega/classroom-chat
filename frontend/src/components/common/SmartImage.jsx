import React, { useState, useEffect } from 'react';

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
  const [imgSrc, setImgSrc] = useState(src);
  const [hasError, setHasError] = useState(false);

  // Update internal src if prop changes
  useEffect(() => {
    setImgSrc(src);
    setHasError(false);
  }, [src]);

  const getFallback = () => {
    if (fallbackType === 'avatar') {
      return '/static/images/Default_pfp.png';
    }
    return '/static/images/Project_placeholder.png';
  };

  const handleError = () => {
    if (!hasError) {
      setImgSrc(getFallback());
      setHasError(true);
    }
  };

  // Immediate fallback if src is completely missing
  const finalSrc = !src ? getFallback() : imgSrc;

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
